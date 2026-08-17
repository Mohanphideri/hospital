import Patient from '../models/Patient.js';

// Patient: view my own profile
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

// Doctor / nurse / receptionist / admin: search patients by name/phone/email
// (used to find an existing patient before booking on their behalf).
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
    // Also allow searching by exact patient _id
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

// Receptionist / admin: create a new patient profile, e.g. when booking for a
// walk-in who isn't in the system yet. If the phone number already belongs to
// an existing patient, that existing record is returned instead of creating a
// duplicate - phone number is the one thing that must stay unique per patient.
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

// Doctor / nurse / receptionist / admin: look up a patient by phone number
// (used e.g. when admitting a patient to IPD, where a real Patient _id is needed).
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

// Patient: set/update my own profile. Name is compulsory for a first-time (new
// number) patient - every prescription and portal screen displays this name.
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
