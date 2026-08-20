import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
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
    medicines: [
      {
        medicineId: mongoose.Schema.Types.ObjectId,
        name: String,
        dosage: String,
        quantity: Number,
        availability: {
          type: String,
          enum: ['pending', 'available', 'unavailable'],
          default: 'pending',
        },
        dispenseStatus: {
          type: String,
          enum: ['pending', 'ready', 'partially-dispensed', 'dispensed', 'not-dispensed'],
          default: 'pending',
        },
        dispensedQuantity: {
          type: Number,
          default: 0,
        },
        dispensedPrice: {
          type: Number,
          default: 0,
        },
        dispensedAt: Date,
        billId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Bill',
          default: null,
        },
      },
    ],
    
    
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // Where the patient wants to obtain the prescribed medicines - the
    // hospital must never force a purchase from its own pharmacy. 'pending'
    
    
    
    
    
    fulfillmentChoice: {
      type: String,
      enum: ['pending', 'hospital', 'outside'],
      default: 'pending',
    },
    fulfillmentChosenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Prescription', prescriptionSchema);
