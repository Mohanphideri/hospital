import mongoose from 'mongoose';

const passwordResetOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // auto-cleanup once expired
  },
  attempts: {
    type: Number,
    default: 0,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  lastSentAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('PasswordResetOtp', passwordResetOtpSchema);
