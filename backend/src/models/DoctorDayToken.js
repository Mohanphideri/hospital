import mongoose from 'mongoose';

// One document per (doctorId, clinic-local calendar date) - tracks the last
// token number handed out to that doctor's patients that day, across every
// slot. This is what lets a 10:00 slot (capacity 5) hand out tokens 1-5 and
// an 11:00 slot for the same doctor continue at 6, 7, ... rather than each
// slot restarting its own numbering - see utils/dailyToken.js for the
// atomic claim that increments this.
const doctorDayTokenSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // "YYYY-MM-DD" in clinic (India) local time - see utils/clinicTime.js.
    // Deliberately a string, not a Date, so this never has to reason about
    // timezone/day-boundary edge cases beyond what clinicTime.js already
    // resolved when it was computed.
    dateKey: {
      type: String,
      required: true,
    },
    lastToken: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

doctorDayTokenSchema.index({ doctorId: 1, dateKey: 1 }, { unique: true });

export default mongoose.model('DoctorDayToken', doctorDayTokenSchema);
