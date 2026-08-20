import Prescription from '../models/Prescription.js';
import Medicine from '../models/Medicine.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import { isFutureClinicDate } from '../utils/clinicTime.js';
import { logAudit } from '../utils/auditLog.js';
import { atomicallyDecrementStock, compensateStock } from '../utils/medicineStock.js';

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
    
    
    if (String(appointment.doctorId) !== String(doctorId)) {
      return res.status(403).json({ error: 'You can only write prescriptions for your own appointments' });
    }
    
    if (isFutureClinicDate(appointment.slotTime)) {
      return res.status(400).json({ error: "This appointment is upcoming - you can write a prescription from its scheduled day." });
    }
    
    
    
    if (appointment.status === 'booked') {
      appointment.status = 'in-progress';
      await appointment.save();
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

export const setPrescriptionFulfillment = async (req, res) => {
  try {
    const { choice } = req.body;
    if (!['hospital', 'outside'].includes(choice)) {
      return res.status(400).json({ error: "Choice must be 'hospital' or 'outside'" });
    }

    const prescription = await Prescription.findOne({
      _id: req.params.id,
      patientId: req.user._id,
    });
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    
    
    
    
    const alreadyInProgress = prescription.medicines.some((m) => m.dispenseStatus !== 'pending');
    if (alreadyInProgress && prescription.fulfillmentChoice !== choice) {
      return res.status(400).json({ error: 'This prescription is already being processed and its fulfillment choice can no longer be changed.' });
    }

    prescription.fulfillmentChoice = choice;
    prescription.fulfillmentChosenAt = new Date();
    await prescription.save();
    await prescription.populate(['appointmentId', 'patientId', 'doctorId']);

    logAudit(req, 'PRESCRIPTION_FULFILLMENT_CHOSEN', 'Prescription', prescription._id, { choice });

    res.json({ message: 'Fulfillment preference saved', prescription });
  } catch (error) {
    console.error('Set Prescription Fulfillment Error:', error);
    res.status(500).json({ error: 'Failed to save fulfillment preference' });
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

    
    
    
    
    
    
    if (prescriptionSnapshot.fulfillmentChoice === 'outside') {
      return res.status(400).json({ error: 'This patient chose to get their medicines from an outside pharmacy - this prescription cannot be dispensed here.' });
    }

    const line = prescriptionSnapshot.medicines[medicineIndex];

    
    
    
    
    
    if (line.dispenseStatus === 'dispensed') {
      return res.status(400).json({ error: 'This item has already been fully dispensed and cannot be modified again.' });
    }

    
    
    
    
    
    
    
    
    
    
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
