import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import PasswordResetOtp from '../models/PasswordResetOtp.js';
import RefreshToken from '../models/RefreshToken.js';
import { hashPassword, comparePassword, generateOTP } from '../utils/crypto.js';
import {
  issueSession,
  rotateRefreshToken,
  revokeRefreshRecord,
  clearSessionCookie,
  hashToken,
  REFRESH_COOKIE_NAME,
} from '../utils/session.js';
import { verifyMsg91AccessToken, isMsg91Configured } from '../utils/msg91.js';
import { sendPasswordResetOtpEmail, isEmailConfigured } from '../utils/mailer.js';

// --- simple in-memory rate limiting for the public endpoints below ---
// (same lightweight approach used by the public chatbot endpoint - keyed by
// IP or phone/email, resets on server restart). A Redis-backed sliding
// window limiter (Section 5) will replace this for multi-instance
// deployments; this is sufficient for a single-instance server today.
const rateLimitBuckets = new Map();
function isRateLimited(key, windowMs, max) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key) || [];
  const recent = bucket.filter((t) => now - t < windowMs);
  recent.push(now);
  rateLimitBuckets.set(key, recent);
  return recent.length > max;
}

const RESEND_COOLDOWN_MS = 60 * 1000; // 60s between OTP sends to the same email/phone
const OTP_VALID_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    // Rate-limit OTP sends per phone (max 5/hour) so this endpoint can't be
    // used to spam a number or hammer the (future) real SMS provider.
    if (isRateLimited(`send-otp:${phone}`, 60 * 60 * 1000, 5)) {
      return res.status(429).json({ error: 'Too many OTP requests for this number - please try again later.' });
    }

    // For demo: use hardcoded OTP
    const otp = process.env.DEMO_OTP || '1234';

    // Save OTP to database - reset attempts on every fresh send so a locked-out
    // number gets a clean slate once a new code is issued.
    await Otp.findOneAndUpdate(
      { phone },
      { phone, otp, expiresAt: new Date(Date.now() + OTP_VALID_MINUTES * 60 * 1000), attempts: 0 },
      { upsert: true }
    );

    // In production, send via SMS/Twilio
    console.log(`[DEMO] OTP for ${phone}: ${otp}`);

    res.json({ message: 'OTP sent successfully', phone });
  } catch (error) {
    console.error('OTP Send Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }

    if (isRateLimited(`verify-otp:${phone}`, 15 * 60 * 1000, 10)) {
      return res.status(429).json({ error: 'Too many attempts - please try again later.' });
    }

    const storedOtp = await Otp.findOne({ phone });

    if (!storedOtp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date() > storedOtp.expiresAt) {
      await Otp.deleteOne({ _id: storedOtp._id });
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (storedOtp.attempts >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteOne({ _id: storedOtp._id });
      return res.status(429).json({ error: 'Too many incorrect attempts - please request a new code.' });
    }

    if (storedOtp.otp !== otp) {
      storedOtp.attempts += 1;
      await storedOtp.save();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Find or create patient
    let patient = await Patient.findOne({ phone });

    if (!patient) {
      patient = await Patient.create({ phone });
    }

    const token = await issueSession(
      req,
      res,
      { _id: patient._id, role: 'patient', name: patient.name || 'Patient' },
      'patient'
    );

    // Delete OTP after use (single-use)
    await Otp.deleteOne({ phone });

    res.json({
      message: 'OTP verified successfully',
      token,
      patient,
      // Existing patients (recognized number) skip this; a brand-new number must
      // provide their name before continuing into the portal.
      nameRequired: !patient.name,
    });
  } catch (error) {
    console.error('OTP Verify Error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

// "Real mode" patient login: the frontend has already verified the phone
// number via MSG91's OTP Widget (send OTP -> verify OTP) and obtained a
// verified access-token from it. We verify that token server-side against
// MSG91's API, then issue our own session exactly like the demo flow does -
// MSG91 only proves phone ownership, it never replaces our JWT/session system.
export const msg91Login = async (req, res) => {
  try {
    if (!isMsg91Configured()) {
      return res.status(503).json({ error: 'Real phone verification is not configured on this server yet.' });
    }

    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'accessToken is required' });
    }

    let verified;
    try {
      verified = await verifyMsg91AccessToken(accessToken);
    } catch (err) {
      console.error('MSG91 Verify Error:', err.message);
      return res.status(401).json({ error: 'Could not verify phone with MSG91 - please try again.' });
    }

    const phone = verified.identifier;
    if (!phone) {
      return res.status(400).json({ error: 'No verified phone number on this MSG91 token' });
    }

    let patient = await Patient.findOne({ phone });
    if (!patient) {
      patient = await Patient.create({ phone, authProvider: 'msg91', phoneVerified: true });
    } else if (!patient.phoneVerified || patient.authProvider !== 'msg91') {
      patient.phoneVerified = true;
      patient.authProvider = 'msg91';
      await patient.save();
    }

    const token = await issueSession(
      req,
      res,
      { _id: patient._id, role: 'patient', name: patient.name || 'Patient' },
      'patient'
    );

    res.json({
      message: 'Phone verified successfully',
      token,
      patient,
      nameRequired: !patient.name,
    });
  } catch (error) {
    console.error('MSG91 Login Error:', error);
    res.status(500).json({ error: 'Failed to verify phone login' });
  }
};

export const staffLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return res
        .status(423)
        .json({ error: `Account temporarily locked after repeated failed logins - try again in ${waitMinutes} min.` });
    }

    if (!(await comparePassword(password, user.passwordHash))) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    const token = await issueSession(req, res, user, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        designation: user.designation,
        mustResetPassword: user.mustResetPassword,
      },
    });
  } catch (error) {
    console.error('Staff Login Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Exchanges the httpOnly refresh-token cookie for a new access token,
// rotating the refresh token in the process (old one is revoked, a new one
// is issued and set as the cookie). Called by the frontend automatically
// when an API request comes back 401/TOKEN_EXPIRED, and periodically to keep
// a genuinely-active session alive without forcing a full re-login every 15
// minutes.
export const refreshAccessToken = async (req, res) => {
  try {
    const record = await rotateRefreshToken(req, res);
    if (!record) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Session expired - please sign in again.' });
    }

    let payload;
    if (record.role === 'patient') {
      const patient = await Patient.findById(record.userId);
      if (!patient) {
        await revokeRefreshRecord(record);
        clearSessionCookie(res);
        return res.status(401).json({ error: 'Session is no longer valid' });
      }
      payload = { _id: patient._id, role: 'patient', name: patient.name || 'Patient' };
    } else {
      const user = await User.findById(record.userId);
      if (!user || !user.isActive) {
        await revokeRefreshRecord(record);
        clearSessionCookie(res);
        return res.status(401).json({ error: 'Session is no longer valid' });
      }
      payload = user;
    }

    // issueSession() creates + persists the new refresh token and sets the
    // new cookie. The old record was already atomically revoked inside
    // rotateRefreshToken() at the moment it was consumed - no separate
    // revoke/save step needed (or safe to do) here, since doing it here
    // instead would reopen exactly the race rotateRefreshToken() closes.
    const accessToken = await issueSession(req, res, payload, record.role);

    res.json({ token: accessToken, role: record.role });
  } catch (error) {
    console.error('Refresh Token Error:', error);
    res.status(500).json({ error: 'Failed to refresh session' });
  }
};

// Server-side logout: revokes the refresh token tied to this device (not
// every device - see revokeAllSessions for that) and clears the cookie. The
// access token itself can't be un-issued, but it expires within minutes and
// the frontend discards it immediately.
export const logout = async (req, res) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    if (raw) {
      const tokenHash = hashToken(raw);
      await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
    }
    clearSessionCookie(res);
    res.json({ message: 'Logged out' });
  } catch (error) {
    console.error('Logout Error:', error);
    clearSessionCookie(res);
    res.json({ message: 'Logged out' });
  }
};

