import SlotBooking from '../models/SlotBooking.js';

// Reserves one seat in a doctor's slot if there's room, atomically. Returns
// the updated SlotBooking document (whose `bookedCount` is this booking's
// 1-based position within the slot - see utils/dailyToken.js for how that
// becomes the patient-facing token/ETA) if a seat was claimed, or `null` if
// the slot is already full. `if (!claimed)` still works exactly as before
// for every existing caller that only checked truthiness. Safe under
// concurrent callers: the increment only applies if bookedCount is still
// below capacity *at the moment of the write* (an atomic conditional
// update, not a separate read-then-write), so two people racing for the
// last seat can never both get it.
export async function claimSlotSeat(doctorId, slotTime, capacity) {
  // Make sure the counter document exists before trying to claim against it.
  // Upsert races are safe: if two requests hit this at once, the unique
  // index on (doctorId, slotTime) lets exactly one insert succeed - the
  // other gets a duplicate-key error, which just means the doc now exists,
  // so we ignore it and move on to the claim step below.
  await SlotBooking.findOneAndUpdate(
    { doctorId, slotTime },
    { $setOnInsert: { doctorId, slotTime, capacity, bookedCount: 0 } },
    { upsert: true }
  ).catch((err) => {
    if (err?.code !== 11000) throw err;
  });

  const claimed = await SlotBooking.findOneAndUpdate(
    { doctorId, slotTime, $expr: { $lt: ['$bookedCount', '$capacity'] } },
    { $inc: { bookedCount: 1 } },
    { new: true }
  );

  return claimed;
}

// Frees one seat (e.g. on cancellation, or to compensate a claim whose
// Appointment record then failed to save). Never goes below zero.
export async function releaseSlotSeat(doctorId, slotTime) {
  await SlotBooking.findOneAndUpdate(
    { doctorId, slotTime, bookedCount: { $gt: 0 } },
    { $inc: { bookedCount: -1 } }
  );
}

// Read-only: how many seats are left in a doctor's slot right now. Used for
// display (available-slots lists) - doesn't create or mutate the counter
// document, so viewing availability never itself reserves anything.
export async function getSlotRemaining(doctorId, slotTime, fallbackCapacity) {
  const doc = await SlotBooking.findOne({ doctorId, slotTime });
  if (!doc) return fallbackCapacity;
  return Math.max(0, doc.capacity - doc.bookedCount);
}
