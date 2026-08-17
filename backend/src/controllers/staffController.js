import User from '../models/User.js';
import Department from '../models/Department.js';
import { hashPassword, generateUsername, generateTempPassword } from '../utils/crypto.js';
import { logAudit } from '../utils/auditLog.js';

export const addStaff = async (req, res) => {
  try {
    const {
      name,
      contactNumber,
      email,
      role,
      designation,
      degree,
      registrationNo,
      departmentId,
      consultationFee,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContactName,
      emergencyContactNumber,
      qualification,
      experienceYears,
      joiningDate,
      shiftTiming,
      employeeIdProof,
      salary,
      signatureUrl,
    } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role required' });
    }

    if (!contactNumber) {
      return res.status(400).json({ error: 'Contact number is required to generate a username' });
    }

    // Generate a unique username: first 3 letters of name + last 3 digits of phone + "H"
    const baseUsername = generateUsername(name, contactNumber);
    let username = baseUsername;
    let suffix = 2;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${suffix}`;
      suffix += 1;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await User.create({
      username,
      passwordHash,
      name,
      contactNumber,
      email,
      role,
      designation,
      degree,
      registrationNo,
      department: departmentId,
      consultationFee,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      bloodGroup: bloodGroup || undefined,
      address: address || undefined,
      emergencyContactName: emergencyContactName || undefined,
      emergencyContactNumber: emergencyContactNumber || undefined,
      qualification: qualification || undefined,
      experienceYears: experienceYears !== undefined && experienceYears !== '' ? Number(experienceYears) : undefined,
      joiningDate: joiningDate || undefined,
      shiftTiming: shiftTiming || undefined,
      employeeIdProof: employeeIdProof || undefined,
      salary: salary !== undefined && salary !== '' ? Number(salary) : undefined,
      signatureUrl: signatureUrl || undefined,
      mustResetPassword: true,
      isActive: true,
    });

    if (departmentId && role === 'doctor') {
      await Department.findByIdAndUpdate(
        departmentId,
        { $push: { doctors: user._id } },
        { new: true }
      );
    }

    logAudit(req, 'USER_CREATED', 'User', user._id, { role: user.role, name: user.name });

    res.status(201).json({
      message: 'Staff member added successfully',
      user: {
        _id: user._id,
        username: user.username,
        tempPassword,
        name: user.name,
        role: user.role,
      },
      warning: 'Share the temporary password with the staff member. They must change it on first login.',
    });
  } catch (error) {
    console.error('Add Staff Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getStaff = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { isActive: true };

    if (role) {
      filter.role = role;
    }

    const staff = await User.find(filter).populate('department').select('-passwordHash');

    res.json(staff);
  } catch (error) {
    console.error('Get Staff Error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id)
      .populate('department')
      .select('-passwordHash');

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json(staff);
  } catch (error) {
    console.error('Get Staff By ID Error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};export const updateStaff = async (req, res) => {
  try {
    const {
      name,
      contactNumber,
      email,
      designation,
      degree,
      registrationNo,
      departmentId,
      consultationFee,
      role,
      isActive,
      signatureUrl,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContactName,
      emergencyContactNumber,
      qualification,
      experienceYears,
      joiningDate,
      shiftTiming,
      employeeIdProof,
      salary,
    } = req.body;

    const before = await User.findById(req.params.id);
    if (!before) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (contactNumber) updates.contactNumber = contactNumber;
    if (email) updates.email = email;
    if (designation) updates.designation = designation;
    if (degree) updates.degree = degree;
    if (registrationNo) updates.registrationNo = registrationNo;
    if (departmentId !== undefined) updates.department = departmentId || undefined;
    if (consultationFee !== undefined) updates.consultationFee = consultationFee;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (signatureUrl !== undefined) updates.signatureUrl = signatureUrl || undefined;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth || undefined;
    if (gender !== undefined) updates.gender = gender || undefined;
    if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup || undefined;
    if (address !== undefined) updates.address = address || undefined;
    if (emergencyContactName !== undefined) updates.emergencyContactName = emergencyContactName || undefined;
    if (emergencyContactNumber !== undefined) updates.emergencyContactNumber = emergencyContactNumber || undefined;
    if (qualification !== undefined) updates.qualification = qualification || undefined;
    if (experienceYears !== undefined) updates.experienceYears = experienceYears !== '' ? Number(experienceYears) : undefined;
    if (joiningDate !== undefined) updates.joiningDate = joiningDate || undefined;
    if (shiftTiming !== undefined) updates.shiftTiming = shiftTiming || undefined;
    if (employeeIdProof !== undefined) updates.employeeIdProof = employeeIdProof || undefined;
    if (salary !== undefined) updates.salary = salary !== '' ? Number(salary) : undefined;

    const staff = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('department')
      .select('-passwordHash');

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Doctor <-> department cross-reference: keep Department.doctors in sync
    // the same way addStaff does, rather than just updating User.department
    // one-sidedly and leaving the department's doctor list stale.
    const beforeDeptId = before.department ? String(before.department) : null;
    const afterDeptId = staff.department ? String(staff.department._id || staff.department) : null;
    if (beforeDeptId !== afterDeptId) {
      if (beforeDeptId) {
        await Department.findByIdAndUpdate(beforeDeptId, { $pull: { doctors: staff._id } });
      }
      if (afterDeptId) {
        await Department.findByIdAndUpdate(afterDeptId, { $addToSet: { doctors: staff._id } });
      }
    }

    if (role !== undefined && role !== before.role) {
      logAudit(req, 'ROLE_CHANGED', 'User', staff._id, { from: before.role, to: role });
    }
    if (isActive !== undefined && isActive !== before.isActive) {
      logAudit(req, isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'User', staff._id, {});
    }

    res.json({ message: 'Staff updated successfully', staff });
  } catch (error) {
    console.error('Update Staff Error:', error);
    res.status(500).json({ error: 'Failed to update staff' });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const staff = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json({ message: 'Staff deactivated successfully' });
  } catch (error) {
    console.error('Delete Staff Error:', error);
    res.status(500).json({ error: 'Failed to delete staff' });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const staff = await User.findById(req.user._id)
      .populate('department')
      .select('-passwordHash');

    if (!staff) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(staff);
  } catch (error) {
    console.error('Get My Profile Error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    // Staff can only self-edit contact/personal details, not role, department, pay, etc.
    const {
      contactNumber,
      email,
      address,
      emergencyContactName,
      emergencyContactNumber,
      bloodGroup,
      photoUrl,
    } = req.body;

    const updates = {};
    if (contactNumber !== undefined) updates.contactNumber = contactNumber;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (emergencyContactName !== undefined) updates.emergencyContactName = emergencyContactName;
    if (emergencyContactNumber !== undefined) updates.emergencyContactNumber = emergencyContactNumber;
    if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;

    const staff = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
      .populate('department')
      .select('-passwordHash');

    if (!staff) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ message: 'Profile updated successfully', staff });
  } catch (error) {
    console.error('Update My Profile Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getDoctors = async (req, res) => {
  try {
    const { departmentId } = req.query;

    const filter = { role: 'doctor', isActive: true };
    if (departmentId) {
      filter.department = departmentId;
    }

    // Admins manage HR/onboarding and legitimately need the full record.
    // Every other authenticated role (other doctors, nurses, receptionists,
    // pharmacists, patients) only needs the non-sensitive professional
    // fields required to identify/display a doctor - never salary, leave
    // balance, DOB, address, emergency contact, or other HR/personal data.
    if (req.user?.role === 'admin') {
      const doctors = await User.find(filter).populate('department').select('-passwordHash');
      return res.json(doctors);
    }

    const doctors = await User.find(filter)
      .populate('department', 'name')
      .select('name designation degree registrationNo department consultationFee photoUrl')
      .sort({ createdAt: 1 });

    res.json(doctors);
  } catch (error) {
    console.error('Get Doctors Error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};

// Public: minimal, non-sensitive doctor directory for the marketing landing page
// (name, designation, degree, department only - never contact info, salary, or
// any other HR/personal field).
export const getPublicDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', isActive: true })
      .populate('department', 'name')
      .select('name designation degree department registrationNo')
      .sort({ createdAt: 1 });

    res.json(doctors);
  } catch (error) {
    console.error('Get Public Doctors Error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};
