import mongoose from 'mongoose';

const ambulanceRequestSchema = new mongoose.Schema(
  {
    callerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'dispatched', 'completed', 'cancelled'],
      default: 'pending',
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    handledAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('AmbulanceRequest', ambulanceRequestSchema);
