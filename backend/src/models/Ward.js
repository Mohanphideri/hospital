import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema({
  bedNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['vacant', 'occupied', 'maintenance'],
    default: 'vacant',
  },
  dailyCharge: {
    type: Number,
    required: true,
    default: 0,
  },
  // Care intensity for this bed - lets ICU wards distinguish a "normal" ICU bed
  // from a "critical" one requiring closer monitoring, so staff know which bed
  // a patient should be shifted into.
  careLevel: {
    type: String,
    enum: ['normal', 'critical'],
    default: 'normal',
  },
});

const wardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    type: {
      type: String,
      enum: ['general', 'icu', 'private', 'semi-private'],
      default: 'general',
    },
    floor: String,
    beds: [bedSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Ward', wardSchema);
