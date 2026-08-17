import AmbulanceRequest from '../models/AmbulanceRequest.js';
import Otp from '../models/Otp.js';
import { verifyMsg91AccessToken, isMsg91Configured } from '../utils/msg91.js';

// Public: send a one-time code to the caller's phone before an ambulance
// request is accepted. This is the same lightweight Otp collection/flow the
// patient demo login uses (DEMO_OTP in dev, real SMS once MSG91 SMS is
// configured) - kept separate from patient accounts since a caller here
// never needs to be signed in.
export const sendAmbulanceOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const otp = process.env.DEMO_OTP || '1234';

    await Otp.findOneAndUpdate(
      { phone: phone.trim() },
      { phone: phone.trim(), otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true }
    );

    console.log(`[DEMO] Ambulance OTP for ${phone}: ${otp}`);

    res.json({ message: 'Verification code sent', phone });
  } catch (error) {
    console.error('Send Ambulance OTP Error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
};

// Public: anyone can request an ambulance from the landing page, no login required.
// This is intentionally unauthenticated - a caller in an emergency should never be
// blocked by a login screen. It does, however, require a verified phone number
// (OTP sent via sendAmbulanceOtp above) so the emergency desk isn't flooded with
// prank/spam dispatches - this still takes seconds, and the emergency phone
// number is always shown alongside the form as a bypass for anyone in a hurry.
export const createAmbulanceRequest = async (req, res) => {
  try {
    const { callerName, phone, location, notes, otp, accessToken } = req.body;

    if (!callerName || !phone || !location) {
      return res.status(400).json({ error: 'Name, phone number and location are required' });
    }

    if (accessToken) {
      // Real mode: the frontend already ran MSG91's OTP Widget (send OTP ->
      // verify OTP) and got back a verified access-token. We verify that
      // token server-side and make sure it's for the same phone number the
      // caller typed in, rather than trusting our own Otp collection.
      if (!isMsg91Configured()) {
        return res.status(503).json({ error: 'Real phone verification is not configured on this server yet.' });
      }
      let verified;
      try {
        verified = await verifyMsg91AccessToken(accessToken);
      } catch (err) {
        console.error('MSG91 Verify Error (ambulance):', err.message);
        return res.status(401).json({ error: 'Could not verify phone with MSG91 - please try again.' });
      }
      const verifiedDigits = String(verified.identifier || '').replace(/\D/g, '').slice(-10);
      const submittedDigits = String(phone).replace(/\D/g, '').slice(-10);
      if (!verifiedDigits || verifiedDigits !== submittedDigits) {
        return res.status(400).json({ error: 'Verified phone number does not match the number you entered.' });
      }
    } else {
      // Demo mode: fixed/dev OTP stored via sendAmbulanceOtp above.
      if (!otp) {
        return res.status(400).json({ error: 'Please verify your phone number with the code we sent you.' });
      }
      const storedOtp = await Otp.findOne({ phone: phone.trim() });
      if (!storedOtp || storedOtp.otp !== otp) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }
      if (new Date() > storedOtp.expiresAt) {
        return res.status(400).json({ error: 'Verification code expired - please resend it' });
      }
      await Otp.deleteOne({ phone: phone.trim() });
    }

    const request = await AmbulanceRequest.create({
      callerName: callerName.trim(),
      phone: phone.trim(),
      location: location.trim(),
      notes: (notes || '').trim(),
      status: 'pending',
    });

    const io = req.app.get('io');
    if (io) {
      // Only reception/admin sockets are in this room - never broadcast a
      // caller's name/phone/location to every connected patient session.
      io.to('dispatch').emit('ambulance-request-created', request);
    }

    res.status(201).json({
      message: 'Ambulance request received. Our team has been notified and will call you shortly.',
      request,
    });
  } catch (error) {
    console.error('Create Ambulance Request Error:', error);
    res.status(500).json({ error: 'Failed to submit ambulance request' });
  }
};

// Reception / admin: view emergency requests, most recent first.
export const getAmbulanceRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await AmbulanceRequest.find(filter)
      .populate('handledBy', 'name role')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Get Ambulance Requests Error:', error);
    res.status(500).json({ error: 'Failed to fetch ambulance requests' });
  }
};

// Reception / admin: update status as the request is actioned (dispatched, completed, etc.)
export const updateAmbulanceRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'dispatched', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await AmbulanceRequest.findByIdAndUpdate(
      req.params.id,
      {
        status,
        handledBy: req.user._id,
        handledAt: new Date(),
      },
      { new: true }
    ).populate('handledBy', 'name role');

    if (!request) {
      return res.status(404).json({ error: 'Ambulance request not found' });
    }

    res.json({ message: 'Ambulance request updated', request });
  } catch (error) {
    console.error('Update Ambulance Request Error:', error);
    res.status(500).json({ error: 'Failed to update ambulance request' });
  }
};
