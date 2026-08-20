import mongoose from 'mongoose';

const deliveryAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// One line item this order actually claimed stock for. Kept separate from
// `unavailableItems` below so a patient's explicit partial-fulfillment

const orderItemSchema = new mongoose.Schema(
  {
    prescriptionMedicineIndex: { type: Number, required: true },
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    name: { type: String, required: true },
    dosage: String,
    quantity: { type: Number, required: true, min: 1 },
    
    
    
    
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true },
    
    
    stockClaims: [
      {
        _id: false,
        batchId: mongoose.Schema.Types.ObjectId,
        taken: Number,
      },
    ],
  },
  { _id: false }
);

const unavailableItemSchema = new mongoose.Schema(
  {
    prescriptionMedicineIndex: { type: Number, required: true },
    name: { type: String, required: true },
    dosage: String,
    requestedQuantity: Number,
    reason: { type: String, default: 'Not enough stock' },
  },
  { _id: false }
);

const STATUS_VALUES = [
  'pending', 
  'confirmed', 
  'preparing',
  'ready-for-pickup', 
  'dispensed', 
  'ready-for-dispatch', 
  'out-for-delivery', 
  'delivered', 
  'cancelled',
  'failed-delivery', 
];

const pharmacyOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },

    items: { type: [orderItemSchema], default: [] },
    unavailableItems: { type: [unavailableItemSchema], default: [] },

    medicineSubtotal: { type: Number, required: true, default: 0 },
    deliveryMethod: { type: String, enum: ['pickup', 'delivery'], required: true },
    deliveryFee: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    finalTotal: { type: Number, required: true, default: 0 },

    
    deliveryAddress: { type: deliveryAddressSchema, default: null },

    status: { type: String, enum: STATUS_VALUES, default: 'pending' },
    statusHistory: {
      type: [
        {
          _id: false,
          status: String,
          at: { type: Date, default: Date.now },
          by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        },
      ],
      default: [],
    },

    paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'other'], default: 'cash' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    paidAt: { type: Date, default: null },

    cancelReason: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('PharmacyOrder', pharmacyOrderSchema);
export { STATUS_VALUES as PHARMACY_ORDER_STATUS_VALUES };
