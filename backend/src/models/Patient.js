import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      unique: true,
      required: true,
    },
    name: String,
    age: Number,
    dob: Date,
    gender: String,
    email: String,
    address: String,
    emergencyContactName: String,
    emergencyContactPhone: String,
    
    
    
    authProvider: {
      type: String,
      enum: ['demo', 'msg91'],
      default: 'demo',
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Patient', patientSchema);
