import Consultation from '../models/Consultation.js';
import Appointment from '../models/Appointment.js';
import { verifyConsultationMembership } from '../utils/consultationAuth.js';
import { logAudit } from '../utils/auditLog.js';

function notify(req, room, event, payload) {
  try {
    req.app.get('io')?.to(room).emit(event, payload);
  } catch (err) {
    console.error('Consultation socket notify failed:', err.message);
  }
}

const roomFor = (appointmentId) => `consultation-${appointmentId}`;

const JOIN_WINDOW_MS = 10 * 60 * 1000;

function patientJoinTooEarly(appointment, consultation) {
  const status = consultation?.status;
  if (status === 'waiting' || status === 'active') return false;
  const opensAt = new Date(appointment.slotTime).getTime() - JOIN_WINDOW_MS;
  return Date.now() < opensAt;
}

const POPULATE = [
  { path: 'patientId', select: 'name phone' },
  { path: 'doctorId', select: 'name' },
];

export const getMyConsultations = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patientId: req.user._id,
      consultationType: 'online',
      status: { $ne: 'cancelled' },
    })
      .populate(['doctorId', 'department'])
      .sort({ slotTime: -1 })
      .limit(50);

    const consultations = await Consultation.find({ appointmentId: { $in: appointments.map((a) => a._id) } });
    const byAppointment = new Map(consultations.map((c) => [String(c.appointmentId), c]));

    res.json(
      appointments.map((appt) => ({
        appointment: appt,
        consultation: byAppointment.get(String(appt._id)) || null,
      }))
    );
  } catch (error) {
    console.error('Get My Consultations Error:', error);
    res.status(500).json({ error: 'Failed to fetch consultations' });
  }
};

export const getDoctorConsultations = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctorId: req.user._id,
      consultationType: 'online',
      status: { $ne: 'cancelled' },
    })
      .populate(['patientId', 'department'])
      .sort({ slotTime: 1 })
      .limit(100);

    const consultations = await Consultation.find({ appointmentId: { $in: appointments.map((a) => a._id) } });
    const byAppointment = new Map(consultations.map((c) => [String(c.appointmentId), c]));

    res.json(
      appointments.map((appt) => ({
        appointment: appt,
        consultation: byAppointment.get(String(appt._id)) || null,
      }))
    );
  } catch (error) {
    console.error('Get Doctor Consultations Error:', error);
    res.status(500).json({ error: 'Failed to fetch consultations' });
  }
};

export const joinConsultation = async (req, res) => {
  try {
    const { error, status, appointment, role } = await verifyConsultationMembership(req.params.appointmentId, req.user);
    if (error) return res.status(status).json({ error });

    let consultation = await Consultation.findOne({ appointmentId: appointment._id });
    if (!consultation) {
      
      
      
      
      
      
      try {
        consultation = await Consultation.create({
          appointmentId: appointment._id,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          status: 'scheduled',
        });
      } catch (createErr) {
        if (createErr.code === 11000) {
          consultation = await Consultation.findOne({ appointmentId: appointment._id });
        } else {
          throw createErr;
        }
      }
    }
    if (!consultation) {
      return res.status(500).json({ error: 'Failed to join consultation' });
    }

    if (consultation.status === 'completed' || consultation.status === 'cancelled') {
      return res.status(400).json({ error: `This consultation has already ${consultation.status === 'completed' ? 'ended' : 'been cancelled'}.` });
    }

    if (role === 'patient' && patientJoinTooEarly(appointment, consultation)) {
      return res.status(403).json({
        error: 'The join link opens 10 minutes before your appointment time.',
        opensAt: new Date(new Date(appointment.slotTime).getTime() - JOIN_WINDOW_MS),
      });
    }

    if (role === 'patient' && !consultation.patientJoinedAt) {
      consultation.patientJoinedAt = new Date();
      if (consultation.status === 'scheduled') consultation.status = 'waiting';
    }
    if (role === 'doctor' && !consultation.doctorJoinedAt) {
      consultation.doctorJoinedAt = new Date();
    }
    await consultation.save();
    await consultation.populate(POPULATE);

    logAudit(req, 'CONSULTATION_JOINED', 'Consultation', consultation._id, { role });
    notify(req, roomFor(appointment._id), 'consultation:participant-update', { consultation });

    res.json({ consultation, role, roomId: roomFor(appointment._id) });
  } catch (error) {
    console.error('Join Consultation Error:', error);
    res.status(500).json({ error: 'Failed to join consultation' });
  }
};

export const startConsultation = async (req, res) => {
  try {
    const { error, status, appointment, role } = await verifyConsultationMembership(req.params.appointmentId, req.user);
    if (error) return res.status(status).json({ error });
    if (role !== 'doctor') return res.status(403).json({ error: 'Only the assigned doctor can start this consultation' });

    const consultation = await Consultation.findOne({ appointmentId: appointment._id });
    if (!consultation) return res.status(404).json({ error: 'Join the consultation first' });
    if (consultation.status === 'active') {
      return res.status(400).json({ error: 'This consultation has already been started' });
    }
    if (consultation.status === 'completed' || consultation.status === 'cancelled') {
      return res.status(400).json({ error: `This consultation has already ${consultation.status === 'completed' ? 'ended' : 'been cancelled'}.` });
    }

    consultation.status = 'active';
    consultation.startedAt = new Date();
    await consultation.save();
    await consultation.populate(POPULATE);

    logAudit(req, 'CONSULTATION_STARTED', 'Consultation', consultation._id);
    notify(req, roomFor(appointment._id), 'consultation:started', { consultation });

    res.json({ consultation });
  } catch (error) {
    console.error('Start Consultation Error:', error);
    res.status(500).json({ error: 'Failed to start consultation' });
  }
};

export const completeConsultation = async (req, res) => {
  try {
    const { error, status, appointment, role } = await verifyConsultationMembership(req.params.appointmentId, req.user);
    if (error) return res.status(status).json({ error });
    if (role !== 'doctor') return res.status(403).json({ error: 'Only the assigned doctor can complete this consultation' });

    const consultation = await Consultation.findOne({ appointmentId: appointment._id });
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
    if (consultation.status === 'completed') {
      return res.status(400).json({ error: 'This consultation has already been completed' });
    }
    if (consultation.status === 'cancelled') {
      return res.status(400).json({ error: 'This consultation was cancelled' });
    }

    consultation.status = 'completed';
    consultation.endedAt = new Date();
    await consultation.save();
    await consultation.populate(POPULATE);

    if (appointment.status === 'booked') {
      appointment.status = 'completed';
      await appointment.save();
    }

    logAudit(req, 'CONSULTATION_COMPLETED', 'Consultation', consultation._id);
    notify(req, roomFor(appointment._id), 'consultation:ended', { consultation, reason: 'completed' });

    res.json({ consultation });
  } catch (error) {
    console.error('Complete Consultation Error:', error);
    res.status(500).json({ error: 'Failed to complete consultation' });
  }
};

export const leaveConsultation = async (req, res) => {
  try {
    const { error, status, appointment, role } = await verifyConsultationMembership(req.params.appointmentId, req.user);
    if (error) return res.status(status).json({ error });

    logAudit(req, 'CONSULTATION_LEFT', 'Appointment', appointment._id, { role });
    notify(req, roomFor(appointment._id), 'consultation:peer-left', { role });

    res.json({ message: 'Left consultation' });
  } catch (error) {
    console.error('Leave Consultation Error:', error);
    res.status(500).json({ error: 'Failed to leave consultation' });
  }
};
