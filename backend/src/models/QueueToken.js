import mongoose from 'mongoose';

const queueTokenSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    tokenNumber: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'in-progress', 'done'],
      default: 'waiting',
    },
    position: Number,
    estimatedWaitTime: Number, 
  },
  { timestamps: true }
);

queueTokenSchema.index(
  { patientId: 1, department: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'done' } } }
);

queueTokenSchema.index({ department: 1, tokenNumber: 1 }, { unique: true });

export default mongoose.model('QueueToken', queueTokenSchema);
