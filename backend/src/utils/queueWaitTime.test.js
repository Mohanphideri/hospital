import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEstimatedWaitTime } from './queueWaitTime.js';

test('uses department-specific base wait time for queue positions', () => {
  const estimated = calculateEstimatedWaitTime({
    position: 3,
    departmentInfo: { name: 'Cardiology' },
    inProgressCount: 0,
  });

  assert.equal(estimated, 40);
});

test('adds time when another patient is already in consultation', () => {
  const estimated = calculateEstimatedWaitTime({
    position: 2,
    departmentInfo: { name: 'Pediatrics' },
    inProgressCount: 1,
  });

  assert.equal(estimated, 30);
});
