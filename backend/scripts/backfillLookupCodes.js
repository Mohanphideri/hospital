

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../src/models/Appointment.js';
import { deriveLookupCode } from '../src/utils/appointmentLookup.js';

dotenv.config();

async function backfill() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/heartstone');
  console.log('Connected to MongoDB');

  const cursor = Appointment.find({
    appointmentCode: { $exists: true, $ne: null },
    lookupCode: { $in: [null, undefined] },
  }).cursor();

  let updated = 0;
  for await (const appt of cursor) {
    const lookupCode = deriveLookupCode(appt.appointmentCode);
    if (lookupCode) {
      await Appointment.updateOne({ _id: appt._id }, { $set: { lookupCode } });
      updated += 1;
    }
  }

  console.log(`Backfilled lookupCode on ${updated} appointment(s).`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
