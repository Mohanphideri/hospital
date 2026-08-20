import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    
    
    role: {
      type: String,
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    
    
    
    replacedByHash: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, 
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
