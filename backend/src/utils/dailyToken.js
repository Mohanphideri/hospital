import DoctorDayToken from '../models/DoctorDayToken.js';

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

export const SLOT_PER_PATIENT_MINUTES = 15;

export function estimateSlotTurnTime(slotTime, position) {
  const eta = new Date(slotTime);
  const offsetMinutes = Math.max(0, (Number(position) || 1) - 1) * SLOT_PER_PATIENT_MINUTES;
  eta.setMinutes(eta.getMinutes() + offsetMinutes);
  return eta;
}
