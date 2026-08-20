import Ward from '../models/Ward.js';
import Admission from '../models/Admission.js';
import Bill from '../models/Bill.js';
import { generateBillNumber } from '../utils/crypto.js';
import { logAudit } from '../utils/auditLog.js';

async function claimBed(wardId, bedId) {
  return Ward.findOneAndUpdate(
    { _id: wardId, 'beds._id': bedId, 'beds.status': 'vacant' },
    { $set: { 'beds.$.status': 'occupied' } },
    { new: true }
  );
}

async function releaseBed(wardId, bedId) {
  
  
  
  
  return Ward.findOneAndUpdate(
    { _id: wardId, 'beds._id': bedId },
    { $set: { 'beds.$.status': 'vacant' } },
    { new: true }
  );
}

export const createWard = async (req, res) => {
  try {
    const { name, department, type, floor, beds } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Ward name is required' });
    }

    const ward = await Ward.create({
      name,
      department: department || undefined,
      type: type || 'general',
      floor,
      beds: Array.isArray(beds) ? beds : [],
    });

    logAudit(req, 'WARD_CREATED', 'Ward', ward._id, { name });

    res.status(201).json({ message: 'Ward created', ward });
  } catch (error) {
    console.error('Create Ward Error:', error);
    res.status(500).json({ error: 'Failed to create ward' });
  }
};

export const addBed = async (req, res) => {
  try {
    const { bedNumber, dailyCharge, careLevel } = req.body;
    if (!bedNumber || dailyCharge === undefined) {
      return res.status(400).json({ error: 'Bed number and daily charge are required' });
    }
    if (careLevel && !['normal', 'critical'].includes(careLevel)) {
      return res.status(400).json({ error: 'Care level must be normal or critical' });
    }

    const ward = await Ward.findById(req.params.id);
    if (!ward) return res.status(404).json({ error: 'Ward not found' });

    ward.beds.push({ bedNumber, dailyCharge, status: 'vacant', careLevel: careLevel || 'normal' });
    await ward.save();

    logAudit(req, 'BED_ADDED', 'Ward', ward._id, { bedNumber });

    res.status(201).json({ message: 'Bed added', ward });
  } catch (error) {
    console.error('Add Bed Error:', error);
    res.status(500).json({ error: 'Failed to add bed' });
  }
};

export const updateWard = async (req, res) => {
  try {
    const { name, department, type, floor } = req.body;
    const ward = await Ward.findById(req.params.id);
    if (!ward) return res.status(404).json({ error: 'Ward not found' });

    if (name !== undefined) ward.name = name;
    if (type !== undefined) ward.type = type;
    if (floor !== undefined) ward.floor = floor;
    if (department !== undefined) ward.department = department || undefined;

    await ward.save();
    res.json({ message: 'Ward updated', ward });
  } catch (error) {
    console.error('Update Ward Error:', error);
    res.status(500).json({ error: 'Failed to update ward' });
  }
};

export const updateBed = async (req, res) => {
  try {
    const { bedNumber, dailyCharge, careLevel } = req.body;
    if (careLevel && !['normal', 'critical'].includes(careLevel)) {
      return res.status(400).json({ error: 'Care level must be normal or critical' });
    }

    const ward = await Ward.findById(req.params.id);
    if (!ward) return res.status(404).json({ error: 'Ward not found' });

    const bed = ward.beds.id(req.params.bedId);
    if (!bed) return res.status(404).json({ error: 'Bed not found' });

    if (bedNumber !== undefined) bed.bedNumber = bedNumber;
    if (dailyCharge !== undefined) bed.dailyCharge = dailyCharge;
    if (careLevel !== undefined) bed.careLevel = careLevel;

    await ward.save();
    res.json({ message: 'Bed updated', ward });
  } catch (error) {
    console.error('Update Bed Error:', error);
    res.status(500).json({ error: 'Failed to update bed' });
  }
};

export const deleteBed = async (req, res) => {
  try {
    const wardCheck = await Ward.findById(req.params.id);
    if (!wardCheck) return res.status(404).json({ error: 'Ward not found' });
    const bedCheck = wardCheck.beds.id(req.params.bedId);
    if (!bedCheck) return res.status(404).json({ error: 'Bed not found' });

    
    
    
    const result = await Ward.updateOne(
      { _id: req.params.id, beds: { $elemMatch: { _id: req.params.bedId, status: { $ne: 'occupied' } } } },
      { $pull: { beds: { _id: req.params.bedId } } }
    );
    if (result.modifiedCount === 0) {
      return res.status(409).json({ error: 'That bed was just occupied - discharge or transfer the patient first' });
    }

    const ward = await Ward.findById(req.params.id);
    logAudit(req, 'BED_DELETED', 'Ward', req.params.id, { bedId: req.params.bedId });

    res.json({ message: 'Bed removed', ward });
  } catch (error) {
    console.error('Delete Bed Error:', error);
    res.status(500).json({ error: 'Failed to remove bed' });
  }
};

