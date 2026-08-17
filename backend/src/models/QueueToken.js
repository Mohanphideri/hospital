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
    estimatedWaitTime: Number, // in minutes
  },
  { timestamps: true }
);

// Prevents a patient from ending up with two simultaneously-active
// (waiting/in-progress) tokens in the same department - the controller's own
// "are they already in queue?" check (a find() before the create()) is a
// read-then-write race under real concurrent load (e.g. a double-tap on
// "Join Queue"); this index is what actually closes it. Tokens with
// status 'done' don't count, so a patient can rejoin after being served.
queueTokenSchema.index(
  { patientId: 1, department: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'done' } } }
);

// Prevents two concurrent joinQueue calls in the same department from ever
// landing on the same tokenNumber - the "find the latest token number, add
// one" read is a classic race under concurrent load; the retry-on-conflict
// loop in the controller relies on this index actually existing to detect
// the collision.
queueTokenSchema.index({ department: 1, tokenNumber: 1 }, { unique: true });

export default mongoose.model('QueueToken', queueTokenSchema);
