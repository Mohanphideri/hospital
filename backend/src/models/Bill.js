import mongoose from 'mongoose';

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      unique: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      default: null,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
    },
    
    
    items: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        amount: Number,
      },
    ],
    medicinesTotal: {
      type: Number,
      default: 0,
    },
    
    consultationFee: {
      type: Number,
      default: 0,
    },
    
    
    applicationFee: {
      type: Number,
      default: 0,
    },
    
    
    
    
    appointmentFee: {
      type: Number,
      default: 500,
    },
    
    
    
    
    otherCharges: {
      type: [
        {
          type: { type: String, required: true, trim: true },
          amount: { type: Number, required: true, default: 0 },
        },
      ],
      default: [],
    },
    
    
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'other'],
      default: 'cash',
    },
    status: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    notes: String,
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paidAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Bill', billSchema);