export const deleteWard = async (req, res) => {
  try {
    const ward = await Ward.findById(req.params.id);
    if (!ward) return res.status(404).json({ error: 'Ward not found' });
    if (ward.beds.length > 0) {
      return res.status(400).json({ error: 'Remove all beds from this ward before deleting it' });
    }

    await ward.deleteOne();
    logAudit(req, 'WARD_DELETED', 'Ward', req.params.id, { name: ward.name });
    res.json({ message: 'Ward removed' });
  } catch (error) {
    console.error('Delete Ward Error:', error);
    res.status(500).json({ error: 'Failed to remove ward' });
  }
};

export const getWards = async (req, res) => {
  try {
    const wards = await Ward.find().populate('department').sort({ name: 1 });
    res.json(wards);
  } catch (error) {
    console.error('Get Wards Error:', error);
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
};

export const updateBedStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['vacant', 'maintenance'].includes(status)) {
      return res.status(400).json({ error: 'Status must be vacant or maintenance (occupancy is set via admission/discharge)' });
    }

    const wardCheck = await Ward.findById(req.params.id);
    if (!wardCheck) return res.status(404).json({ error: 'Ward not found' });
    const bedCheck = wardCheck.beds.id(req.params.bedId);
    if (!bedCheck) return res.status(404).json({ error: 'Bed not found' });

    
    
    
    
    const ward = await Ward.findOneAndUpdate(
      { _id: req.params.id, 'beds._id': req.params.bedId, 'beds.status': { $ne: 'occupied' } },
      { $set: { 'beds.$.status': status } },
      { new: true }
    );
    if (!ward) {
      return res.status(409).json({ error: 'That bed was just occupied - cannot change its status now.' });
    }

    logAudit(req, 'BED_STATUS_UPDATED', 'Ward', ward._id, { bedId: req.params.bedId, status });

    res.json({ message: 'Bed status updated', ward });
  } catch (error) {
    console.error('Update Bed Status Error:', error);
    res.status(500).json({ error: 'Failed to update bed status' });
  }
};

const POPULATE_ADMISSION = [
  { path: 'patientId' },
  { path: 'admittingDoctorId', select: 'name' },
  { path: 'admittedBy', select: 'name role' },
  { path: 'wardId' },
];

export const admitPatient = async (req, res) => {
  try {
    const { patientId, wardId, bedId, admittingDoctorId, reasonForAdmission, diagnosis, originatingAppointmentId } = req.body;

    if (!patientId || !wardId || !bedId || !admittingDoctorId || !reasonForAdmission) {
      return res.status(400).json({
        error: 'Patient, ward, bed, admitting doctor, and reason for admission are required',
      });
    }

    
    
    const wardCheck = await Ward.findById(wardId);
    if (!wardCheck) return res.status(404).json({ error: 'Ward not found' });
    const bedCheck = wardCheck.beds.id(bedId);
    if (!bedCheck) return res.status(404).json({ error: 'Bed not found' });

    const claimedWard = await claimBed(wardId, bedId);
    if (!claimedWard) {
      
      
      return res.status(409).json({ error: `Bed ${bedCheck.bedNumber} was just taken - please pick another bed.` });
    }

    let admission;
    try {
      admission = await Admission.create({
        patientId,
        wardId,
        bedId,
        admittingDoctorId,
        originatingAppointmentId: originatingAppointmentId || null,
        reasonForAdmission,
        diagnosis,
        admittedBy: req.user._id,
      });
    } catch (err) {
      
      
      
      
      await releaseBed(wardId, bedId).catch((releaseErr) =>
        console.error('CRITICAL: failed to release bed after admission create failure - manual fix needed:', wardId, bedId, releaseErr.message)
      );
      throw err;
    }

    await admission.populate(POPULATE_ADMISSION);

    logAudit(req, 'PATIENT_ADMITTED', 'Admission', admission._id, { patientId, wardId, bedId });

    res.status(201).json({ message: 'Patient admitted', admission });
  } catch (error) {
    console.error('Admit Patient Error:', error);
    res.status(500).json({ error: 'Failed to admit patient' });
  }
};

export const getAdmissions = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const admissions = await Admission.find(filter).populate(POPULATE_ADMISSION).sort({ admissionDate: -1 });
    res.json(admissions);
  } catch (error) {
    console.error('Get Admissions Error:', error);
    res.status(500).json({ error: 'Failed to fetch admissions' });
  }
};

export const getAdmissionById = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id).populate(POPULATE_ADMISSION);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    res.json(admission);
  } catch (error) {
    console.error('Get Admission Error:', error);
    res.status(500).json({ error: 'Failed to fetch admission' });
  }
};

