import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    appointmentCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Not required: a General-department appointment is created with no
      // doctor yet ("pending assignment") until a receptionist assigns one
      // via PATCH /appointments/:id/assign. Every other department still
      // always has a doctor from the moment it's booked.
      required: false,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    slotTime: {
      type: Date,
      // Not required for the same reason as doctorId above - a General
      // appointment has no time until reception assigns one.
      required: false,
    },
    // Position (1-based) within this specific slot's capacity - e.g. the
    // 4th patient booked into a 10:00/capacity-5 slot has slotPosition 4.
    // Set at booking/(re)assignment time from the SlotBooking seat claim -
    // see utils/slotCapacity.js + utils/dailyToken.js.
    slotPosition: {
      type: Number,
      required: false,
    },
    // This patient's estimated turn, computed as slotTime + (slotPosition-1)
    // * a fixed per-patient gap (utils/dailyToken.js's
    // SLOT_PER_PATIENT_MINUTES) - e.g. position 4 in a 10:00 slot ≈ 10:45.
    estimatedTime: {
      type: Date,
      required: false,
    },
    // Running token number for this doctor across the whole clinic day (all
    // slots combined, not just this one) - e.g. if the 10:00 slot filled
    // tokens 1-5, the first patient booked into the 11:00 slot gets token 6.
    // Never reused/renumbered on cancellation. See utils/dailyToken.js.
    dailyToken: {
      type: Number,
      required: false,
    },
    status: {
      type: String,
      enum: ['booked', 'completed', 'cancelled', 'no-show'],
      default: 'booked',
    },
    notes: String,
    bookingSource: {
      type: String,
      enum: ['PATIENT', 'RECEPTIONIST', 'ADMIN'],
      default: 'PATIENT',
    },
    // The authenticated user who created this booking (a Patient _id if
    // bookingSource is PATIENT, otherwise a staff User _id).
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByModel',
    },
    createdByModel: {
      type: String,
      enum: ['Patient', 'User'],
    },
    cancelReason: String,
    cancelNote: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'cancelledByModel',
    },
    cancelledByModel: {
      type: String,
      enum: ['Patient', 'User'],
    },
    cancelledAt: Date,
  },
  { timestamps: true }
);

// NOTE: doctor+slot capacity used to be enforced here with a partial unique
// index (max one non-cancelled appointment per doctorId+slotTime). Slots can
// now hold more than one patient (see DoctorSlot.capacity), so exclusivity
// at this collection's level would be wrong - a doctor's 10:00 slot may
// legitimately have several Appointment documents pointing at the same
// doctorId+slotTime. The race this index used to close (two people booking
// the last seat at once) is now closed instead by the atomic seat counter in
// models/SlotBooking.js + utils/slotCapacity.js, which every booking path
// claims a seat from *before* creating the Appointment document itself.

export default mongoose.model('Appointment', appointmentSchema);
