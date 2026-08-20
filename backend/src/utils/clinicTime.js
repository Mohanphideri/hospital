

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

export const toClinicParts = (dateLike) => {
  const utcMs = new Date(dateLike).getTime();
  const ist = new Date(utcMs + IST_OFFSET_MS);

  const dayOfWeek = ist.getUTCDay();
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');

  return { dayOfWeek, time: `${hh}:${mm}` };
};

export const toClinicDateString = (dateLike) => {
  const utcMs = new Date(dateLike).getTime();
  const ist = new Date(utcMs + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const isFutureClinicDate = (dateLike) => {
  const target = toClinicDateString(dateLike);
  const today = toClinicDateString(new Date());
  return target > today; 
};

export const dateStringDayOfWeek = (dateStr) => new Date(dateStr).getUTCDay();

export const clinicDayBounds = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS;
  const startOfDay = new Date(startUtcMs);
  const endOfDay = new Date(startUtcMs + 24 * 60 * 60 * 1000 - 1);
  return { startOfDay, endOfDay };
};

export const clinicDateTimeToInstant = (dateStr, hhmm) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, 0, 0) - IST_OFFSET_MS;
  return new Date(utcMs);
};