export const transferBed = async (req, res) => {
  try {
    const { toWardId, toBedId, reason } = req.body;
    if (!toWardId || !toBedId) {
      return res.status(400).json({ error: 'Destination ward and bed are required' });
    }

    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    if (admission.status !== 'admitted') {
      return res.status(400).json({ error: 'Only an active admission can be transferred' });
    }

    const toWardCheck = await Ward.findById(toWardId);
    if (!toWardCheck) return res.status(404).json({ error: 'Destination ward not found' });
    const toBedCheck = toWardCheck.beds.id(toBedId);
    if (!toBedCheck) return res.status(404).json({ error: 'Destination bed not found' });

    
    
    
    const claimedToWard = await claimBed(toWardId, toBedId);
    if (!claimedToWard) {
      return res.status(409).json({ error: `Bed ${toBedCheck.bedNumber} was just taken - please pick another bed.` });
    }

    
    
    
    try {
      await releaseBed(admission.wardId, admission.bedId);
    } catch (err) {
      
      
      
      await Ward.findOneAndUpdate(
        { _id: toWardId, 'beds._id': toBedId },
        { $set: { 'beds.$.status': 'vacant' } }
      ).catch(() => {});
      throw err;
    }

    admission.transfers.push({
      fromWardId: admission.wardId,
      fromBedId: admission.bedId,
      toWardId,
      toBedId,
      reason,
      transferredBy: req.user._id,
    });
    admission.wardId = toWardId;
    admission.bedId = toBedId;
    await admission.save();
    await admission.populate(POPULATE_ADMISSION);

    logAudit(req, 'PATIENT_TRANSFERRED', 'Admission', admission._id, { toWardId, toBedId, reason });

    res.json({ message: 'Patient transferred', admission });
  } catch (error) {
    console.error('Transfer Bed Error:', error);
    res.status(500).json({ error: 'Failed to transfer patient' });
  }
};

export const dischargePatient = async (req, res) => {
  try {
    const { summary, followUpInstructions } = req.body;
    if (!summary) {
      return res.status(400).json({ error: 'A discharge summary is required' });
    }

    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    if (admission.status !== 'admitted') {
      return res.status(400).json({ error: 'This admission has already been discharged' });
    }

    const ward = await Ward.findById(admission.wardId);
    const bed = ward?.beds.id(admission.bedId);
    if (bed) {
      await releaseBed(admission.wardId, admission.bedId);
    }

    admission.status = 'discharged';
    admission.dischargeDate = new Date();
    admission.dischargeSummary = {
      summary,
      followUpInstructions: followUpInstructions || '',
      dischargedBy: req.user._id,
      dischargedAt: new Date(),
    };
    await admission.save();
    await admission.populate(POPULATE_ADMISSION);

    logAudit(req, 'PATIENT_DISCHARGED', 'Admission', admission._id, {});

    const days = Math.max(
      1,
      Math.ceil((admission.dischargeDate - admission.admissionDate) / (1000 * 60 * 60 * 24))
    );
    const bedCharges = (bed?.dailyCharge || 0) * days;

    res.json({
      message: 'Patient discharged',
      admission,
      billingSuggestion: { days, dailyCharge: bed?.dailyCharge || 0, bedCharges },
    });
  } catch (error) {
    console.error('Discharge Patient Error:', error);
    res.status(500).json({ error: 'Failed to discharge patient' });
  }
};

export const createIpdBill = async (req, res) => {
  try {
    const { consultationFee, otherCharges, paymentMethod, notes } = req.body;

    const admission = await Admission.findById(req.params.id).populate('patientId');
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    if (admission.status !== 'discharged') {
      return res.status(400).json({ error: 'Bill can only be generated after discharge' });
    }

    const existing = await Bill.findOne({ admissionId: admission._id });
    if (existing) {
      return res.status(400).json({ error: 'A bill has already been generated for this admission' });
    }

    const ward = await Ward.findById(admission.wardId);
    const bed = ward?.beds.id(admission.bedId);
    const dailyCharge = bed?.dailyCharge || 0;
    const days = Math.max(
      1,
      Math.ceil(((admission.dischargeDate || new Date()) - admission.admissionDate) / (1000 * 60 * 60 * 24))
    );
    const bedTotal = dailyCharge * days;

    const items = [
      {
        description: `Ward stay (${days} day${days !== 1 ? 's' : ''} @ ₹${dailyCharge}/day)`,
        quantity: days,
        unitPrice: dailyCharge,
        amount: bedTotal,
      },
    ];
    const extra = Number(otherCharges) || 0;
    if (extra) {
      items.push({ description: 'Other charges', quantity: 1, unitPrice: extra, amount: extra });
    }

    const medicinesTotal = items.reduce((sum, it) => sum + it.amount, 0);
    const fee = Number(consultationFee) || 0;
    const totalAmount = medicinesTotal + fee;

    let billNumber = generateBillNumber();
    while (await Bill.findOne({ billNumber })) {
      billNumber = generateBillNumber();
    }

    const bill = await Bill.create({
      billNumber,
      admissionId: admission._id,
      patientId: admission.patientId._id,
      items,
      medicinesTotal,
      consultationFee: fee,
      
      
      appointmentFee: 0,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      generatedBy: req.user._id,
    });

    logAudit(req, 'IPD_BILL_GENERATED', 'Bill', bill._id, { admissionId: admission._id, totalAmount });

    res.status(201).json({ message: 'IPD bill generated', bill });
  } catch (error) {
    console.error('Create IPD Bill Error:', error);
    res.status(500).json({ error: 'Failed to generate IPD bill' });
  }
};
