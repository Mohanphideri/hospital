import mongoose from 'mongoose';

// Public notices the admin posts for visitors - e.g. "Free OPD on 15th August"
// or "Cardiology camp this weekend". Shown on the public landing page.
const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional date the announcement is about (e.g. the free OPD day itself).
    // Distinct from createdAt, which is just when the admin posted it.
    eventDate: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Announcement', announcementSchema);
