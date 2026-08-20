import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
    },
    email: String,
    passwordHash: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist'],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    contactNumber: String,
    photoUrl: String,
    
    
    
    signatureUrl: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    mustResetPassword: {
      type: Boolean,
      default: true,
    },

    
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },

    
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    bloodGroup: String,
    address: String,
    emergencyContactName: String,
    emergencyContactNumber: String,
    qualification: String,
    experienceYears: Number,
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    shiftTiming: {
      type: String,
      enum: ['morning', 'evening', 'night', 'rotational'],
    },
    employeeIdProof: String, 
    salary: Number,

    
    designation: String,
    degree: String,
    registrationNo: String,
    department: mongoose.Schema.Types.ObjectId,
    consultationFee: Number,

    
    leaveBalance: {
      type: Number,
      default: 12,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
