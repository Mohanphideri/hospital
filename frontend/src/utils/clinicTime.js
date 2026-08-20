

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export const getClinicTodayString = () => dateToClinicDateString(new Date());

export const dateToClinicDateString = (dateLike) => {
  const utcMs = new Date(dateLike).getTime();
  const ist = new Date(utcMs + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getClinicNowTimeString = () => {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};
