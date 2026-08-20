import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
    },
    
    
    
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'waiting', 'active', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    patientJoinedAt: { type: Date, default: null },
    doctorJoinedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null }, 
    endedAt: { type: Date, default: null },
    endedReason: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Consultation', consultationSchema);
