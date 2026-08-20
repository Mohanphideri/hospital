import mongoose from 'mongoose';
import { deriveLookupCode } from '../utils/appointmentLookup.js';

const appointmentSchema = new mongoose.Schema(
  {
    appointmentCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    
    
    
    
    
    
    lookupCode: {
      type: String,
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
      
      
      
      
      required: false,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    slotTime: {
      type: Date,
      
      
      required: false,
    },
    
    
    
    
    slotPosition: {
      type: Number,
      required: false,
    },
    
    
    
    estimatedTime: {
      type: Date,
      required: false,
    },
    
    
    
    
    dailyToken: {
      type: Number,
      required: false,
    },
    
    
    
    
    
    
    
    
    status: {
      type: String,
      enum: ['booked', 'in-progress', 'completed', 'cancelled', 'no-show'],
      default: 'booked',
    },
    notes: String,
    bookingSource: {
      type: String,
      enum: ['PATIENT', 'RECEPTIONIST', 'ADMIN'],
      default: 'PATIENT',
    },
    
    
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
    
    
    
    
    
    
    consultationType: {
      type: String,
      enum: ['in-person', 'online'],
      default: 'in-person',
    },
  },
  { timestamps: true }
);

appointmentSchema.pre('save', function (next) {
  if (this.isModified('appointmentCode')) {
    this.lookupCode = deriveLookupCode(this.appointmentCode);
  }
  next();
});

export default mongoose.model('Appointment', appointmentSchema);
