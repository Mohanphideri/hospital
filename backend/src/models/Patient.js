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
    // How this account's phone was verified: the demo hardcoded-OTP flow, or
    // real verification via MSG91's OTP Widget. Existing patients predate
    // this field and are treated as 'demo' by the fallback in authController.
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
