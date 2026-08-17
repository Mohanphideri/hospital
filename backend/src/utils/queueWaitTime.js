const DEFAULT_DEPARTMENT_WAIT = 15;
const DEPARTMENT_BASE_WAIT = {
  cardiology: 20,
  pediatrics: 15,
  orthopedics: 18,
  emergency: 10,
  general: 12,
  default: 15,
};

export function calculateEstimatedWaitTime({ position, departmentInfo, inProgressCount = 0 }) {
  const departmentName = (departmentInfo?.name || '').trim().toLowerCase();
  const baseMinutes = DEPARTMENT_BASE_WAIT[departmentName] || DEPARTMENT_BASE_WAIT.default;
  const currentPosition = Math.max(1, Number(position) || 1);
  const activeConsultationCount = Math.max(0, Number(inProgressCount) || 0);
  const positionOffset = Math.max(0, currentPosition - 1) * 10;

  return Math.max(DEFAULT_DEPARTMENT_WAIT, baseMinutes + positionOffset + activeConsultationCount * 5);
}
