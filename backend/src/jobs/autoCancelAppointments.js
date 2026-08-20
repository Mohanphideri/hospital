import Appointment from '../models/Appointment.js';
import { toClinicDateString, clinicDayBounds } from '../utils/clinicTime.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; 

export async function autoCancelPastAppointments() {
  const todayStr = toClinicDateString(new Date());
  const { startOfDay } = clinicDayBounds(todayStr);
  try {
    const result = await Appointment.updateMany(
      { status: 'booked', slotTime: { $ne: null, $lt: startOfDay } },
      {
        $set: {
          status: 'cancelled',
          cancelReason: 'Automatically cancelled - appointment date passed',
          cancelledAt: new Date(),
        },
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`Auto-cancelled ${result.modifiedCount} past-date appointment(s).`);
    }
  } catch (error) {
    console.error('Auto-cancel Appointments Error:', error);
  }
}

let intervalHandle = null;

export function startAppointmentAutoCancelJob() {
  if (intervalHandle) return;
  autoCancelPastAppointments();
  intervalHandle = setInterval(autoCancelPastAppointments, CHECK_INTERVAL_MS);
}

export function stopAppointmentAutoCancelJob() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
