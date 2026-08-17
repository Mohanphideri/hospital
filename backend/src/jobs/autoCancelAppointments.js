import Appointment from '../models/Appointment.js';

// How long after the booked slot time an appointment is left alone before
// it's auto-cancelled - gives staff a reasonable window to check a patient
// in late or mark the visit completed before the system steps in.
const GRACE_MINUTES = Number(process.env.APPOINTMENT_AUTO_CANCEL_GRACE_MINUTES) || 30;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

// Any appointment still sitting at "booked" once its slot time (plus the
// grace window) has passed was never checked in, completed, or explicitly
// cancelled by anyone - so it gets auto-cancelled rather than lingering
// forever as a phantom "upcoming" booking that's actually in the past.
export async function autoCancelPastAppointments() {
  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000);
  try {
    const result = await Appointment.updateMany(
      { status: 'booked', slotTime: { $lte: cutoff } },
      {
        $set: {
          status: 'cancelled',
          cancelReason: 'Automatically cancelled - appointment time passed',
          cancelledAt: new Date(),
        },
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`Auto-cancelled ${result.modifiedCount} past-due appointment(s).`);
    }
  } catch (error) {
    console.error('Auto-cancel Appointments Error:', error);
  }
}

let intervalHandle = null;

// Runs once immediately (catches anything that piled up while the server was
// down) and then on a fixed interval for as long as the process is alive.
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
