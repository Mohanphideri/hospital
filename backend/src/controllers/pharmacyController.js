import Prescription from '../models/Prescription.js';
import Medicine from '../models/Medicine.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import { isFutureClinicDate } from '../utils/clinicTime.js';
import { logAudit } from '../utils/auditLog.js';

// --- Atomic stock decrement -------------------------------------------
// The previous implementation read a medicine's batches into memory,
// mutated `.quantity` on the objects, and called `medicine.save()` once.
// Two concurrent dispense requests against the same medicine (even for two
// different prescriptions) could both read the same stock level, both
// decide there's enough, both compute a new figure client-side, and
// whichever `save()` lands second silently overwrites the first one's
// decrement - stock effectively "loses" one of the two deductions and can
// end up over-reported (or, with different batch math, negative). This
// closes that by decrementing each batch with a single atomic, conditional
// MongoDB update (`$inc` gated on the batch still having enough quantity at
// write time), retrying against a fresh read if another request wins the
// race in between.
const MAX_STOCK_RETRY_ATTEMPTS = 5;

async function compensateStock(claims) {
  for (const claim of claims) {
    await Medicine.updateOne(
      { _id: claim.medicineId, 'batches._id': claim.batchId },
      { $inc: { 'batches.$.quantity': claim.taken } }
    ).catch((err) =>
      console.error(
        'CRITICAL: stock compensation failed after a partial dispense - manual inventory review needed:',
        claim,
        err.message
      )
    );
  }
}

// Attempts to atomically decrement `neededQuantity` units of `medicineId`
// across its unexpired batches (earliest-expiring first). Returns
// `{ claims }` on success (claims can be used to roll back via
// compensateStock), or `{ error, status }` on failure.
async function atomicallyDecrementStock(medicineId, neededQuantity) {
  for (let attempt = 0; attempt < MAX_STOCK_RETRY_ATTEMPTS; attempt++) {
    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return { error: 'Linked medicine not found in inventory', status: 404 };
    }

    const now = new Date();
    const usableBatches = medicine.batches
      .filter((b) => b.expiryDate >= now && b.quantity > 0)
      .sort((a, b) => a.expiryDate - b.expiryDate);
    const totalAvailable = usableBatches.reduce((sum, b) => sum + b.quantity, 0);

    if (totalAvailable < neededQuantity) {
      return {
        error: `Not enough stock: need ${neededQuantity}, only ${totalAvailable} available across unexpired batches`,
        status: 400,
      };
    }

    let remaining = neededQuantity;
    const claims = [];
    let lostRace = false;

    for (const batch of usableBatches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantity, remaining);

      const result = await Medicine.updateOne(
        { _id: medicineId, 'batches._id': batch._id, 'batches.quantity': { $gte: take } },
        { $inc: { 'batches.$.quantity': -take } }
      );

      if (result.modifiedCount !== 1) {
        // Someone else decremented this exact batch between our read and
        // this write - stop, undo whatever we already claimed this
        // attempt, and retry the whole thing from a fresh read.
        lostRace = true;
        break;
      }

      claims.push({ medicineId, batchId: batch._id, taken: take, price: batch.price });
      remaining -= take;
    }

    if (!lostRace && remaining === 0) {
      return { claims };
    }

    if (claims.length) {
      await compensateStock(claims);
    }
    // loop again with a fresh read
  }

  return {
    error: 'Stock levels changed too many times while processing this request - please try again.',
    status: 409,
  };
}

