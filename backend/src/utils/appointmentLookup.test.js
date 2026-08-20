import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveLookupCode, normalizeLookupCode, maskPhone } from './appointmentLookup.js';

test('deriveLookupCode takes the final 4 alphanumeric characters, uppercased', () => {
  assert.equal(deriveLookupCode('APT-260818-a7k9'), 'A7K9');
});

test('deriveLookupCode ignores separators and just takes the last 4 alnum chars', () => {
  assert.equal(deriveLookupCode('APT-20260818-A7K92X'), 'K92X');
});

test('deriveLookupCode returns null for codes shorter than 4 alphanumeric chars', () => {
  assert.equal(deriveLookupCode('AB'), null);
  assert.equal(deriveLookupCode(''), null);
  assert.equal(deriveLookupCode(null), null);
});

test('normalizeLookupCode uppercases and trims a valid code', () => {
  assert.deepEqual(normalizeLookupCode(' a7k9 '), { code: 'A7K9' });
});

test('normalizeLookupCode rejects anything not exactly 4 alphanumeric chars', () => {
  assert.ok(normalizeLookupCode('A7K').error);
  assert.ok(normalizeLookupCode('A7K99').error);
  assert.ok(normalizeLookupCode('A7-9').error);
  assert.ok(normalizeLookupCode('').error);
  assert.ok(normalizeLookupCode(undefined).error);
});

test('maskPhone hides the middle digits of a 10-digit number', () => {
  assert.equal(maskPhone('9876543210'), '98XXXXX210');
});

test('maskPhone handles short/edge-case input without throwing', () => {
  assert.equal(maskPhone(''), '');
  assert.equal(maskPhone('123'), 'XXX');
});
