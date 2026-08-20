import SlotBooking from '../models/SlotBooking.js';

export async function claimSlotSeat(doctorId, slotTime, capacity) {
  
  
  
  
  
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

export async function releaseSlotSeat(doctorId, slotTime) {
  await SlotBooking.findOneAndUpdate(
    { doctorId, slotTime, bookedCount: { $gt: 0 } },
    { $inc: { bookedCount: -1 } }
  );
}

export async function getSlotRemaining(doctorId, slotTime, fallbackCapacity) {
  const doc = await SlotBooking.findOne({ doctorId, slotTime });
  if (!doc) return fallbackCapacity;
  return Math.max(0, doc.capacity - doc.bookedCount);
}
