// Shared constants used across the split-out Section workspaces (see ../Section.jsx).
// Kept in one place so every workspace file and Section.jsx itself import the same
// values instead of each redefining its own copy.

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const TICKET_STATUSES = ["pending", "in-progress", "completed", "closed"];

export const STAFF_ROLES = ["doctor", "nurse", "receptionist", "pharmacist"];

export const EMPTY_STAFF_FORM = {
  name: "",
  role: "nurse",
  contactNumber: "",
  email: "",
  designation: "",
  degree: "",
  registrationNo: "",
  departmentId: "",
  consultationFee: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  address: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  qualification: "",
  experienceYears: "",
  joiningDate: "",
  shiftTiming: "",
  employeeIdProof: "",
  salary: "",
  signatureUrl: ""
};

export const EMPTY_MEDICINE_LINE = {
  name: "",
  dosage: "",
  quantity: ""
};
