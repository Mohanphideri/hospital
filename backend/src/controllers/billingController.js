import Bill from '../models/Bill.js';
import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import Medicine from '../models/Medicine.js';
import { generateBillNumber } from '../utils/crypto.js';
import { logAudit } from '../utils/auditLog.js';
import { buildPrescriptionPdf } from '../utils/prescriptionPdf.js';
import { sendPrescriptionPdfEmail } from '../utils/mailer.js';

// The standard flat appointment fee quoted to patients (landing page FAQ,
// booking flow). Used as the default when a receptionist doesn't override it.
const DEFAULT_APPOINTMENT_FEE = 500;

const POPULATE_FIELDS = [
  { path: 'patientId' },
  { path: 'generatedBy', select: 'name role signatureUrl' },
  {
    path: 'appointmentId',
    populate: [{ path: 'doctorId', select: 'name consultationFee' }, { path: 'department' }],
  },
];

// Receptionist / admin: create a bill for an appointment. Either pass in the
// prescriptionId + a list of medicine line items to bill (only ones the
// pharmacist marked "available" should be sent), or omit medicines entirely
// and only charge the consultation/application fee.
export const createBill = async (req, res) => {
  try {
    const {
      appointmentId,
      prescriptionId,
      items,
      consultationFee,
      applicationFee,
      appointmentFee,
      otherCharges,
      discountAmount,
      paymentMethod,
      notes,
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ error: 'Appointment is required' });
    }

    const appointment = await Appointment.findById(appointmentId).populate('patientId');
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const existing = await Bill.findOne({ appointmentId });
    if (existing) {
      return res.status(400).json({ error: 'A bill has already been generated for this appointment' });
    }

    const prescription = await Prescription.findOne({ appointmentId }).lean();
    const lineItems = Array.isArray(items) ? items : [];
    const normalizedItems = (prescription?.medicines || [])
      .filter((it) => {
        const dispensedQuantity = Number(it.dispensedQuantity) || 0;
        return dispensedQuantity > 0 && (it.dispenseStatus === 'dispensed' || it.dispenseStatus === 'partially-dispensed' || it.dispenseStatus === 'ready');
      })
      .map((it) => {
        const quantity = Math.min(Number(it.dispensedQuantity) || 0, Number(it.quantity) || 0);
        const unitPrice = Number(it.dispensedPrice) || 0;
        return {
          description: `${it.name}${it.dosage ? ` (${it.dosage})` : ''}`,
          quantity,
          unitPrice,
          amount: quantity * unitPrice,
        };
      })
      .filter((it) => it.quantity > 0 && it.unitPrice > 0);

    if (lineItems.length > 0 && normalizedItems.length === 0) {
      const fallbackItems = lineItems
        .filter((it) => it && it.description)
        .map((it) => {
          const quantity = Number(it.quantity) || 1;
          const unitPrice = Number(it.unitPrice) || 0;
          return {
            description: it.description,
            quantity,
            unitPrice,
            amount: quantity * unitPrice,
          };
        });
      normalizedItems.push(...fallbackItems);
    }

    // Other charges: dynamic itemized rows (registration, room service,
    // ambulance, equipment usage, or a custom label) - each validated to have
    // a real type/amount before being stored.
    const normalizedOtherCharges = (Array.isArray(otherCharges) ? otherCharges : [])
      .filter((c) => c && c.type && String(c.type).trim())
      .map((c) => ({ type: String(c.type).trim(), amount: Math.max(0, Number(c.amount) || 0) }));

    const medicinesTotal = normalizedItems.reduce((sum, it) => sum + it.amount, 0);
    const fee = Number(consultationFee) || 0;
    // Application/visit fee only makes sense when the patient isn't taking any medicine.
    const flatFee = normalizedItems.length === 0 ? Number(applicationFee) || 0 : 0;
    const apptFee =
      appointmentFee !== undefined && appointmentFee !== null && appointmentFee !== ''
        ? Math.max(0, Number(appointmentFee) || 0)
        : DEFAULT_APPOINTMENT_FEE;
    const otherChargesTotal = normalizedOtherCharges.reduce((sum, c) => sum + c.amount, 0);

    const subtotal = apptFee + fee + medicinesTotal + flatFee + otherChargesTotal;

    const discount = Math.max(0, Number(discountAmount) || 0);
    if (discount > subtotal) {
      return res.status(400).json({ error: 'Discount cannot exceed the bill subtotal' });
    }

    const totalAmount = Math.max(0, subtotal - discount);

    let billNumber = generateBillNumber();
    while (await Bill.findOne({ billNumber })) {
      billNumber = generateBillNumber();
    }

    const bill = await Bill.create({
      billNumber,
      appointmentId,
      patientId: appointment.patientId._id,
      prescriptionId: prescriptionId || null,
      items: normalizedItems,
      medicinesTotal,
      consultationFee: fee,
      applicationFee: flatFee,
      appointmentFee: apptFee,
      otherCharges: normalizedOtherCharges,
      discountAmount: discount,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      status: 'unpaid',
      notes: notes || '',
      generatedBy: req.user._id,
    });

    if (prescription && prescription._id && normalizedItems.length > 0) {
      await Prescription.updateOne(
        { _id: prescription._id },
        {
          $set: {
            'medicines.$[elem].billId': bill._id,
          },
        },
        {
          arrayFilters: [{ 'elem.dispensedQuantity': { $gt: 0 } }],
        }
      );
    }

    await bill.populate(POPULATE_FIELDS);

    logAudit(req, 'BILL_CREATED', 'Bill', bill._id, { totalAmount, appointmentId });

    // Fire-and-forget: email the patient their prescription (PDF, password-
    // protected with the last 4 digits of their registered mobile number) as
    // soon as a bill exists for it. Never awaited and every internal step is
    // try/caught inside sendPrescriptionPdfEmail, so a PDF-build failure or a
    // Brevo outage can never fail bill generation itself - the response
    // below goes out regardless.
    if (prescription?._id && appointment.patientId?.email) {
      Prescription.findById(prescription._id)
        .populate('doctorId', 'name designation degree registrationNo')
        .populate('patientId', 'name age gender phone')
        .then(async (populatedPrescription) => {
          if (!populatedPrescription) return;
          const { bytes } = await buildPrescriptionPdf({
            prescription: populatedPrescription,
            appointment,
            billNumber: bill.billNumber,
          });
          await sendPrescriptionPdfEmail(appointment.patientId.email, {
            patientName: appointment.patientId.name,
            appointmentCode: appointment.appointmentCode,
            billNumber: bill.billNumber,
            pdfBytes: bytes,
            fileName: `HeartStone-Prescription-${bill.billNumber}.pdf`,
          });
        })
        .catch((err) => console.error('Prescription PDF Email Error:', err.message));
    }

    res.status(201).json({ message: 'Bill generated successfully', bill });
  } catch (error) {
    console.error('Create Bill Error:', error);
    res.status(500).json({ error: 'Failed to generate bill' });
  }
};

