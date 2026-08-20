import test from 'node:test';
import assert from 'node:assert/strict';
import { getAllowedNextStatuses, isValidTransition, TERMINAL_STATUSES } from './pharmacyOrderStatus.js';

test('pickup flow: pending -> confirmed -> preparing -> ready-for-pickup -> dispensed', () => {
  assert.deepEqual(getAllowedNextStatuses('pickup', 'pending'), ['confirmed', 'cancelled']);
  assert.deepEqual(getAllowedNextStatuses('pickup', 'confirmed'), ['preparing', 'cancelled']);
  assert.deepEqual(getAllowedNextStatuses('pickup', 'preparing'), ['ready-for-pickup', 'cancelled']);
  assert.deepEqual(getAllowedNextStatuses('pickup', 'ready-for-pickup'), ['dispensed', 'cancelled']);
  assert.deepEqual(getAllowedNextStatuses('pickup', 'dispensed'), []);
});

test('delivery flow: pending -> confirmed -> preparing -> ready-for-dispatch -> out-for-delivery -> delivered', () => {
  assert.deepEqual(getAllowedNextStatuses('delivery', 'pending'), ['confirmed', 'cancelled']);
  assert.deepEqual(getAllowedNextStatuses('delivery', 'confirmed'), ['preparing', 'cancelled']);
  assert.deepEqual(getAllowedNextStatuses('delivery', 'preparing'), ['ready-for-dispatch', 'cancelled']);
  assert.deepEqual(getAllowedNextStatuses('delivery', 'ready-for-dispatch'), ['out-for-delivery', 'cancelled']);
  assert.deepEqual(getAllowedNextStatuses('delivery', 'out-for-delivery'), ['delivered', 'cancelled', 'failed-delivery']);
  assert.deepEqual(getAllowedNextStatuses('delivery', 'delivered'), []);
});

test('failed-delivery can be retried or cancelled', () => {
  assert.deepEqual(getAllowedNextStatuses('delivery', 'failed-delivery'), ['out-for-delivery', 'cancelled']);
});

test('cancelled is always terminal', () => {
  assert.deepEqual(getAllowedNextStatuses('pickup', 'cancelled'), []);
  assert.deepEqual(getAllowedNextStatuses('delivery', 'cancelled'), []);
});

test('isValidTransition matches getAllowedNextStatuses', () => {
  assert.equal(isValidTransition('pickup', 'pending', 'confirmed'), true);
  assert.equal(isValidTransition('pickup', 'pending', 'dispensed'), false);
  assert.equal(isValidTransition('delivery', 'out-for-delivery', 'failed-delivery'), true);
  assert.equal(isValidTransition('pickup', 'out-for-delivery', 'failed-delivery'), false);
});

test('pickup orders never expose delivery-only statuses as next steps', () => {
  const allPickupNext = ['pending', 'confirmed', 'preparing', 'ready-for-pickup'].flatMap((s) =>
    getAllowedNextStatuses('pickup', s)
  );
  assert.ok(!allPickupNext.includes('out-for-delivery'));
  assert.ok(!allPickupNext.includes('ready-for-dispatch'));
  assert.ok(!allPickupNext.includes('delivered'));
});

test('TERMINAL_STATUSES matches what getAllowedNextStatuses treats as terminal', () => {
  for (const status of TERMINAL_STATUSES) {
    assert.deepEqual(getAllowedNextStatuses('pickup', status), []);
    assert.deepEqual(getAllowedNextStatuses('delivery', status), []);
  }
});
