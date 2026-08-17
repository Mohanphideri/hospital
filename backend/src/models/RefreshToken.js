import mongoose from 'mongoose';

// Refresh tokens are never stored in plaintext - only a SHA-256 hash of the
// random token value that lives in the httpOnly cookie. This means a DB
// leak alone can't be used to impersonate a session (same principle as
// password hashing). Revocation is a real DB write (revokedAt), not just
// "let the JWT expire eventually" - this is what makes logout and "sign out
// this device" actually work server-side instead of only clearing a cookie.
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    // Patients and staff share this table; role is stored so a token can be
    // resolved back to the right collection (User vs Patient) without a guess.
    role: {
      type: String,
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    // Rotation chain: when a refresh token is used, it is revoked and the
    // newly issued token's hash is recorded here, so reuse of a stolen/old
    // token after rotation is detectable (see authController.refreshAccessToken).
    replacedByHash: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Mongo TTL cleanup once expired
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    userAgent: String,
    ip: String,
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ userId: 1, revokedAt: 1 });

export default mongoose.model('RefreshToken', refreshTokenSchema);
