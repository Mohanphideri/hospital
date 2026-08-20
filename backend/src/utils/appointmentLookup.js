

export const deriveLookupCode = (appointmentCode) => {
  if (!appointmentCode) return null;
  const alnumOnly = String(appointmentCode).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (alnumOnly.length < 4) return null;
  return alnumOnly.slice(-4);
};

// Normalize + validate a code a staff member typed in: trim whitespace,
// uppercase it, and require exactly four alphanumeric characters. Returns
// `{ code }` on success or `{ error }` on failure - never throws, so
// callers can respond with a clean 400 instead of a 500.
export const normalizeLookupCode = (raw) => {
  const trimmed = String(raw ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(trimmed)) {
    return { error: 'Enter exactly 4 letters/numbers from the appointment ID.' };
  }
  return { code: trimmed };
};

// Mask a phone number for display in a multi-match disambiguation list -
// enough for staff to recognize "is this the patient I have on the phone",
// not enough to be useful to someone who doesn't already know the number.

export const maskPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length <= 4) return digits ? 'X'.repeat(digits.length) : '';
  const head = digits.slice(0, 2);
  const tail = digits.slice(-3);
  const maskedLen = digits.length - head.length - tail.length;
  return `${head}${'X'.repeat(Math.max(maskedLen, 0))}${tail}`;
};
