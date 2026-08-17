import mongoose from 'mongoose';

// One document per (doctorId, exact slotTime instance) - tracks how many
// seats are currently reserved out of that slot's capacity. This is what
// makes "a slot at 10:00 can hold up to 5 patients" safe under concurrent
// bookings: reserving a seat is a single atomic conditional update
// ($inc bookedCount only if bookedCount < capacity), so two people booking
// the last seat at the same instant can never both succeed.
//
// `capacity` is copied in from the doctor's DoctorSlot schedule the moment
// the first booking for that specific date+time happens, and then belongs to
// this instance from then on - if the admin changes the weekly schedule's
// capacity afterwards, already-created slot instances keep the capacity they
// started with rather than silently changing under bookings already made
// against them. (See utils/slotCapacity.js.)
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