// Receptionist / admin: list bills, optionally filtered.
export const getBills = async (req, res) => {
  try {
    const { status, appointmentCode, patientId, from, to } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;

    if (appointmentCode) {
      const appointment = await Appointment.findOne({
        appointmentCode: appointmentCode.trim().toUpperCase(),
      });
      if (!appointment) return res.json([]);
      filter.appointmentId = appointment._id;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const bills = await Bill.find(filter).populate(POPULATE_FIELDS).sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    console.error('Get Bills Error:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
};

// Patient: list bills belonging to the logged-in patient.
export const getMyBills = async (req, res) => {
  try {
    const bills = await Bill.find({ patientId: req.user._id })
      .populate(POPULATE_FIELDS)
      .sort({ createdAt: -1 });

    res.json(bills);
  } catch (error) {
    console.error('Get My Bills Error:', error);
    res.status(500).json({ error: 'Failed to fetch your bills' });
  }
};

// Receptionist / admin: fetch the medicines available to bill for
// a given appointment (pulls the prescription, if any, filtered to items the
// pharmacist has already marked "available").
export const getBillableItems = async (req, res) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();
    const appointment = await Appointment.findOne({ appointmentCode: code })
      .populate('patientId')
      .populate('doctorId')
      .populate('department');

    if (!appointment) {
      return res.status(404).json({ error: 'No appointment found for that code' });
    }

    const existingBill = await Bill.findOne({ appointmentId: appointment._id });
    const prescription = await Prescription.findOne({ appointmentId: appointment._id }).lean();

    // Auto-fill each prescribed medicine's price from the pharmacy inventory
    // (FEFO batch price) so the receptionist never has to type it in by hand.
    // If a medicine can't be found (deleted from inventory, bad id), fall back
    // to 0 and flag it rather than guessing a price.
    let prescriptionWithPricing = prescription;
    if (prescription && Array.isArray(prescription.medicines) && prescription.medicines.length) {
      prescriptionWithPricing = {
        ...prescription,
        medicines: prescription.medicines.map((m) => {
          const prescribedQuantity = Number(m.quantity) || 0;
          const dispensedQuantity = Number(m.dispensedQuantity) || 0;
          const unitPrice = Number(m.dispensedPrice) || 0;
          const billableQuantity = Math.max(0, Math.min(dispensedQuantity, prescribedQuantity));
          const amount = billableQuantity * unitPrice;
          const status = String(m.dispenseStatus || '').toLowerCase();
          const isBillable = billableQuantity > 0 && unitPrice > 0 && (status === 'dispensed' || status === 'partially-dispensed' || status === 'ready');
          return {
            ...m,
            prescribedQuantity,
            dispensedQuantity: billableQuantity,
            unitPrice,
            amount,
            isBillable,
            displayStatus: isBillable ? 'Ready to bill' : (status === 'dispensed' || status === 'partially-dispensed' ? 'Pending price' : 'Not dispensed'),
          };
        }),
      };
    }

    res.json({
      appointment,
      prescription: prescriptionWithPricing,
      alreadyBilled: !!existingBill,
      bill: existingBill,
    });
  } catch (error) {
    console.error('Get Billable Items Error:', error);
    res.status(500).json({ error: 'Failed to fetch billing details' });
  }
};

// Receptionist / admin: mark a bill as paid (records payment method too).
export const markBillPaid = async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    const updates = { status: 'paid', paidAt: new Date() };
    if (paymentMethod) updates.paymentMethod = paymentMethod;

    const bill = await Bill.findByIdAndUpdate(req.params.id, updates, { new: true }).populate(
      POPULATE_FIELDS
    );

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json({ message: 'Bill marked as paid', bill });
  } catch (error) {
    console.error('Mark Bill Paid Error:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
};
