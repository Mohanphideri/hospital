import mongoose from 'mongoose';

// A simple internal message board: any staff member can post a message and
// it becomes visible to every other staff member across every portal.
const staffMessageSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

export default mongoose.model('StaffMessage', staffMessageSchema);
