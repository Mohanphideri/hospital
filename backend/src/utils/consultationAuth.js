import Consultation from '../models/Consultation.js';
import Appointment from '../models/Appointment.js';

export async function verifyConsultationMembership(appointmentId, user) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return { error: 'Appointment not found', status: 404 };
  }
  if (appointment.consultationType !== 'online') {
    return { error: 'This is not an online consultation appointment', status: 400 };
  }
  if (appointment.status === 'cancelled') {
    return { error: 'This appointment has been cancelled', status: 400 };
  }

  const isPatient = user.role === 'patient' && String(appointment.patientId) === String(user._id);
  const isDoctor = user.role === 'doctor' && String(appointment.doctorId) === String(user._id);
  if (!isPatient && !isDoctor) {
    return { error: 'You do not have access to this consultation', status: 403 };
  }

  return { appointment, role: isPatient ? 'patient' : 'doctor' };
}
