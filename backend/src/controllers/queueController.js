import QueueToken from '../models/QueueToken.js';
import Department from '../models/Department.js';
import Patient from '../models/Patient.js';
import { calculateEstimatedWaitTime } from '../utils/queueWaitTime.js';
import { logAudit } from '../utils/auditLog.js';

const MAX_JOIN_RETRY_ATTEMPTS = 5;

// Server-generated real-time notification: emitted only after the database
// has actually been mutated by an authorized request, never from raw
// client-supplied socket data (see server.js - the client-forged
// 'queue-update' socket event no longer feeds this room at all). Clients use
// this only as a signal to re-fetch GET /api/queue/status/:departmentId,
// which is the actual (already access-controlled) source of truth.
function broadcastQueueUpdate(req, departmentId) {
  const io = req.app.get('io');
  if (io) {
    io.to(`department-${departmentId}`).emit('queue-status-updated', { departmentId });
  }
}

export const joinQueue = async (req, res) => {
  try {
    const { departmentId } = req.body;
    const patientId = req.user._id;

    if (!departmentId) {
      return res.status(400).json({ error: 'Department ID required' });
    }

    // Belt-and-suspenders check for a friendlier error before we even try -
    // the QueueToken unique index (patientId+department, status != 'done')
    // is what actually guarantees this can't race; this is just to avoid a
    // generic 500 in the common (non-racing) case.
    const existingToken = await QueueToken.findOne({
      patientId,
      department: departmentId,
      status: { $in: ['waiting', 'in-progress'] },
    });

    if (existingToken) {
      return res.status(400).json({ error: 'Already in queue for this department' });
    }

    // tokenNumber is derived from "the current max, plus one" - two
    // concurrent joins in the same department could compute the same next
    // number from the same stale read. The (department, tokenNumber) unique
    // index catches that at write time; on conflict, just recompute and
    // retry rather than erroring the request out.
    let createdToken = null;
    for (let attempt = 0; attempt < MAX_JOIN_RETRY_ATTEMPTS; attempt++) {
      const lastToken = await QueueToken.findOne({ department: departmentId }).sort({
        tokenNumber: -1,
      });
      const tokenNumber = (lastToken?.tokenNumber || 0) + 1;
      const waitingTokens = await QueueToken.countDocuments({
        department: departmentId,
        status: 'waiting',
      });

      try {
        createdToken = await QueueToken.create({
          patientId,
          department: departmentId,
          tokenNumber,
          status: 'waiting',
          position: waitingTokens + 1,
          estimatedWaitTime: 15,
        });
        break;
      } catch (err) {
        if (err?.code === 11000) {
          if (/patientId_1_department_1/.test(err.message)) {
            // The double-join race: another request from this same patient
            // (e.g. a double-tap) won first.
            return res.status(400).json({ error: 'Already in queue for this department' });
          }
          // Otherwise it's the tokenNumber collision - loop and retry with a
          // freshly-read number.
          continue;
        }
        throw err;
      }
    }

    if (!createdToken) {
      return res.status(409).json({ error: 'Could not join the queue right now - please try again.' });
    }

    const departmentDoc = await Department.findById(departmentId);
    const waitingTokensNow = await QueueToken.countDocuments({
      department: departmentId,
      status: 'waiting',
    });
    const estimatedWaitTime = calculateEstimatedWaitTime({
      position: waitingTokensNow,
      departmentInfo: departmentDoc,
      inProgressCount: 0,
    });

    createdToken.estimatedWaitTime = estimatedWaitTime;
    await createdToken.save();

    const queueToken = await QueueToken.findById(createdToken._id).populate(['patientId', 'department']);

    logAudit(req, 'QUEUE_JOINED', 'QueueToken', queueToken._id, { departmentId, tokenNumber: queueToken.tokenNumber });
    broadcastQueueUpdate(req, departmentId);

    res.status(201).json({
      message: 'Joined queue successfully',
      token: queueToken,
    });
  } catch (error) {
    console.error('Join Queue Error:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
};

export const getQueueStatus = async (req, res) => {
  try {
    const { departmentId } = req.params;

    // POLICY (documented per the production-readiness directive's Section 3
    // requirement to pick one and document it): when a patient leaves the
    // queue mid-wait, everyone behind them shifts down. This isn't a special
    // case to handle - `position` below is always recomputed live from
    // whoever is *currently* still waiting/in-progress, sorted by join
    // time (createdAt), never read from the token's own stored `position`
    // field. A token's stored `position`/`estimatedWaitTime` are a snapshot
    // taken at join time for reference only; they are not the source of
    // truth for "where am I in line right now" - these two endpoints are.
    // Staff calling patients need a name to identify them; patients viewing
    // a shared department queue must never receive other patients' personal
    // records (name, phone, email, DOB, address, emergency contact, etc.) -
    // only enough to know where they stand in line. Select only what each
    // caller's role actually needs instead of populating the full Patient
    // document.
    const isStaffViewer = ['admin', 'doctor', 'nurse', 'receptionist'].includes(req.user.role);
    const tokens = await QueueToken.find({
      department: departmentId,
      status: { $in: ['waiting', 'in-progress'] },
    })
      .populate('patientId', isStaffViewer ? '_id name' : '_id')
      .sort({ createdAt: 1 });

    const departmentDoc = await Department.findById(departmentId);
    const inProgressCount = tokens.filter((item) => item.status === 'in-progress').length;

    const tokensWithPositions = tokens.map((token, index) => {
      const isOwnToken = req.user.role === 'patient' && String(token.patientId?._id) === String(req.user._id);
      return {
        _id: token._id,
        tokenNumber: token.tokenNumber,
        status: token.status,
        createdAt: token.createdAt,
        position: index + 1,
        estimatedWaitTime: calculateEstimatedWaitTime({
          position: index + 1,
          departmentInfo: departmentDoc,
          inProgressCount,
        }),
        // Only a name (never the rest of the patient record - no phone,
        // email, DOB, address, emergency contact, etc.), and only for staff
        // who need to call the patient, or the patient viewing their own
        // entry.
        patientId: isStaffViewer || isOwnToken ? { _id: token.patientId?._id, name: token.patientId?.name } : undefined,
        isMe: req.user.role === 'patient' ? isOwnToken : undefined,
      };
    });

    res.json({
      department: departmentId,
      tokens: tokensWithPositions,
      totalWaiting: tokens.filter((t) => t.status === 'waiting').length,
      inProgress: inProgressCount,
    });
  } catch (error) {
    console.error('Get Queue Status Error:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
};

export const getMyQueueToken = async (req, res) => {
  try {
    const patientId = req.user._id;

    const token = await QueueToken.findOne({
      patientId,
      status: { $in: ['waiting', 'in-progress'] },
    })
      .populate(['patientId', 'department']);

    if (!token) {
      return res.json({ token: null, message: 'Not in any queue' });
    }

    // Get current position
    const waitingBefore = await QueueToken.countDocuments({
      department: token.department,
      status: 'waiting',
      createdAt: { $lt: token.createdAt },
    });

    const inProgressCount = await QueueToken.countDocuments({
      department: token.department,
      status: 'in-progress',
    });

    const position = waitingBefore + inProgressCount + 1;
    const departmentDoc = await Department.findById(token.department._id);

    res.json({
      token: {
        ...token.toObject(),
        position,
        estimatedWaitTime: calculateEstimatedWaitTime({
          position,
          departmentInfo: departmentDoc,
          inProgressCount,
        }),
      },
    });
  } catch (error) {
    console.error('Get My Queue Token Error:', error);
    res.status(500).json({ error: 'Failed to get queue token' });
  }
};

export const updateTokenStatus = async (req, res) => {
  try {
    const { status, action } = req.body;
    const tokenId = req.params.id;

    if (!['waiting', 'in-progress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const token = await QueueToken.findById(tokenId).populate(['patientId', 'department']);

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    token.status = status;

    // If calling next patient
    if (action === 'call-next' && status === 'in-progress') {
      // Complete any previous in-progress token
      await QueueToken.updateMany(
        { department: token.department, status: 'in-progress', _id: { $ne: tokenId } },
        { status: 'done' }
      );
    }

    await token.save();

    logAudit(req, 'QUEUE_TOKEN_STATUS_UPDATED', 'QueueToken', token._id, { status, action });
    broadcastQueueUpdate(req, token.department._id || token.department);

    // Note on "doctor running late": estimated wait time is never stored as
    // a fixed countdown - calculateEstimatedWaitTime() (called fresh by
    // getQueueStatus/getMyQueueToken on every poll) always derives it from
    // the *current* in-progress/waiting counts, so it naturally recalculates
    // live as the doctor works through the queue - nothing extra to do here.
    res.json({
      message: `Token marked as ${status}`,
      token,
    });
  } catch (error) {
    console.error('Update Token Status Error:', error);
    res.status(500).json({ error: 'Failed to update token' });
  }
};

export const leaveQueue = async (req, res) => {
  try {
    const tokenId = req.params.id;
    const existing = await QueueToken.findById(tokenId);
    if (!existing) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // A patient may only remove their own queue token; staff may remove any
    // (e.g. marking a no-show as done).
    if (req.user.role === 'patient' && String(existing.patientId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only leave your own queue token' });
    }

    const token = await QueueToken.findByIdAndUpdate(
      tokenId,
      { status: 'done' },
      { new: true }
    );

    // No explicit "shift everyone behind them down" step needed here - see
    // the policy note in getQueueStatus above: position is always computed
    // live from who's still active, so removing this token from the active
    // set is the entire effect.
    logAudit(req, 'QUEUE_LEFT', 'QueueToken', tokenId, {});
    broadcastQueueUpdate(req, existing.department);

    res.json({ message: 'Left queue', token });
  } catch (error) {
    console.error('Leave Queue Error:', error);
    res.status(500).json({ error: 'Failed to leave queue' });
  }
};