// "My devices" - lists this account's active (non-revoked, non-expired)
// sessions so the person can see and revoke them individually. Implements
// the doc's Section 1 concurrent-session policy option (a): multiple device
// sessions are allowed, each independently revocable here.
export const listSessions = async (req, res) => {
  try {
    const currentRaw = req.cookies?.[REFRESH_COOKIE_NAME];
    const currentHash = currentRaw ? hashToken(currentRaw) : null;

    const sessions = await RefreshToken.find({
      userId: req.user._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastUsedAt: -1 })
      .lean();

    res.json(
      sessions.map((s) => ({
        id: s._id,
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        current: s.tokenHash === currentHash,
      }))
    );
  } catch (error) {
    console.error('List Sessions Error:', error);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
};

// Revoke one specific device session by id (must belong to the caller).
export const revokeSession = async (req, res) => {
  try {
    const record = await RefreshToken.findOne({ _id: req.params.id, userId: req.user._id });
    if (!record) {
      return res.status(404).json({ error: 'Session not found' });
    }
    record.revokedAt = new Date();
    await record.save();
    res.json({ message: 'Session revoked' });
  } catch (error) {
    console.error('Revoke Session Error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
};

// Revoke every session for this account except the current one - "log out
// everywhere else".
export const revokeAllSessions = async (req, res) => {
  try {
    const currentRaw = req.cookies?.[REFRESH_COOKIE_NAME];
    const currentHash = currentRaw ? hashToken(currentRaw) : null;

    const filter = { userId: req.user._id, revokedAt: null };
    if (currentHash) filter.tokenHash = { $ne: currentHash };

    await RefreshToken.updateMany(filter, { revokedAt: new Date() });
    res.json({ message: 'All other sessions signed out' });
  } catch (error) {
    console.error('Revoke All Sessions Error:', error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
};

// Called on app startup / page refresh to restore the session. Re-fetches the
// actual user (or patient) record from the DB rather than trusting the JWT
// payload alone - this way a deactivated account or a role change made by an
// admin after the token was issued is reflected immediately, not just at next
// login. Returns 401 only if the account genuinely no longer exists/is inactive;
// the frontend treats that as "session invalid", everything else as "restored".
export const getCurrentUser = async (req, res) => {
  try {
    if (req.user.role === 'patient') {
      const patient = await Patient.findById(req.user._id);
      if (!patient) {
        return res.status(401).json({ error: 'Session is no longer valid' });
      }
      return res.json({ role: 'patient', patient });
    }

    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Session is no longer valid' });
    }
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    res.json({
      role: user.role,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        designation: user.designation,
        mustResetPassword: user.mustResetPassword,
      },
    });
  } catch (error) {
    console.error('Get Current User Error:', error);
    res.status(500).json({ error: 'Failed to restore session' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new password required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only check old password if user is changing password (not first time)
    if (!user.mustResetPassword) {
      if (!(await comparePassword(oldPassword, user.passwordHash))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    user.mustResetPassword = false;
    await user.save();

    // Changing a password is a meaningful security event - sign out every
    // other device so a compromised/shared session doesn't stay logged in
    // under the old credentials.
    const currentRaw = req.cookies?.[REFRESH_COOKIE_NAME];
    const currentHash = currentRaw ? hashToken(currentRaw) : null;
    const filter = { userId: user._id, revokedAt: null };
    if (currentHash) filter.tokenHash = { $ne: currentHash };
    await RefreshToken.updateMany(filter, { revokedAt: new Date() });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// ---------------------------------------------------------------------------
// FORGOT PASSWORD (staff accounts only - patients authenticate via phone OTP
// and have no password). Flow: send OTP by email -> verify OTP -> reset
// password. Separate from the "must reset password on first login" flow in
// changePassword() above, and from PasswordReset.jsx on the frontend.
// ---------------------------------------------------------------------------

export const forgotPasswordSendOtp = async (req, res) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Email delivery is not configured on this server yet.' });
    }

    const { email } = req.body;
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    if (isRateLimited(`fp-send:${normalizedEmail}`, 60 * 60 * 1000, 5)) {
      return res.status(429).json({ error: 'Too many reset requests - please try again later.' });
    }

    // Never reveal whether an email is registered - this response is
    // identical either way (same message, same status, no timing shortcut
    // for an unregistered email) so the endpoint can't be used to enumerate
    // which addresses have a staff account. If the email genuinely isn't
    // registered, we just quietly skip sending anything below.
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const existing = await PasswordResetOtp.findOne({ email: normalizedEmail });
      if (existing && Date.now() - new Date(existing.lastSentAt).getTime() < RESEND_COOLDOWN_MS) {
        // A real resend-cooldown 429 would itself leak "this email exists and
        // was just used" - so for an unregistered email we deliberately don't
        // reach this branch at all (existing will always be null), and for a
        // registered email hitting cooldown is expected/normal behavior, not
        // an enumeration signal on its own.
        const waitSeconds = Math.ceil(
          (RESEND_COOLDOWN_MS - (Date.now() - new Date(existing.lastSentAt).getTime())) / 1000
        );
        return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting another code.` });
      }

      const otp = generateOTP(4);
      const otpHash = await hashPassword(otp);

      await PasswordResetOtp.findOneAndUpdate(
        { email: normalizedEmail },
        {
          email: normalizedEmail,
          otpHash,
          expiresAt: new Date(Date.now() + OTP_VALID_MINUTES * 60 * 1000),
          attempts: 0,
          verified: false,
          lastSentAt: new Date(),
        },
        { upsert: true }
      );

      try {
        // Look the username up by email so the reset email can greet the
        // right person by name instead of just "Hi,".
        await sendPasswordResetOtpEmail(normalizedEmail, user.name, otp, OTP_VALID_MINUTES);
      } catch (mailErr) {
        console.error('Password reset email send failed:', mailErr.message);
        // Still don't leak existence via a different error path - a generic
        // "try again" reads the same whether or not the account exists.
        return res.status(500).json({ error: 'Failed to send the reset email - please try again.' });
      }
    }

    res.json({ message: 'If that email is registered, a reset code has been sent to it.' });
  } catch (error) {
    console.error('Forgot Password Send OTP Error:', error);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
};

export const forgotPasswordVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and code are required' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    if (isRateLimited(`fp-verify:${normalizedEmail}`, 15 * 60 * 1000, 10)) {
      return res.status(429).json({ error: 'Too many attempts - please try again later.' });
    }

    const record = await PasswordResetOtp.findOne({ email: normalizedEmail });
    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    if (new Date() > record.expiresAt) {
      await PasswordResetOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ error: 'This code has expired - please request a new one.' });
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await PasswordResetOtp.deleteOne({ _id: record._id });
      return res.status(429).json({ error: 'Too many incorrect attempts - please request a new code.' });
    }

    const isMatch = await comparePassword(otp, record.otpHash);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ error: 'Incorrect code' });
    }

    record.verified = true;
    await record.save();

    res.json({ message: 'Code verified - you can now set a new password.' });
  } catch (error) {
    console.error('Forgot Password Verify OTP Error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
};

export const forgotPasswordReset = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const record = await PasswordResetOtp.findOne({ email: normalizedEmail });
    if (!record || !record.verified) {
      return res.status(400).json({ error: 'Please verify your code before resetting the password' });
    }
    if (new Date() > record.expiresAt) {
      await PasswordResetOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ error: 'This code has expired - please request a new one.' });
    }
    const isMatch = await comparePassword(otp, record.otpHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect code' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Shouldn't normally happen (send-otp only emails real accounts), but
      // guard anyway rather than 500ing.
      await PasswordResetOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ error: 'Account not found' });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.mustResetPassword = false;
    await user.save();

    await PasswordResetOtp.deleteOne({ _id: record._id });

    // A password reset via email is also a security-sensitive event - sign
    // out every existing device session for this account.
    await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });

    res.json({ message: 'Password reset successfully - you can now log in.' });
  } catch (error) {
    console.error('Forgot Password Reset Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
