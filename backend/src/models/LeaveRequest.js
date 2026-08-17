import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    leaveType: {
      type: String,
      enum: ['casual', 'sick', 'emergency', 'night-out', 'day-out', 'other'],
      default: 'casual',
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    timeFrom: String,
    timeTo: String,
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true }
);

export default mongoose.model('LeaveRequest', leaveRequestSchema);
