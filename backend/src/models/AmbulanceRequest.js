import mongoose from 'mongoose';

// A public emergency ambulance request - anyone (no login required) can submit one
// from the landing page. Reception/admin see and action these in real time.
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
