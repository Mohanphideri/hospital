import Appointment from '../models/Appointment.js';
import Department from '../models/Department.js';
import DoctorSlot from '../models/DoctorSlot.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Patient from '../models/Patient.js';
import { generateAppointmentCode } from '../utils/crypto.js';
import { logAudit } from '../utils/auditLog.js';
import { toClinicParts, toClinicDateString, clinicDayBounds, clinicDateTimeToInstant, isFutureClinicDate } from '../utils/clinicTime.js';
import { sendAppointmentConfirmationSms } from '../utils/msg91.js';
import { sendAppointmentConfirmationEmail } from '../utils/mailer.js';
import { claimSlotSeat, releaseSlotSeat, getSlotRemaining } from '../utils/slotCapacity.js';
import { claimDailyToken, estimateSlotTurnTime } from '../utils/dailyToken.js';
import { normalizeLookupCode, maskPhone } from '../utils/appointmentLookup.js';

const formatSlotTimeForSms = (slotTime) => {
  const { time } = toClinicParts(slotTime);
  const dateStr = toClinicDateString(slotTime); 
  const [year, month, day] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[Number(month) - 1]} ${year}, ${time}`;
};

const CANCEL_REASONS = [
  'Schedule conflict',
  'Feeling better now',
  'Found another doctor',
  'Personal emergency',
  'Other',
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function findDoctorWithOpenSeat(candidateSlots, resolveSlotTime, dayStart, dayEnd) {
  if (candidateSlots.length === 0) return null;

  const doctorIds = candidateSlots.map((s) => s.doctorId?._id || s.doctorId);
  const onLeaveList = await LeaveRequest.find({
    staffId: { $in: doctorIds },
    status: 'approved',
    fromDate: { $lte: dayEnd },
    toDate: { $gte: dayStart },
  });
  const onLeaveIds = new Set(onLeaveList.map((l) => l.staffId.toString()));

  for (const slot of candidateSlots) {
    const doctorId = slot.doctorId?._id || slot.doctorId;
    const doctorIdStr = doctorId.toString();
    if (onLeaveIds.has(doctorIdStr)) continue;

    const slotTime = resolveSlotTime(slot);
    const remaining = await getSlotRemaining(doctorId, slotTime, slot.capacity || 1);
    if (remaining > 0) {
      return { doctorId, slotTime, capacity: slot.capacity || 1 };
    }
  }
  return null;
}

async function claimSeatAndCreateAppointment(doctorId, slotTime, capacity, appointmentFields) {
  const claimed = await claimSlotSeat(doctorId, slotTime, capacity);
  if (!claimed) {
    return { appointment: null, full: true };
  }

  const slotPosition = claimed.bookedCount;
  const estimatedTime = estimateSlotTurnTime(slotTime, slotPosition);
  const dailyToken = await claimDailyToken(doctorId, toClinicDateString(slotTime));

  let appointmentCode = generateAppointmentCode();
  while (await Appointment.findOne({ appointmentCode })) {
    appointmentCode = generateAppointmentCode();
  }

  try {
    const appointment = await Appointment.create({
      appointmentCode,
      doctorId,
      slotTime,
      slotPosition,
      estimatedTime,
      dailyToken,
      ...appointmentFields,
    });
    return { appointment, full: false };
  } catch (err) {
    await releaseSlotSeat(doctorId, slotTime).catch((releaseErr) =>
      console.error('CRITICAL: failed to release a claimed slot seat after a failed booking - manual fix needed:', doctorId, slotTime, releaseErr.message)
    );
    throw err;
  }
}

async function ensurePatientEmailForBooking(res, patientId, email) {
  const patientDoc = await Patient.findById(patientId);
  if (!patientDoc) {
    res.status(404).json({ error: 'Patient not found' });
    return null;
  }

  if (!patientDoc.email) {
    const trimmed = (email || '').trim();
    if (!trimmed) {
      res.status(400).json({ error: 'An email address is required to book an appointment.' });
      return null;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return null;
    }
    patientDoc.email = trimmed;
    await patientDoc.save();
  }

  return patientDoc;
}

export const bookAppointment = async (req, res) => {
  try {
    const { departmentId, slotTime, email, consultationType } = req.body;
    const normalizedConsultationType = consultationType === 'online' ? 'online' : 'in-person';
    const patientId = req.user._id;

    if (!departmentId) {
      return res.status(400).json({ error: 'Department is required' });
    }

    const patientDoc = await ensurePatientEmailForBooking(res, patientId, email);
    if (!patientDoc) return; 

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    
    
    
    if (department.isGeneral) {
      let appointmentCode = generateAppointmentCode();
      while (await Appointment.findOne({ appointmentCode })) {
        appointmentCode = generateAppointmentCode();
      }

      const appointment = await Appointment.create({
        appointmentCode,
        patientId,
        department: departmentId,
        status: 'booked',
        bookingSource: 'PATIENT',
        createdBy: patientId,
        createdByModel: 'Patient',
      });

      await appointment.populate(['patientId', 'department']);

      logAudit(req, 'APPOINTMENT_CREATED', 'Appointment', appointment._id, { bookingSource: 'PATIENT', general: true });

      if (appointment.patientId?.phone) {
        sendAppointmentConfirmationSms(appointment.patientId.phone, {
          patientName: appointment.patientId.name,
          appointmentCode: appointment.appointmentCode,
          whenText: 'time to be confirmed by our front desk',
        });
      }
      sendAppointmentConfirmationEmail(appointment.patientId?.email, {
        patientName: appointment.patientId?.name,
        appointmentCode: appointment.appointmentCode,
        whenText: 'To be confirmed by our front desk',
        departmentName: appointment.department?.name,
      });

      return res.status(201).json({
        message: 'Consultation request received - our front desk will confirm a doctor and time shortly.',
        appointment,
      });
    }

    if (!slotTime) {
      return res.status(400).json({ error: 'Slot time required' });
    }

    const requestedTime = new Date(slotTime);
    
    
    const { dayOfWeek, time: timeStr } = toClinicParts(requestedTime);

    
    const scheduledSlots = await DoctorSlot.find({
      department: departmentId,
      dayOfWeek,
      time: timeStr,
    });

    if (scheduledSlots.length === 0) {
      return res.status(400).json({ error: 'No doctor is scheduled for that slot' });
    }

    
    
    const { startOfDay: dayStart, endOfDay: dayEnd } = clinicDayBounds(
      toClinicDateString(requestedTime)
    );
    const onLeaveList = await LeaveRequest.find({
      staffId: { $in: scheduledSlots.map((s) => s.doctorId) },
      status: 'approved',
      fromDate: { $lte: dayEnd },
      toDate: { $gte: dayStart },
    });
    const onLeaveIds = new Set(onLeaveList.map((l) => l.staffId.toString()));
    const eligibleSlots = scheduledSlots.filter((s) => !onLeaveIds.has(s.doctorId.toString()));

    if (eligibleSlots.length === 0) {
      return res.status(400).json({ error: 'No doctor is available for that slot (fully booked or on leave)' });
    }

    
    
    
    
    
    let appointment = null;
    let sawAnyRoom = false;
    for (const slot of eligibleSlots) {
      const capacity = slot.capacity || 1;
      const remaining = await getSlotRemaining(slot.doctorId, requestedTime, capacity);
      if (remaining <= 0) continue;
      sawAnyRoom = true;

      const result = await claimSeatAndCreateAppointment(slot.doctorId, requestedTime, capacity, {
        patientId,
        department: departmentId,
        status: 'booked',
        bookingSource: 'PATIENT',
        createdBy: patientId,
        createdByModel: 'Patient',
        consultationType: normalizedConsultationType,
      });
      if (result.appointment) {
        appointment = result.appointment;
        break;
      }
    }

    if (!appointment) {
      return res.status(sawAnyRoom ? 409 : 400).json({
        error: 'No doctor is available for that slot (fully booked or on leave) - please pick another slot.',
      });
    }

    await appointment.populate(['patientId', 'doctorId', 'department']);

    logAudit(req, 'APPOINTMENT_CREATED', 'Appointment', appointment._id, { bookingSource: 'PATIENT' });

    
    if (appointment.patientId?.phone) {
      sendAppointmentConfirmationSms(appointment.patientId.phone, {
        patientName: appointment.patientId.name,
        appointmentCode: appointment.appointmentCode,
        whenText: formatSlotTimeForSms(appointment.slotTime),
      });
    }
    sendAppointmentConfirmationEmail(appointment.patientId?.email, {
      patientName: appointment.patientId?.name,
      appointmentCode: appointment.appointmentCode,
      whenText: formatSlotTimeForSms(appointment.slotTime),
      departmentName: appointment.department?.name,
      doctorName: appointment.doctorId?.name,
    });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment,
    });
  } catch (error) {
    console.error('Book Appointment Error:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
};

export const getMyAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { role } = req.user;
    const { date } = req.query;
    let filter = {};

    if (role === 'patient') {
      filter.patientId = userId;
    } else if (role === 'doctor') {
      filter.doctorId = userId;
    }

    
    
    
    
    if (role === 'doctor') {
      if (date) {
        const { startOfDay, endOfDay } = clinicDayBounds(date);
        filter.slotTime = { $gte: startOfDay, $lte: endOfDay };
      } else {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filter.slotTime = { $gte: sevenDaysAgo, $lte: now };
      }
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId')
      .populate('doctorId')
      .populate('department')
      .sort({ slotTime: -1 });

    res.json(appointments);
  } catch (error) {
    console.error('Get My Appointments Error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const getAllAppointments = async (req, res) => {
  try {
    const { status, date, doctorId, view, pending } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (doctorId) filter.doctorId = doctorId;

    
    
    
    
    if (pending === 'true') {
      filter.doctorId = null;
      filter.status = { $ne: 'cancelled' };
      const appointments = await Appointment.find(filter)
        .populate('patientId')
        .populate('department')
        .sort({ createdAt: 1 });
      return res.json(appointments);
    }

    if (date) {
      
      
      
      const { startOfDay, endOfDay } = clinicDayBounds(date);
      filter.slotTime = { $gte: startOfDay, $lte: endOfDay };
    } else if (req.user.role === 'receptionist') {
      
      
      
      
      const today = toClinicDateString(new Date());
      const { startOfDay, endOfDay } = clinicDayBounds(today);
      filter.slotTime = { $gte: startOfDay, $lte: endOfDay };
    }
    

    const appointments = await Appointment.find(filter)
      .populate('patientId')
      .populate('doctorId')
      .populate('department')
      .sort({ slotTime: view === 'past' ? -1 : 1 });

    res.json(appointments);
  } catch (error) {
    console.error('Get All Appointments Error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const getAppointmentByCode = async (req, res) => {
  try {
    
    if (req.user.role === 'patient') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const code = (req.params.code || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ error: 'Appointment code required' });
    }

    const appointment = await Appointment.findOne({ appointmentCode: code })
      .populate('patientId')
      .populate('doctorId')
      .populate('department');

    if (!appointment) {
      return res.status(404).json({ error: 'No appointment found for that code' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Get Appointment By Code Error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
};

export const lookupAppointmentsByShortCode = async (req, res) => {
  try {
    const { code, error } = normalizeLookupCode(req.params.code);
    if (error) {
      return res.status(400).json({ error });
    }

    const filter = { lookupCode: code };
    
    
    
    if (req.user.role === 'doctor') {
      filter.doctorId = req.user._id;
    }

    const matches = await Appointment.find(filter)
      .populate('patientId', 'name phone')
      .populate('doctorId', 'name')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .limit(25);

    if (matches.length === 0) {
      return res.status(404).json({ error: 'No appointment found for this code.' });
    }

    
    
    
    
    const toSummary = (appt) => ({
      id: appt._id,
      appointmentCode: appt.appointmentCode,
      lookupCode: appt.lookupCode,
      patientName: appt.patientId?.name || 'Unknown',
      maskedPhone: maskPhone(appt.patientId?.phone),
      doctorName: appt.doctorId?.name || 'Unassigned',
      department: appt.department?.name || 'General',
      slotTime: appt.slotTime,
      status: appt.status,
    });

    if (matches.length > 1) {
      return res.json({ multiple: true, matches: matches.map(toSummary) });
    }

    res.json({ multiple: false, appointment: toSummary(matches[0]) });
  } catch (error) {
    console.error('Lookup Appointments By Short Code Error:', error);
    res.status(500).json({ error: 'Failed to look up appointment' });
  }
};

export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ error: 'Doctor ID and date required' });
    }

    const { startOfDay, endOfDay } = clinicDayBounds(date);

    
    
    const onLeave = await LeaveRequest.findOne({
      staffId: doctorId,
      status: 'approved',
      fromDate: { $lte: endOfDay },
      toDate: { $gte: startOfDay },
    });

    if (onLeave) {
      return res.json({ onLeave: true, slots: [] });
    }

    const bookedSlots = await Appointment.find({
      doctorId,
      slotTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
    });

    
    
    const slots = [];
    const startHour = 9;
    const endHour = 17;

    const nowMs = Date.now();
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const hhmm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const slotTime = clinicDateTimeToInstant(date, hhmm);

        
        
        if (slotTime.getTime() <= nowMs) continue;

        const isBooked = bookedSlots.some(
          (slot) => slot.slotTime.getTime() === slotTime.getTime()
        );

        if (!isBooked) {
          slots.push({
            time: slotTime,
            available: true,
          });
        }
      }
    }

    res.json({ onLeave: false, slots });
  } catch (error) {
    console.error('Get Available Slots Error:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['booked', 'in-progress', 'completed', 'cancelled', 'no-show'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = await Appointment.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    
    
    
    if (existing.status === 'cancelled') {
      return res.status(400).json({ error: 'This appointment was cancelled and can no longer be changed.' });
    }

    if (!existing.doctorId) {
      return res.status(400).json({ error: 'Assign a doctor and time to this consultation request first.' });
    }

    const isFutureAppointment = isFutureClinicDate(existing.slotTime);

    
    if (req.user.role === 'doctor') {
      if (String(existing.doctorId) !== String(req.user._id)) {
        return res.status(403).json({ error: 'You can only update your own appointments' });
      }
      if (isFutureAppointment) {
        return res.status(400).json({ error: "This appointment is upcoming - you can act on it from its scheduled day." });
      }
    }

    
    
    if (['receptionist', 'admin'].includes(req.user.role) && isFutureAppointment) {
      return res.status(400).json({ error: 'Future appointments cannot be changed before their date arrives.' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('patientId')
      .populate('doctorId')
      .populate('department');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      message: 'Appointment status updated',
      appointment,
    });
  } catch (error) {
    console.error('Update Appointment Status Error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

export const reassignDoctor = async (req, res) => {
  try {
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.status(400).json({ error: 'doctorId is required' });
    }

    const existing = await Appointment.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    
    if (existing.status === 'cancelled') {
      return res.status(400).json({ error: 'This appointment was cancelled and can no longer be changed.' });
    }

    
    
    
    
    let reassignSlotPosition;
    let reassignEstimatedTime;
    let reassignDailyToken;
    if (existing.slotTime) {
      const { dayOfWeek, time: timeStr } = toClinicParts(existing.slotTime);
      const matchingSlot = await DoctorSlot.findOne({ doctorId, dayOfWeek, time: timeStr });
      const capacity = matchingSlot?.capacity || 1;

      const claimed = await claimSlotSeat(doctorId, existing.slotTime, capacity);
      if (!claimed) {
        return res.status(409).json({ error: 'That doctor is already fully booked at this time.' });
      }
      reassignSlotPosition = claimed.bookedCount;
      reassignEstimatedTime = estimateSlotTurnTime(existing.slotTime, reassignSlotPosition);
      reassignDailyToken = await claimDailyToken(doctorId, toClinicDateString(existing.slotTime));
    }

    let appointment;
    try {
      appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        {
          doctorId,
          ...(existing.slotTime
            ? { slotPosition: reassignSlotPosition, estimatedTime: reassignEstimatedTime, dailyToken: reassignDailyToken }
            : {}),
        },
        { new: true }
      )
        .populate('patientId')
        .populate('doctorId')
        .populate('department');
    } catch (err) {
      if (existing.slotTime) {
        await releaseSlotSeat(doctorId, existing.slotTime).catch(() => {});
      }
      throw err;
    }

    
    if (existing.doctorId && existing.slotTime && String(existing.doctorId) !== String(doctorId)) {
      await releaseSlotSeat(existing.doctorId, existing.slotTime).catch((err) =>
        console.error('Failed to release previous slot seat during reassignment - manual check needed:', existing._id, err.message)
      );
    }

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    logAudit(req, 'DOCTOR_REASSIGNED', 'Appointment', appointment._id, { doctorId });

    res.json({
      message: 'Doctor reassigned',
      appointment,
    });
  } catch (error) {
    console.error('Reassign Doctor Error:', error);
    res.status(500).json({ error: 'Failed to reassign doctor' });
  }
};

export const assignAppointmentSlot = async (req, res) => {
  try {
    const { doctorId, slotTime } = req.body;

    if (!doctorId || !slotTime) {
      return res.status(400).json({ error: 'doctorId and slotTime are required' });
    }

    const existing = await Appointment.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    
    if (existing.status === 'cancelled') {
      return res.status(400).json({ error: 'This appointment was cancelled and can no longer be changed.' });
    }

    const requestedTime = new Date(slotTime);

    
    
    
    
    
    
    const { dayOfWeek, time: timeStr } = toClinicParts(requestedTime);
    const matchingSlot = await DoctorSlot.findOne({ doctorId, dayOfWeek, time: timeStr });
    const capacity = matchingSlot?.capacity || 1;

    const claimed = await claimSlotSeat(doctorId, requestedTime, capacity);
    if (!claimed) {
      return res.status(409).json({ error: 'That slot is already full - please pick another time.' });
    }
    const assignSlotPosition = claimed.bookedCount;
    const assignEstimatedTime = estimateSlotTurnTime(requestedTime, assignSlotPosition);
    const assignDailyToken = await claimDailyToken(doctorId, toClinicDateString(requestedTime));

    let appointment;
    try {
      appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        {
          doctorId,
          slotTime: requestedTime,
          slotPosition: assignSlotPosition,
          estimatedTime: assignEstimatedTime,
          dailyToken: assignDailyToken,
        },
        { new: true }
      )
        .populate('patientId')
        .populate('doctorId')
        .populate('department');
    } catch (err) {
      await releaseSlotSeat(doctorId, requestedTime).catch(() => {});
      throw err;
    }

    
    
    if (existing.doctorId && existing.slotTime && (
      String(existing.doctorId) !== String(doctorId) ||
      existing.slotTime.getTime() !== requestedTime.getTime()
    )) {
      await releaseSlotSeat(existing.doctorId, existing.slotTime).catch((err) =>
        console.error('Failed to release previous slot seat during reassignment - manual check needed:', existing._id, err.message)
      );
    }

    logAudit(req, 'APPOINTMENT_ASSIGNED', 'Appointment', appointment._id, { doctorId, slotTime: requestedTime });

    if (appointment.patientId?.phone) {
      sendAppointmentConfirmationSms(appointment.patientId.phone, {
        patientName: appointment.patientId.name,
        appointmentCode: appointment.appointmentCode,
        whenText: formatSlotTimeForSms(requestedTime),
      });
    }
    sendAppointmentConfirmationEmail(appointment.patientId?.email, {
      patientName: appointment.patientId?.name,
      appointmentCode: appointment.appointmentCode,
      whenText: formatSlotTimeForSms(requestedTime),
      departmentName: appointment.department?.name,
      doctorName: appointment.doctorId?.name,
    });

    res.json({
      message: 'Doctor and time assigned',
      appointment,
    });
  } catch (error) {
    console.error('Assign Appointment Slot Error:', error);
    res.status(500).json({ error: 'Failed to assign doctor and time' });
  }
};

export const getAvailableDoctorsForSlot = async (req, res) => {
  try {
    const { departmentId, date, time } = req.query;
    if (!departmentId || !date || !time) {
      return res.status(400).json({ error: 'Department, date, and time are required' });
    }

    const slotDate = clinicDateTimeToInstant(date, time);
    const { dayOfWeek } = toClinicParts(slotDate);
    const { startOfDay: dayStart, endOfDay: dayEnd } = clinicDayBounds(date);

    const scheduledSlots = await DoctorSlot.find({
      department: departmentId,
      dayOfWeek,
      time,
    }).populate('doctorId', 'name');

    if (scheduledSlots.length === 0) {
      return res.json({ doctors: [] });
    }

    const doctorIds = scheduledSlots.map((s) => s.doctorId._id);

    const onLeaveList = await LeaveRequest.find({
      staffId: { $in: doctorIds },
      status: 'approved',
      fromDate: { $lte: dayEnd },
      toDate: { $gte: dayStart },
    });
    const onLeaveIds = new Set(onLeaveList.map((l) => l.staffId.toString()));

    const doctors = await Promise.all(
      scheduledSlots.map(async (s) => {
        const id = s.doctorId._id.toString();
        const capacity = s.capacity || 1;

        if (onLeaveIds.has(id)) {
          return { doctorId: s.doctorId._id, name: s.doctorId.name, status: 'on-leave', capacity, remainingSeats: 0 };
        }

        const remaining = await getSlotRemaining(s.doctorId._id, slotDate, capacity);
        return {
          doctorId: s.doctorId._id,
          name: s.doctorId.name,
          status: remaining > 0 ? 'available' : 'full',
          capacity,
          remainingSeats: remaining,
        };
      })
    );

    res.json({ doctors });
  } catch (error) {
    console.error('Get Available Doctors For Slot Error:', error);
    res.status(500).json({ error: 'Failed to check doctor availability' });
  }
};

export const bookAppointmentForPatient = async (req, res) => {
  try {
    const { patientId, newPatient, departmentId, slotTime, doctorId, date, time } = req.body;

    if (!departmentId) {
      return res.status(400).json({ error: 'Department is required' });
    }
    if (!patientId && !newPatient) {
      return res.status(400).json({ error: 'A patient (existing or new) is required' });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    let resolvedPatientId = patientId;
    if (!resolvedPatientId && newPatient) {
      if (!newPatient.phone || !newPatient.name) {
        return res.status(400).json({ error: 'New patient requires at least a name and phone number' });
      }
      let patient = await Patient.findOne({ phone: newPatient.phone.trim() });
      if (!patient) {
        patient = await Patient.create({
          phone: newPatient.phone.trim(),
          name: newPatient.name,
          dob: newPatient.dob || undefined,
          gender: newPatient.gender,
          email: newPatient.email,
          address: newPatient.address,
          emergencyContactName: newPatient.emergencyContactName,
          emergencyContactPhone: newPatient.emergencyContactPhone,
        });
      }
      resolvedPatientId = patient._id;
    }

    
    
    
    
    const patientDoc = await ensurePatientEmailForBooking(res, resolvedPatientId, req.body.email);
    if (!patientDoc) return; 

    
    
    
    
    
    if (department.isGeneral) {
      let generalSlotTime = null;
      if (slotTime) {
        generalSlotTime = new Date(slotTime);
      } else if (date && time) {
        generalSlotTime = clinicDateTimeToInstant(date, time);
      }

      let generalCapacity = 1;
      if (generalSlotTime && doctorId) {
        const { dayOfWeek, time: timeStr } = toClinicParts(generalSlotTime);
        const matchingSlot = await DoctorSlot.findOne({ doctorId, dayOfWeek, time: timeStr });
        generalCapacity = matchingSlot?.capacity || 1;
        const remaining = await getSlotRemaining(doctorId, generalSlotTime, generalCapacity);
        if (remaining <= 0) {
          return res.status(400).json({ error: 'That doctor is already fully booked at this time' });
        }
      }

      let appointment;
      if (generalSlotTime && doctorId) {
        const claimResult = await claimSeatAndCreateAppointment(doctorId, generalSlotTime, generalCapacity, {
          patientId: resolvedPatientId,
          department: departmentId,
          status: 'booked',
          bookingSource: req.user.role === 'admin' ? 'ADMIN' : 'RECEPTIONIST',
          createdBy: req.user._id,
          createdByModel: 'User',
        });
        if (!claimResult.appointment) {
          return res.status(409).json({ error: 'That slot was just filled by someone else - please try again.' });
        }
        appointment = claimResult.appointment;
      } else {
        let appointmentCode = generateAppointmentCode();
        while (await Appointment.findOne({ appointmentCode })) {
          appointmentCode = generateAppointmentCode();
        }
        appointment = await Appointment.create({
          appointmentCode,
          patientId: resolvedPatientId,
          department: departmentId,
          ...(generalSlotTime ? { slotTime: generalSlotTime } : {}),
          status: 'booked',
          bookingSource: req.user.role === 'admin' ? 'ADMIN' : 'RECEPTIONIST',
          createdBy: req.user._id,
          createdByModel: 'User',
        });
      }

      await appointment.populate(['patientId', 'doctorId', 'department']);

      logAudit(req, 'APPOINTMENT_CREATED', 'Appointment', appointment._id, {
        bookingSource: appointment.bookingSource,
        patientId: resolvedPatientId,
        general: true,
      });

      if (appointment.patientId?.phone) {
        sendAppointmentConfirmationSms(appointment.patientId.phone, {
          patientName: appointment.patientId.name,
          appointmentCode: appointment.appointmentCode,
          whenText: generalSlotTime ? formatSlotTimeForSms(generalSlotTime) : 'time to be confirmed by our front desk',
        });
      }
      sendAppointmentConfirmationEmail(appointment.patientId?.email, {
        patientName: appointment.patientId?.name,
        appointmentCode: appointment.appointmentCode,
        whenText: generalSlotTime ? formatSlotTimeForSms(generalSlotTime) : 'To be confirmed by our front desk',
        departmentName: appointment.department?.name,
        doctorName: appointment.doctorId?.name,
      });

      return res.status(201).json({ message: 'Appointment booked successfully', appointment });
    }

    let requestedTime = slotTime ? new Date(slotTime) : null;
    let finalDoctorId = doctorId;

    if (!requestedTime) {
      if (!date) {
        return res.status(400).json({ error: 'A date is required when no slot time is provided' });
      }

      const targetDate = new Date(date);
      const dayOfWeek = toClinicParts(targetDate).dayOfWeek;
      const { startOfDay: dayStart, endOfDay: dayEnd } = clinicDayBounds(date);

      let candidateSlots = await DoctorSlot.find({
        department: departmentId,
        dayOfWeek,
        ...(time ? { time } : {}),
      }).populate('doctorId', 'name');

      if (doctorId) {
        candidateSlots = candidateSlots.filter((slot) => String(slot.doctorId._id) === String(doctorId));
      }

      if (candidateSlots.length === 0) {
        return res.status(400).json({ error: 'No doctor is scheduled for that date and department' });
      }

      const pick = await findDoctorWithOpenSeat(
        candidateSlots,
        (slot) => clinicDateTimeToInstant(date, slot.time),
        dayStart,
        dayEnd
      );
      if (pick) {
        requestedTime = pick.slotTime;
        finalDoctorId = pick.doctorId;
      }

      if (!requestedTime) {
        return res.status(400).json({ error: 'No available slot could be auto-assigned for that date' });
      }
    }

    const { dayOfWeek, time: timeStr } = toClinicParts(requestedTime);

    const { startOfDay: dayStart, endOfDay: dayEnd } = clinicDayBounds(
      toClinicDateString(requestedTime)
    );

    let capacity = 1;

    if (finalDoctorId) {
      
      const onLeave = await LeaveRequest.findOne({
        staffId: finalDoctorId,
        status: 'approved',
        fromDate: { $lte: dayEnd },
        toDate: { $gte: dayStart },
      });
      if (onLeave) {
        return res.status(400).json({ error: 'That doctor is on approved leave for this date' });
      }
      
      
      
      const matchingSlot = await DoctorSlot.findOne({ doctorId: finalDoctorId, dayOfWeek, time: timeStr });
      capacity = matchingSlot?.capacity || 1;
      const remaining = await getSlotRemaining(finalDoctorId, requestedTime, capacity);
      if (remaining <= 0) {
        return res.status(400).json({ error: 'That doctor is already fully booked at this time' });
      }
    } else {
      
      const scheduledSlots = await DoctorSlot.find({
        department: departmentId,
        dayOfWeek,
        time: timeStr,
      });
      if (scheduledSlots.length === 0) {
        return res.status(400).json({ error: 'No doctor is scheduled for that slot' });
      }
      const pick = await findDoctorWithOpenSeat(scheduledSlots, () => requestedTime, dayStart, dayEnd);
      if (!pick) {
        return res.status(400).json({ error: 'No doctor is available for that slot (fully booked or on leave)' });
      }
      finalDoctorId = pick.doctorId;
      capacity = pick.capacity;
    }

    const claimResult = await claimSeatAndCreateAppointment(finalDoctorId, requestedTime, capacity, {
      patientId: resolvedPatientId,
      department: departmentId,
      status: 'booked',
      bookingSource: req.user.role === 'admin' ? 'ADMIN' : 'RECEPTIONIST',
      createdBy: req.user._id,
      createdByModel: 'User',
    });

    if (!claimResult.appointment) {
      
      
      
      
      
      return res.status(409).json({
        error: 'That slot was just filled by someone else - please try again.',
      });
    }

    const appointment = claimResult.appointment;

    await appointment.populate(['patientId', 'doctorId', 'department']);

    logAudit(req, 'APPOINTMENT_CREATED', 'Appointment', appointment._id, {
      bookingSource: appointment.bookingSource,
      patientId: resolvedPatientId,
    });

    if (appointment.patientId?.phone) {
      sendAppointmentConfirmationSms(appointment.patientId.phone, {
        patientName: appointment.patientId.name,
        appointmentCode: appointment.appointmentCode,
        whenText: formatSlotTimeForSms(appointment.slotTime),
      });
    }
    sendAppointmentConfirmationEmail(appointment.patientId?.email, {
      patientName: appointment.patientId?.name,
      appointmentCode: appointment.appointmentCode,
      whenText: formatSlotTimeForSms(appointment.slotTime),
      departmentName: appointment.department?.name,
      doctorName: appointment.doctorId?.name,
    });

    res.status(201).json({ message: 'Appointment booked successfully', appointment });
  } catch (error) {
    console.error('Book Appointment For Patient Error:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
};

export const getCancelReasons = async (req, res) => {
  res.json(CANCEL_REASONS);
};

export const cancelAppointment = async (req, res) => {
  try {
    const { reason, note } = req.body;

    if (!reason || !CANCEL_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'A valid cancellation reason is required' });
    }

    const existing = await Appointment.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    
    
    
    
    
    
    if (existing.status === 'cancelled') {
      return res.status(400).json({ error: 'This appointment is already cancelled.' });
    }
    if (['in-progress', 'completed'].includes(existing.status)) {
      return res.status(400).json({ error: 'This visit has already happened and cannot be cancelled.' });
    }

    
    
    
    if (req.user.role === 'patient' && String(existing.patientId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only cancel your own appointments' });
    }
    if (req.user.role === 'doctor' && String(existing.doctorId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only cancel your own appointments' });
    }

    const isPastAppointment = existing.slotTime ? new Date(existing.slotTime) < new Date() : false;
    const isStaffAction = ['receptionist', 'admin'].includes(req.user.role);
    if (isStaffAction && isPastAppointment && ['booked', 'in-progress'].includes(existing.status)) {
      return res.status(400).json({ error: 'Past appointments can only be updated by status' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        cancelReason: reason,
        cancelNote: note || '',
        cancelledBy: req.user._id,
        cancelledByModel: req.user.role === 'patient' ? 'Patient' : 'User',
        cancelledAt: new Date(),
      },
      { new: true }
    )
      .populate('patientId')
      .populate('doctorId')
      .populate('department');

    
    
    if (existing.doctorId && existing.slotTime) {
      await releaseSlotSeat(existing.doctorId, existing.slotTime).catch((err) =>
        console.error('Failed to release slot seat on cancellation - manual check needed:', existing._id, err.message)
      );
    }

    logAudit(req, 'APPOINTMENT_CANCELLED', 'Appointment', req.params.id, { reason });

    res.json({
      message: 'Appointment cancelled',
      appointment,
    });
  } catch (error) {
    console.error('Cancel Appointment Error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
};