export const createPrescription = async (req, res) => {
  try {
    const { appointmentId, medicines, notes } = req.body;
    const doctorId = req.user._id;

    if (!appointmentId || !medicines || medicines.length === 0) {
      return res.status(400).json({ error: 'Appointment and medicines are required' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    // A doctor may only write a prescription for their own appointment - never
    // trust a client-supplied patientId/doctorId for this.
    if (String(appointment.doctorId) !== String(doctorId)) {
      return res.status(403).json({ error: 'You can only write prescriptions for your own appointments' });
    }
    // Can't prescribe for a visit that hasn't happened yet.
    if (isFutureClinicDate(appointment.slotTime)) {
      return res.status(400).json({ error: "This appointment is upcoming - you can write a prescription from its scheduled day." });
    }

    const prescription = await Prescription.create({
      appointmentId,
      patientId: appointment.patientId,
      doctorId,
      medicines,
      notes: (notes || '').trim(),
    });

    await prescription.populate(['appointmentId', 'patientId', 'doctorId']);

    logAudit(req, 'PRESCRIPTION_CREATED', 'Prescription', prescription._id, { appointmentId });

    res.status(201).json({
      message: 'Prescription created successfully',
      prescription,
    });
  } catch (error) {
    console.error('Create Prescription Error:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
};

export const getPrescriptions = async (req, res) => {
  try {
    const { patientId, appointmentId, appointmentCode, patientName, doctorId } = req.query;
    let filter = {};

    if (patientId) filter.patientId = patientId;
    if (appointmentId) filter.appointmentId = appointmentId;
    if (doctorId) filter.doctorId = doctorId;

    // Human-readable appointment code (e.g. APT-260723-4F2K) -> resolve to its ObjectId
    if (appointmentCode) {
      const appointment = await Appointment.findOne({
        appointmentCode: appointmentCode.trim().toUpperCase(),
      });
      if (!appointment) {
        return res.json([]);
      }
      filter.appointmentId = appointment._id;
    }

    const prescriptions = await Prescription.find(filter)
      .populate(['appointmentId', 'patientId', 'doctorId']);

    // If searching by patient name, filter results
    let results = prescriptions;
    if (patientName) {
      results = prescriptions.filter((p) =>
        p.patientId.name.toLowerCase().includes(patientName.toLowerCase())
      );
    }

    res.json(results);
  } catch (error) {
    console.error('Get Prescriptions Error:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

export const getMyPrescriptions = async (req, res) => {
  try {
    const patientId = req.user._id;

    const prescriptions = await Prescription.find({ patientId })
      .populate(['appointmentId', 'doctorId'])
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    console.error('Get My Prescriptions Error:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

export const updateMedicineAvailability = async (req, res) => {
  try {
    const { medicineIndex, availability, medicineId, dispensedQuantity, dispenseStatus } = req.body;
    const prescriptionId = req.params.id;

    const prescriptionSnapshot = await Prescription.findById(prescriptionId);

    if (!prescriptionSnapshot) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (medicineIndex < 0 || medicineIndex >= prescriptionSnapshot.medicines.length) {
      return res.status(400).json({ error: 'Invalid medicine index' });
    }

    const line = prescriptionSnapshot.medicines[medicineIndex];

    // Closed-record rule (same principle as cancelled appointments/finalized
    // bills): once a line has been fully dispensed, it's done. This is what
    // actually stops a double-dispense - disabling the button client-side
    // does nothing against a direct API call or two rapid clicks racing
    // each other.
    if (line.dispenseStatus === 'dispensed') {
      return res.status(400).json({ error: 'This item has already been fully dispensed and cannot be modified again.' });
    }

    // Medicine identity and price are never taken at face value from the
    // client. A prescription line is written by the doctor as free text
    // (name/dosage/quantity only) and has no medicineId until a pharmacist
    // links it to an actual catalog item on first dispense - that one-time
    // link is a legitimate pharmacist action, so a client-supplied
    // medicineId is accepted *only* while the line is still unlinked. Once
    // a line has been linked to a real inventory medicine, that link is
    // authoritative and permanent: a later request can no longer swap it
    // for a different medicineId, even if the browser sends one - it must
    // match what's already on record.
    let resolvedMedicineId = line.medicineId;
    if (!resolvedMedicineId) {
      if (!medicineId) {
        return res.status(400).json({ error: 'This prescription line is not yet linked to an inventory medicine - select one to dispense against.' });
      }
      resolvedMedicineId = medicineId;
    } else if (medicineId && String(medicineId) !== String(resolvedMedicineId)) {
      return res.status(400).json({ error: 'Requested medicine does not match the prescribed line - dispensing rejected.' });
    }

    const prescribedQuantity = Number(line.quantity) || 0;
    const normalizedStatus = String(dispenseStatus || availability || 'pending').toLowerCase();
    let finalDispensedQuantity = Number(dispensedQuantity ?? 0);

    if (normalizedStatus === 'dispensed') {
      finalDispensedQuantity = prescribedQuantity > 0 ? prescribedQuantity : finalDispensedQuantity;
    } else if (normalizedStatus === 'partially-dispensed') {
      finalDispensedQuantity = Math.max(0, Math.min(finalDispensedQuantity || 0, prescribedQuantity));
    } else if (normalizedStatus === 'not-dispensed' || normalizedStatus === 'pending' || normalizedStatus === 'ready') {
      finalDispensedQuantity = 0;
    }

    if (finalDispensedQuantity > prescribedQuantity) {
      return res.status(400).json({ error: 'Dispensed quantity cannot exceed the prescribed quantity' });
    }

    let stockClaims = [];
    // Price is never accepted from the client - it's derived from the
    // authoritative per-batch inventory price at the moment stock is
    // actually decremented (a quantity-weighted average across whichever
    // batches supplied the dispensed units), never from browser input. If
    // nothing is being dispensed on this call, the previously recorded
    // price (if any) is left untouched rather than reset.
    let finalPrice = Number(line.dispensedPrice) || 0;
    if (finalDispensedQuantity > 0) {
      const claimResult = await atomicallyDecrementStock(resolvedMedicineId, finalDispensedQuantity);
      if (claimResult.error) {
        return res.status(claimResult.status).json({ error: claimResult.error });
      }
      stockClaims = claimResult.claims;
      const totalCost = stockClaims.reduce((sum, c) => sum + c.taken * c.price, 0);
      finalPrice = totalCost / finalDispensedQuantity;
    }

    const setFields = {
      [`medicines.${medicineIndex}.availability`]: finalDispensedQuantity > 0 ? 'available' : 'unavailable',
      [`medicines.${medicineIndex}.dispenseStatus`]: normalizedStatus,
      [`medicines.${medicineIndex}.dispensedQuantity`]: finalDispensedQuantity,
      [`medicines.${medicineIndex}.dispensedPrice`]: finalPrice,
    };
    if (resolvedMedicineId) {
      setFields[`medicines.${medicineIndex}.medicineId`] = resolvedMedicineId;
    }
    if (finalDispensedQuantity > 0) {
      setFields[`medicines.${medicineIndex}.dispensedAt`] = new Date();
    } else if (normalizedStatus === 'not-dispensed' || normalizedStatus === 'pending') {
      setFields[`medicines.${medicineIndex}.dispensedAt`] = null;
    }

    // Atomically claim this exact line: the query re-asserts it's still not
    // 'dispensed' at write time, closing the window between our read above
    // and this write (two concurrent requests targeting the same line will
    // never both succeed). It also re-asserts the medicineId link hasn't
    // changed since our read - closing a narrower race where two concurrent
    // "first dispense" requests each try to link the same still-unlinked
    // line to a different catalog medicine; only one wins, and the loser's
    // stock claim is rolled back below rather than silently linking to
    // whichever medicine happened to save last.
    const updated = await Prescription.findOneAndUpdate(
      {
        _id: prescriptionId,
        [`medicines.${medicineIndex}.dispenseStatus`]: { $ne: 'dispensed' },
        [`medicines.${medicineIndex}.medicineId`]: line.medicineId || null,
      },
      { $set: setFields },
      { new: true }
    ).populate(['appointmentId', 'patientId', 'doctorId']);

    if (!updated) {
      // Someone else finished dispensing this exact line first - undo any
      // stock we just claimed so it isn't double-deducted.
      if (stockClaims.length) {
        await compensateStock(stockClaims);
      }
      return res.status(409).json({ error: 'This item was just dispensed by someone else - please refresh and try again.' });
    }

    logAudit(req, 'PRESCRIPTION_DISPENSED', 'Prescription', updated._id, {
      medicineIndex,
      medicineId: resolvedMedicineId,
      dispenseStatus: normalizedStatus,
      dispensedQuantity: finalDispensedQuantity,
      unitPrice: finalPrice,
      stockClaims,
    });

    res.json({
      message: 'Medicine dispensing updated',
      prescription: updated,
    });
  } catch (error) {
    console.error('Update Medicine Availability Error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
};

// Pharmacist: add a brand new medicine to the catalog, with its first batch.
export const addMedicine = async (req, res) => {
  try {
    const { name, unit, batchNumber, quantity, price, expiryDate } = req.body;

    if (!name || !batchNumber || !quantity || !price || !expiryDate) {
      return res
        .status(400)
        .json({ error: 'Name, batch number, quantity, price, and expiry date are required' });
    }

    const medicine = await Medicine.create({
      name,
      unit: unit || 'tablets',
      batches: [
        {
          batchNumber,
          quantity,
          price,
          expiryDate: new Date(expiryDate),
        },
      ],
    });

    logAudit(req, 'MEDICINE_ADDED', 'Medicine', medicine._id, { name });

    res.status(201).json({
      message: 'Medicine added successfully',
      medicine,
    });
  } catch (error) {
    console.error('Add Medicine Error:', error);
    res.status(500).json({ error: 'Failed to add medicine' });
  }
};

// Pharmacist: restock an existing medicine by adding a new batch/lot.
export const addMedicineBatch = async (req, res) => {
  try {
    const { batchNumber, quantity, price, expiryDate } = req.body;

    if (!batchNumber || !quantity || !price || !expiryDate) {
      return res
        .status(400)
        .json({ error: 'Batch number, quantity, price, and expiry date are required' });
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    medicine.batches.push({
      batchNumber,
      quantity,
      price,
      expiryDate: new Date(expiryDate),
    });
    await medicine.save();

    logAudit(req, 'MEDICINE_BATCH_ADDED', 'Medicine', medicine._id, { batchNumber, quantity });

    res.status(201).json({ message: 'Batch added successfully', medicine });
  } catch (error) {
    console.error('Add Medicine Batch Error:', error);
    res.status(500).json({ error: 'Failed to add batch' });
  }
};

export const getMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ name: 1 });
    res.json(medicines);
  } catch (error) {
    console.error('Get Medicines Error:', error);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
};

// Pharmacist / receptionist: batches across every medicine that are running
// low or expiring soon, so restocking/disposal decisions are actionable.
export const getExpiringBatches = async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const now = new Date();

    const medicines = await Medicine.find();
    const expiring = [];
    const expired = [];

    for (const med of medicines) {
      for (const batch of med.batches) {
        if (batch.quantity <= 0) continue;
        if (batch.expiryDate < now) {
          expired.push({ medicineId: med._id, medicineName: med.name, unit: med.unit, batch });
        } else if (batch.expiryDate <= cutoff) {
          expiring.push({ medicineId: med._id, medicineName: med.name, unit: med.unit, batch });
        }
      }
    }

    expiring.sort((a, b) => a.batch.expiryDate - b.batch.expiryDate);
    expired.sort((a, b) => a.batch.expiryDate - b.batch.expiryDate);

    res.json({ expiring, expired, windowDays: days });
  } catch (error) {
    console.error('Get Expiring Batches Error:', error);
    res.status(500).json({ error: 'Failed to fetch expiring batches' });
  }
};

// Pharmacist: edit the medicine's name/unit (not stock - use addMedicineBatch
// for restocking, or updateMedicineBatch to correct a specific batch).
export const updateMedicine = async (req, res) => {
  try {
    const { name, unit } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (unit !== undefined) updates.unit = unit;

    const medicine = await Medicine.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    res.json({
      message: 'Medicine updated successfully',
      medicine,
    });
  } catch (error) {
    console.error('Update Medicine Error:', error);
    res.status(500).json({ error: 'Failed to update medicine' });
  }
};

// Pharmacist: correct a specific batch's quantity/price/expiry (e.g. a data-entry fix).
export const updateMedicineBatch = async (req, res) => {
  try {
    const { quantity, price, expiryDate } = req.body;

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const batch = medicine.batches.id(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (quantity !== undefined) batch.quantity = quantity;
    if (price !== undefined) batch.price = price;
    if (expiryDate !== undefined) batch.expiryDate = new Date(expiryDate);

    await medicine.save();

    logAudit(req, 'MEDICINE_BATCH_UPDATED', 'Medicine', medicine._id, { batchId: req.params.batchId });

    res.json({ message: 'Batch updated successfully', medicine });
  } catch (error) {
    console.error('Update Medicine Batch Error:', error);
    res.status(500).json({ error: 'Failed to update batch' });
  }
};

export const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    logAudit(req, 'MEDICINE_DELETED', 'Medicine', req.params.id, { name: medicine.name });

    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    console.error('Delete Medicine Error:', error);
    res.status(500).json({ error: 'Failed to delete medicine' });
  }
};
