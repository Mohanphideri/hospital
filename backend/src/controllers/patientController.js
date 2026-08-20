import Patient from '../models/Patient.js';

export const getMyPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findById(req.user._id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error('Get My Patient Profile Error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const searchPatients = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'A search term is required' });
    }
    const term = q.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const filter = {
      $or: [{ name: regex }, { phone: regex }, { email: regex }],
    };
    
    if (/^[0-9a-fA-F]{24}$/.test(term)) {
      filter.$or.push({ _id: term });
    }

    const patients = await Patient.find(filter).limit(20).sort({ name: 1 });
    res.json(patients);
  } catch (error) {
    console.error('Search Patients Error:', error);
    res.status(500).json({ error: 'Failed to search patients' });
  }
};

export const createPatient = async (req, res) => {
  try {
    const { phone, name, dob, gender, email, address, emergencyContactName, emergencyContactPhone } = req.body;

    if (!phone || !name) {
      return res.status(400).json({ error: 'Phone number and name are required' });
    }

    const existing = await Patient.findOne({ phone: phone.trim() });
    if (existing) {
      return res.json({ patient: existing, alreadyExisted: true });
    }

    const patient = await Patient.create({
      phone: phone.trim(),
      name,
      dob: dob || undefined,
      gender,
      email,
      address,
      emergencyContactName,
      emergencyContactPhone,
    });

    res.status(201).json({ patient, alreadyExisted: false });
  } catch (error) {
    console.error('Create Patient Error:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
};

export const findPatientByPhone = async (req, res) => {
  try {
    const phone = (req.params.phone || '').trim();
    const patient = await Patient.findOne({ phone });
    if (!patient) {
      return res.status(404).json({ error: 'No patient found with that phone number' });
    }
    res.json(patient);
  } catch (error) {
    console.error('Find Patient By Phone Error:', error);
    res.status(500).json({ error: 'Failed to look up patient' });
  }
};

export const updateMyPatientProfile = async (req, res) => {
  try {
    const { name, age, gender, email } = req.body;

    const patient = await Patient.findById(req.user._id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const isFirstTimeName = !patient.name;
    const trimmedName = typeof name === 'string' ? name.trim() : undefined;

    if (isFirstTimeName && !trimmedName) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (trimmedName) patient.name = trimmedName;
    if (age !== undefined && age !== '') patient.age = Number(age);
    if (gender !== undefined) patient.gender = gender;
    if (email !== undefined) patient.email = email;

    await patient.save();

    res.json({ message: 'Profile updated successfully', patient });
  } catch (error) {
    console.error('Update My Patient Profile Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
