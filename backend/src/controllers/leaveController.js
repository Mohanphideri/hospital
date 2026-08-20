import LeaveRequest from '../models/LeaveRequest.js';
import Appointment from '../models/Appointment.js';
import { logAudit } from '../utils/auditLog.js';

export const applyForLeave = async (req, res) => {
  try {
    const { fromDate, toDate, reason, leaveType, timeFrom, timeTo } = req.body;
    const staffId = req.user._id;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ error: 'From date, to date, and reason required' });
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ error: 'From date must be before to date' });
    }

    
    
    const recentRejected = await LeaveRequest.findOne({
      staffId,
      status: 'rejected',
      fromDate: { $lte: new Date(toDate) },
      toDate: { $gte: new Date(fromDate) },
    }).sort({ reviewedAt: -1 });
    if (recentRejected?.reviewedAt) {
      const reviewedDay = new Date(recentRejected.reviewedAt);
      reviewedDay.setHours(0, 0, 0, 0);
      const nextAllowedDay = new Date(reviewedDay.getTime() + 24 * 60 * 60 * 1000);
      if (new Date() < nextAllowedDay) {
        return res.status(400).json({ error: 'This leave was rejected - you can reapply for overlapping dates starting the next day.' });
      }
    }

    
    const overlapping = await LeaveRequest.findOne({
      staffId,
      status: { $in: ['pending', 'approved'] },
      fromDate: { $lte: new Date(toDate) },
      toDate: { $gte: new Date(fromDate) },
    });
    if (overlapping) {
      return res.status(400).json({ error: 'You already have a pending or approved leave request that overlaps these dates' });
    }

    const leaveRequest = await LeaveRequest.create({
      staffId,
      leaveType: leaveType || 'casual',
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      timeFrom: timeFrom || undefined,
      timeTo: timeTo || undefined,
      reason,
      status: 'pending',
    });

    await leaveRequest.populate('staffId');

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest,
    });
  } catch (error) {
    console.error('Apply For Leave Error:', error);
    res.status(500).json({ error: 'Failed to apply for leave' });
  }
};

export const getMyLeaveRequests = async (req, res) => {
  try {
    const staffId = req.user._id;

    const leaveRequests = await LeaveRequest.find({ staffId })
      .populate('staffId')
      .populate('reviewedBy')
      .sort({ createdAt: -1 });

    res.json(leaveRequests);
  } catch (error) {
    console.error('Get My Leave Requests Error:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

export const getPendingLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find({ status: 'pending' })
      .populate('staffId')
      .sort({ createdAt: 1 });

    res.json(leaveRequests);
  } catch (error) {
    console.error('Get Pending Leave Requests Error:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

export const getLeaveHistory = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find({ status: { $in: ['approved', 'rejected'] } })
      .populate('staffId')
      .populate('reviewedBy')
      .sort({ reviewedAt: -1, createdAt: -1 });

    res.json(leaveRequests);
  } catch (error) {
    console.error('Get Leave History Error:', error);
    res.status(500).json({ error: 'Failed to fetch leave history' });
  }
};

export const getLeaveConflicts = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id).populate('staffId');
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const conflicts = await Appointment.find({
      doctorId: leaveRequest.staffId._id,
      status: 'booked',
      slotTime: { $gte: leaveRequest.fromDate, $lte: leaveRequest.toDate },
    })
      .populate('patientId')
      .populate('department')
      .sort({ slotTime: 1 });

    res.json({ leaveRequest, conflicts });
  } catch (error) {
    console.error('Get Leave Conflicts Error:', error);
    res.status(500).json({ error: 'Failed to check leave conflicts' });
  }
};

export const approveLeaveRequest = async (req, res) => {
  try {
    const { force } = req.body;

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const conflicts = await Appointment.find({
      doctorId: leaveRequest.staffId,
      status: 'booked',
      slotTime: { $gte: leaveRequest.fromDate, $lte: leaveRequest.toDate },
    })
      .populate('patientId')
      .populate('department')
      .sort({ slotTime: 1 });

    if (conflicts.length > 0 && !force) {
      return res.status(409).json({
        error: `${conflicts.length} appointment${conflicts.length !== 1 ? 's are' : ' is'} affected by this leave request.`,
        conflicts,
      });
    }

    leaveRequest.status = 'approved';
    leaveRequest.reviewedBy = req.user._id;
    leaveRequest.reviewedAt = new Date();
    await leaveRequest.save();
    await leaveRequest.populate(['staffId', 'reviewedBy']);

    logAudit(req, 'LEAVE_APPROVED', 'LeaveRequest', leaveRequest._id, {
      staffId: leaveRequest.staffId._id,
      conflictsOverridden: conflicts.length,
    });

    res.json({
      message: 'Leave request approved',
      leaveRequest,
      conflicts,
    });
  } catch (error) {
    console.error('Approve Leave Request Error:', error);
    res.status(500).json({ error: 'Failed to approve leave request' });
  }
};

export const rejectLeaveRequest = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ error: 'A rejection reason is required' });
    }

    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
      },
      { new: true }
    )
      .populate('staffId')
      .populate('reviewedBy');

    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    logAudit(req, 'LEAVE_REJECTED', 'LeaveRequest', leaveRequest._id, { rejectionReason });

    res.json({
      message: 'Leave request rejected',
      leaveRequest,
    });
  } catch (error) {
    console.error('Reject Leave Request Error:', error);
    res.status(500).json({ error: 'Failed to reject leave request' });
  }
};
