import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateSlotTurnTime, SLOT_PER_PATIENT_MINUTES } from './dailyToken.js';

test('the 1st position in a slot is estimated at the slot start time itself', () => {
  const slotTime = new Date('2026-08-20T10:00:00.000Z');
  const eta = estimateSlotTurnTime(slotTime, 1);
  assert.equal(eta.getTime(), slotTime.getTime());
});

test('matches the worked example: position 4 in a 10:00 slot is ~10:45', () => {
  const slotTime = new Date('2026-08-20T10:00:00.000Z');
  const eta = estimateSlotTurnTime(slotTime, 4);
  assert.equal(eta.getTime(), slotTime.getTime() + 3 * SLOT_PER_PATIENT_MINUTES * 60 * 1000);
  assert.equal(eta.toISOString(), '2026-08-20T10:45:00.000Z');
});

test('per-patient gap is 15 minutes, within the requested 10-20 minute range', () => {
  assert.equal(SLOT_PER_PATIENT_MINUTES >= 10 && SLOT_PER_PATIENT_MINUTES <= 20, true);
});

test('never estimates a turn before the slot itself, even for a bogus position', () => {
  const slotTime = new Date('2026-08-20T11:00:00.000Z');
  const eta = estimateSlotTurnTime(slotTime, 0);
  assert.equal(eta.getTime(), slotTime.getTime());
});
