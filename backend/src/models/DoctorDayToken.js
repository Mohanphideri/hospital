import mongoose from 'mongoose';

const doctorDayTokenSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    
    
    
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
