import DoctorSlot from '../models/DoctorSlot.js';
import { dateStringDayOfWeek, clinicDateTimeToInstant } from '../utils/clinicTime.js';
import { getSlotRemaining } from '../utils/slotCapacity.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Admin only: replace a doctor's slots for a single day-of-week with a new list of times.
// `times` accepts either plain "HH:MM" strings (capacity defaults to 1, same
// as before) or { time: "HH:MM", capacity: N } objects for slots that should
// allow more than one patient - e.g. { time: "10:00", capacity: 5 } lets up
// to 5 patients book the 10:00 slot before it's shown as full.
export const setDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { departmentId, dayOfWeek, times } = req.body;

    if (!departmentId || dayOfWeek === undefined || !Array.isArray(times)) {
      return res.status(400).json({ error: 'departmentId, dayOfWeek and times[] are required' });
    }

    const day = Number(dayOfWeek);
    if (Number.isNaN(day) || day < 0 || day > 6) {
      return res.status(400).json({ error: 'dayOfWeek must be 0 (Sun) to 6 (Sat)' });
    }

    // Normalize each entry to { time, capacity }, accepting either a plain
    // "HH:MM" string or an object that also specifies capacity.
    const normalized = times
      .map((entry) => {
        if (typeof entry === 'string') {
          return { time: entry, capacity: 1 };
        }
        if (entry && typeof entry === 'object' && entry.time) {
          const capacity = Number(entry.capacity);
          return {
            time: entry.time,
            capacity: Number.isFinite(capacity) && capacity >= 1 ? Math.floor(capacity) : 1,
          };
        }
        return null;
      })
      .filter(Boolean);

    // De-dupe by time (last one wins if the same time appears twice), then sort.
    const byTime = new Map();
    normalized.forEach(({ time, capacity }) => byTime.set(time, capacity));
    const cleanTimes = [...byTime.keys()].sort();

    // Wipe existing slots for this doctor on this day, then set the new ones.
    await DoctorSlot.deleteMany({ doctorId, dayOfWeek: day });

    const docs = cleanTimes.map((time) => ({
      doctorId,
      department: departmentId,
      dayOfWeek: day,
      time,
      capacity: byTime.get(time),
    }));

    if (docs.length > 0) {
      await DoctorSlot.insertMany(docs);
    }

    res.json({
      message: `Availability updated for ${DAY_NAMES[day]}`,
      dayOfWeek: day,
      times: docs.map((d) => ({ time: d.time, capacity: d.capacity })),
    });
  } catch (error) {
    console.error('Set Doctor Slots Error:', error);
    res.status(500).json({ error: 'Failed to set doctor availability' });
  }
};

// Admin: view a doctor's full weekly availability grid
export const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const slots = await DoctorSlot.find({ doctorId }).sort({ dayOfWeek: 1, time: 1 });

    const byDay = {};
    for (let d = 0; d <= 6; d += 1) byDay[d] = [];
    slots.forEach((slot) => {
      byDay[slot.dayOfWeek].push({ time: slot.time, capacity: slot.capacity });
    });

    res.json({ doctorId, schedule: byDay, dayNames: DAY_NAMES });
  } catch (error) {
    console.error('Get Doctor Slots Error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor availability' });
  }
};

// Doctor: view my own weekly availability
export const getMyDoctorSlots = async (req, res) => {
  try {
    const slots = await DoctorSlot.find({ doctorId: req.user._id }).sort({ dayOfWeek: 1, time: 1 });

    const byDay = {};
    for (let d = 0; d <= 6; d += 1) byDay[d] = [];
    slots.forEach((slot) => {
      byDay[slot.dayOfWeek].push({ time: slot.time, capacity: slot.capacity });
    });

    res.json({ schedule: byDay, dayNames: DAY_NAMES });
  } catch (error) {
    console.error('Get My Doctor Slots Error:', error);
    res.status(500).json({ error: 'Failed to fetch your availability' });
  }
};

// Patient: for a department + date, which time slots have at least one doctor free.
// The patient never picks a doctor - the system assigns one automatically at booking time.
export const getAvailableSlotsForBooking = async (req, res) => {
  try {
    const { departmentId, date } = req.query;

    if (!departmentId || !date) {
      return res.status(400).json({ error: 'departmentId and date are required' });
    }

    const dayOfWeek = dateStringDayOfWeek(date);

    const slots = await DoctorSlot.find({ department: departmentId, dayOfWeek });
    if (slots.length === 0) {
      return res.json([]);
    }

    // Capacity-aware: a time slot is "available" as long as at least one
    // scheduled doctor still has an open seat (per DoctorSlot.capacity, via
    // the atomic SlotBooking counter) - not just "isn't booked at all".
    // Once every doctor scheduled at that time is full, the slot disappears
    // from what the patient sees, exactly like it was fully booked before -
    // it just now takes `capacity` bookings instead of 1 to get there.
    // Exact instants are resolved the same way the booking endpoints do
    // (clinicDateTimeToInstant), so the seat-counter keys line up exactly
    // with what gets claimed at booking time.
    const timeMap = new Map();
    for (const slot of slots) {
      const exactSlotTime = clinicDateTimeToInstant(date, slot.time);
      const remaining = await getSlotRemaining(slot.doctorId, exactSlotTime, slot.capacity);

      const existing = timeMap.get(slot.time) || { time: slot.time, available: false, remainingSeats: 0 };
      existing.remainingSeats += remaining;
      if (remaining > 0) existing.available = true;
      timeMap.set(slot.time, existing);
    }

    const result = [...timeMap.values()].sort((a, b) => a.time.localeCompare(b.time));
    res.json(result);
  } catch (error) {
    console.error('Get Available Slots For Booking Error:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
};
