import mongoose from 'mongoose';

const slotBookingSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    slotTime: {
      type: Date,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

slotBookingSchema.index({ doctorId: 1, slotTime: 1 }, { unique: true });

export default mongoose.model('SlotBooking', slotBookingSchema);
