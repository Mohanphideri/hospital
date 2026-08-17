import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    // General/"not sure what's wrong" consultation department. Booking into
    // this department skips the normal slot-based flow entirely (no
    // DoctorSlot schedule is checked, no time is picked by the patient) -
    // the appointment is created "pending" (no doctor, no time) and a
    // receptionist assigns a doctor + any time they like afterwards, via
    // PATCH /appointments/:id/assign. See appointmentController.js.
    isGeneral: {
      type: Boolean,
      default: false,
    },
    doctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Department', departmentSchema);
