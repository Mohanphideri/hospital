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

const rateLimitBuckets = new Map();
function isRateLimited(key, windowMs, max) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key) || [];
  const recent = bucket.filter((t) => now - t < windowMs);
  recent.push(now);
  rateLimitBuckets.set(key, recent);
  return recent.length > max;
}

const RESEND_COOLDOWN_MS = 60 * 1000; 
const OTP_VALID_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    
    
    if (isRateLimited(`send-otp:${phone}`, 60 * 60 * 1000, 5)) {
      return res.status(429).json({ error: 'Too many OTP requests for this number - please try again later.' });
    }

    
    const otp = process.env.DEMO_OTP || '1234';

    
    
    await Otp.findOneAndUpdate(
      { phone },
      { phone, otp, expiresAt: new Date(Date.now() + OTP_VALID_MINUTES * 60 * 1000), attempts: 0 },
      { upsert: true }
    );

    
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

    
    await Otp.deleteOne({ phone });

    res.json({
      message: 'OTP verified successfully',
      token,
      patient,
      
      
      nameRequired: !patient.name,
    });
  } catch (error) {
    console.error('OTP Verify Error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

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

    
    
    
    
    
    const accessToken = await issueSession(req, res, payload, record.role);

    res.json({ token: accessToken, role: record.role });
  } catch (error) {
    console.error('Refresh Token Error:', error);
    res.status(500).json({ error: 'Failed to refresh session' });
  }
};

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

    
    if (!user.mustResetPassword) {
      if (!(await comparePassword(oldPassword, user.passwordHash))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    user.mustResetPassword = false;
    await user.save();

    
    
    
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

    
    
    
    
    
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const existing = await PasswordResetOtp.findOne({ email: normalizedEmail });
      if (existing && Date.now() - new Date(existing.lastSentAt).getTime() < RESEND_COOLDOWN_MS) {
        
        
        
        
        
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
        
        
        await sendPasswordResetOtpEmail(normalizedEmail, user.name, otp, OTP_VALID_MINUTES);
      } catch (mailErr) {
        console.error('Password reset email send failed:', mailErr.message);
        
        
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
      
      
      await PasswordResetOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ error: 'Account not found' });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.mustResetPassword = false;
    await user.save();

    await PasswordResetOtp.deleteOne({ _id: record._id });

    
    
    await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });

    res.json({ message: 'Password reset successfully - you can now log in.' });
  } catch (error) {
    console.error('Forgot Password Reset Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
