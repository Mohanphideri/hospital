import DoctorDayToken from '../models/DoctorDayToken.js';

// Atomically hands out the next running token number for this doctor on
// this clinic-local calendar day, across every slot that day - not just the
// one being booked into. Same upsert-then-conditional-update shape as
// claimSlotSeat in slotCapacity.js: the unique index on (doctorId, dateKey)
// makes the upsert race-safe (one insert wins, the other just finds the doc
// already there), and the $inc is a single atomic write, so two patients
// booking at the same instant - even into different slots for the same
// doctor - can never be handed the same token.
//
// Tokens are never reused/decremented on cancellation - once #7 is handed
// out, the next booking is #8 regardless of what happens to #7, same as a
// real physical token counter.
export async function claimDailyToken(doctorId, dateKey) {
  await DoctorDayToken.findOneAndUpdate(
    { doctorId, dateKey },
    { $setOnInsert: { doctorId, dateKey, lastToken: 0 } },
    { upsert: true }
  ).catch((err) => {
    if (err?.code !== 11000) throw err;
  });

  const updated = await DoctorDayToken.findOneAndUpdate(
    { doctorId, dateKey },
    { $inc: { lastToken: 1 } },
    { new: true }
  );

  return updated.lastToken;
}

// How many minutes apart each patient's estimated turn is, within a single
// slot - e.g. a 10:00 slot (capacity 5): position 1 -> 10:00, position 2 ->
// 10:15, ... position 4 -> 10:45. Kept in the 10-20 minute range a real
// consultation typically takes.
export const SLOT_PER_PATIENT_MINUTES = 15;

// Given a slot's start time and a patient's 1-based position within that
// slot's capacity, returns their estimated turn as a Date.
export function estimateSlotTurnTime(slotTime, position) {
  const eta = new Date(slotTime);
  const offsetMinutes = Math.max(0, (Number(position) || 1) - 1) * SLOT_PER_PATIENT_MINUTES;
  eta.setMinutes(eta.getMinutes() + offsetMinutes);
  return eta;
}
