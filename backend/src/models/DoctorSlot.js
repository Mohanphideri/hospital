import mongoose from 'mongoose';

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
      type: Number, 
      required: true,
      min: 0,
      max: 6,
    },
    time: {
      type: String, 
      required: true,
    },
    
    
    
    
    
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
