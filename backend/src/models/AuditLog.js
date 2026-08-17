import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userModel: {
      type: String,
      enum: ['User', 'Patient'],
      default: 'User',
    },
    // Captured at log-creation time (not populated later) so a readable name
    // is always available even if the staff account is later deleted, and so
    // the Recent Activity widget doesn't need an extra populate/join.
    staffName: String,
    role: String,
    action: {
      type: String,
      required: true,
    },
    resource: String,
    resourceId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
