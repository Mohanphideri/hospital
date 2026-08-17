import mongoose from 'mongoose';

// A single recurring weekly slot a doctor is available at, set by the admin.
// e.g. { doctorId, department, dayOfWeek: 2 (Tue), time: "09:30" }
const doctorSlotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    dayOfWeek: {
      type: Number, // 0 = Sunday ... 6 = Saturday
      required: true,
      min: 0,
      max: 6,
    },
    time: {
      type: String, // "HH:MM" 24-hour, e.g. "09:30"
      required: true,
    },
    // How many patients can be booked into this exact doctor+time slot
    // before it's considered full. Defaults to 1 (the original one-patient-
    // per-slot behavior). A department that runs group/walk-in-style blocks
    // (e.g. "10:00 slot, up to 5 patients") sets this higher when the admin
    // configures the doctor's weekly schedule.
    capacity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
);

doctorSlotSchema.index({ doctorId: 1, dayOfWeek: 1, time: 1 }, { unique: true });

export default mongoose.model('DoctorSlot', doctorSlotSchema);
