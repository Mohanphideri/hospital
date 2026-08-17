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
    // Set instead of appointmentId when this is an inpatient discharge bill.
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
    // Individual line items - medicines actually dispensed, each priced at the
    // time the bill was cut (so later inventory price changes don't rewrite history).
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
    // Doctor's consultation fee, charged whether or not the patient takes medicine.
    consultationFee: {
      type: Number,
      default: 0,
    },
    // Flat fee applied when the patient doesn't take any medicine (no line items) -
    // e.g. a simple visit/application charge.
    applicationFee: {
      type: Number,
      default: 0,
    },
    // Flat fee charged on every appointment-based bill, separate from the
    // doctor's consultation charge. Defaults to the standard ₹500 fee quoted
    // on the landing page, but stored per-bill so a historical bill keeps
    // whatever value it was actually generated with.
    appointmentFee: {
      type: Number,
      default: 500,
    },
    // Ad-hoc extra charges a receptionist adds at billing time - registration,
    // room service, ambulance, equipment usage, or a custom line. Kept as its
    // own itemized array (separate from `items`, which is medicines) so the
    // bill can show "Other charges" broken out on its own.
    otherCharges: {
      type: [
        {
          type: { type: String, required: true, trim: true },
          amount: { type: Number, required: true, default: 0 },
        },
      ],
      default: [],
    },
    // Discount applied to the subtotal. Validated at creation time to never
    // exceed the subtotal (see billingController) so totalAmount can't go negative.
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
