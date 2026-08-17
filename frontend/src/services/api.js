import axios from 'axios';
import { showToast } from '../utils/toastBus.js';
import { getToken, setToken, clearToken } from './tokenStore.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add token to headers
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Silent access-token refresh ------------------------------------------
// Access tokens are now short-lived (15 min). Rather than bouncing the person
// to /login every 15 minutes, a 401 caused by an expired access token
// triggers one silent POST /auth/refresh (using the httpOnly refresh-token
// cookie), and the original request is retried once with the new token. Only
// if the refresh itself fails (refresh token expired/revoked/missing) do we
// actually treat the session as over. Concurrent 401s are coalesced into a
// single in-flight refresh call so a burst of requests doesn't fire a burst
// of refreshes.
//
// This coalescing is load-bearing, not just an optimization: the refresh
// token is single-use/rotating (see backend utils/session.js), and the
// backend treats a second presentation of an already-consumed refresh token
// as a theft/reuse signal - it revokes the *entire* session family,
// including whatever new token the first (winning) request just issued.
// AuthContext's startup effect also needs a refresh (to restore a session
// from just the cookie on page load), and React StrictMode deliberately
// double-invokes effects in dev - so without sharing this exact
// `refreshPromise`, two independent /auth/refresh calls fire on every page
// load with the same cookie, and the loser's "reuse" trips the theft
// detector and logs the person straight back out immediately after a
// successful refresh. Routing every refresh (401-triggered or startup)
// through this single function is what makes that impossible: only one
// physical HTTP request is ever in flight at a time, no matter how many
// callers ask for a refresh concurrently.
let refreshPromise = null;

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then((res) => {
        const { token } = res.data;
        setToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function clearSession() {
  clearToken();
  localStorage.removeItem('user');
}

function notifyExpiredAndRedirect(message) {
  clearSession();
  if (window.location.pathname !== '/login') {
    if (message) showToast(message, 'error');
    window.location.href = '/login';
  }
}

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url || '';
    // Auth endpoints handle their own errors with an inline form message
    // (invalid OTP, wrong password, a failed session-restore check on app
    // startup) - a toast on top of that would just be noise.
    const isAuthEndpoint = url.includes('/auth/');
    const isRefreshEndpoint = url.includes('/auth/refresh');
    const isLoginAttempt =
      url.includes('/auth/staff/login') ||
      url.includes('/auth/patient/verify-otp') ||
      url.includes('/auth/msg91-login');

    if (
      error.response?.status === 401 &&
      !isRefreshEndpoint &&
      !isLoginAttempt &&
      !error.config?._retriedAfterRefresh
    ) {
      // Try one silent refresh, then retry the original request.
      try {
        const newToken = await refreshAccessToken();
        error.config._retriedAfterRefresh = true;
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(error.config);
      } catch {
        if (isAuthEndpoint) {
          // Startup session-restore (/auth/me) or the refresh call itself
          // failing just means "there is no valid session" - clear local
          // storage and let the caller's own .catch (AuthContext) update
          // React state, so route guards redirect declaratively instead of
          // a jarring full-page navigation.
          clearSession();
        } else {
          notifyExpiredAndRedirect('Your session has expired. Please sign in again.');
        }
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && !isAuthEndpoint) {
      notifyExpiredAndRedirect('Your session has expired. Please sign in again.');
    } else if (!isAuthEndpoint && error.response?.status !== undefined) {
      // Any other failed request (validation error, permission error, server
      // error) surfaces as a toast automatically, app-wide, without every
      // call site needing to remember to show one.
      const message = error.response?.data?.error || 'Something went wrong. Please try again.';
      showToast(message, 'error');
    } else if (!isAuthEndpoint && !error.response) {
      showToast('Network error - please check your connection.', 'error');
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authService = {
  sendOTP: (phone) => api.post('/auth/patient/send-otp', { phone }),
  verifyOTP: (phone, otp, captchaId, captchaAnswer) =>
    api.post('/auth/patient/verify-otp', { phone, otp, captchaId, captchaAnswer }),
  // Real-mode patient login: frontend already verified the phone via the
  // MSG91 OTP Widget and holds a verified access-token - exchange it for
  // our own JWT. No captcha here - SMS-based phone verification via MSG91
  // is already a stronger anti-abuse control.
  msg91Login: (accessToken) => api.post('/auth/msg91-login', { accessToken }),
  staffLogin: (username, password, captchaId, captchaAnswer) =>
    api.post('/auth/staff/login', { username, password, captchaId, captchaAnswer }),
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
  // Forgot password (staff accounts, email OTP)
  forgotPasswordSendOtp: (email) => api.post('/auth/forgot-password/send-otp', { email }),
  forgotPasswordVerifyOtp: (email, otp) => api.post('/auth/forgot-password/verify-otp', { email, otp }),
  forgotPasswordReset: (email, otp, newPassword) =>
    api.post('/auth/forgot-password/reset', { email, otp, newPassword }),
  // Restore session on refresh/app startup - re-validates the token against the DB.
  getMe: () => api.get('/auth/me'),
  // Note: the raw POST /auth/refresh call intentionally isn't exposed here.
  // Use refreshAccessToken() (exported from this file) instead - it's the
  // request-coalesced version, and coalescing is load-bearing, not
  // optional. See the comment above refreshAccessToken()'s definition: the
  // refresh token is single-use/rotating, and a second independent request
  // racing on the same cookie (e.g. from React StrictMode's dev-only
  // double-invoke of effects) gets read by the backend as a replayed/stolen
  // token and revokes the entire session - which is exactly how "refreshing
  // the page logs the person out" used to happen here.
  // Server-side logout - revokes this device's refresh token, not just the
  // local copy of the access token.
  logout: () => api.post('/auth/logout'),
  // "My devices"
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  revokeAllOtherSessions: () => api.post('/auth/sessions/revoke-all'),
};

// Staff endpoints
export const staffService = {
  addStaff: (staffData) => api.post('/staff', staffData),
  getStaff: (role) => api.get('/staff', { params: { role } }),
  updateStaff: (id, data) => api.patch(`/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/staff/${id}`),
  getDoctors: (departmentId) => api.get('/staff/doctors', { params: { departmentId } }),
  getMyProfile: () => api.get('/staff/me'),
  updateMyProfile: (data) => api.patch('/staff/me', data),
};

// Appointments endpoints
export const appointmentService = {
  // Patient no longer picks a doctor - just a department + slot time; the
  // backend auto-assigns whichever doctor the admin scheduled for that slot.
  bookAppointment: (data) => api.post('/appointments', data),
  // Receptionist / admin: book on behalf of a patient (existing via patientId, or new via newPatient)
  bookForPatient: (data) => api.post('/appointments/for-patient', data),
  // Receptionist / admin: see availability status for every doctor scheduled at a department/date/time
  getAvailableDoctors: (departmentId, date, time) =>
    api.get('/appointments/available-doctors', { params: { departmentId, date, time } }),
  getMyAppointments: (date) => api.get('/appointments/mine', { params: date ? { date } : {} }),
  getAllAppointments: (filters) => api.get('/appointments', { params: filters }),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  reassignDoctor: (id, doctorId) => api.patch(`/appointments/${id}/assign-doctor`, { doctorId }),
  // Assign a doctor + any time to a "pending" General consultation request
  // (booked with no doctor/time - see Department.isGeneral).
  assignSlot: (id, doctorId, slotTime) => api.patch(`/appointments/${id}/assign`, { doctorId, slotTime }),
  cancel: (id, reason, note) => api.delete(`/appointments/${id}`, { data: { reason, note } }),
  getCancelReasons: () => api.get('/appointments/cancel-reasons'),
  getByCode: (code) => api.get(`/appointments/lookup/${encodeURIComponent(code)}`),
};

// Doctor schedule endpoints (admin sets which doctor is available for which slot)
export const scheduleService = {
  // Patient: which time slots are open for a department + date
  getAvailable: (departmentId, date) =>
    api.get('/schedule/available', { params: { departmentId, date } }),
  // Doctor: my own weekly availability
  getMine: () => api.get('/schedule/mine'),
  // Admin: view/set a specific doctor's weekly availability
  getForDoctor: (doctorId) => api.get(`/schedule/doctor/${doctorId}`),
  setForDoctor: (doctorId, departmentId, dayOfWeek, times) =>
    api.put(`/schedule/doctor/${doctorId}`, { departmentId, dayOfWeek, times }),
};

// Patient profile endpoints (name capture on first login, etc.)
export const patientService = {
  getMyProfile: () => api.get('/patients/me'),
  updateMyProfile: (data) => api.patch('/patients/me', data),
  findByPhone: (phone) => api.get(`/patients/by-phone/${encodeURIComponent(phone)}`),
  search: (q) => api.get('/patients/search', { params: { q } }),
};

// Queue endpoints
export const queueService = {
  getQueueStatus: (departmentId) => api.get(`/queue/status/${departmentId}`),
  getMyToken: () => api.get('/queue/my-token'),
};

// Queries / support tickets endpoints
export const queryService = {
  // Patient: raise a ticket -> gets a ticketId back
  create: (subject, message) => api.post('/queries', { subject, message }),
  getMine: () => api.get('/queries/mine'),
  // Admin: every ticket raised by any patient
  getAll: (status) => api.get('/queries', { params: { status } }),
  // Receptionist / admin: raise a ticket at the desk on behalf of a patient
  createOnBehalf: (patientPhone, subject, message) =>
    api.post('/queries/on-behalf', { patientPhone, subject, message }),
  // Any staff member: tickets currently redirected to me
  getAssigned: () => api.get('/queries/assigned'),
  // Admin only: redirect a ticket to any staff member and/or change its status
  manage: (id, { assignedToId, status } = {}) =>
    api.patch(`/queries/${id}/manage`, { assignedToId, status }),
  // Admin, or the staff member the ticket is assigned to
  reply: (id, reply) => api.patch(`/queries/${id}/reply`, { reply }),
  // Patient: send a follow-up message on my own ticket
  patientReply: (id, message) => api.patch(`/queries/${id}/patient-reply`, { message }),
};

// Pharmacy endpoints
export const pharmacyService = {
  createPrescription: (data) => api.post('/pharmacy/prescriptions', data),
  getPrescriptions: (filters) => api.get('/pharmacy/prescriptions', { params: filters }),
  getMyPrescriptions: () => api.get('/pharmacy/my-prescriptions'),
  updateMedicineAvailability: (prescriptionId, medicineIndex, availability, medicineId, extra = {}) =>
    api.patch(`/pharmacy/prescriptions/${prescriptionId}/availability`, {
      medicineIndex,
      availability,
      medicineId,
      ...extra,
    }),
  addMedicine: (data) => api.post('/pharmacy/medicines', data),
  getMedicines: () => api.get('/pharmacy/medicines'),
  getExpiringBatches: (days) => api.get('/pharmacy/medicines/expiring', { params: { days } }),
  deleteMedicine: (id) => api.delete(`/pharmacy/medicines/${id}`),
  addBatch: (medicineId, data) => api.post(`/pharmacy/medicines/${medicineId}/batches`, data),
};

// Leave endpoints
export const leaveService = {
  apply: (fromDate, toDate, reason, extra = {}) =>
    api.post('/leave', { fromDate, toDate, reason, ...extra }),
  getMine: () => api.get('/leave/mine'),
  getPending: () => api.get('/leave'),
  getHistory: () => api.get('/leave/history'),
  approve: (id, force) => api.patch(`/leave/${id}/approve`, { force }),
  reject: (id, rejectionReason) => api.patch(`/leave/${id}/reject`, { rejectionReason }),
};

// Departments endpoints
export const departmentService = {
  getAll: () => api.get('/departments'),
  create: (name) => api.post('/departments', { name }),
  assignDoctor: (id, doctorId) => api.patch(`/departments/${id}/assign-doctor`, { doctorId }),
  removeDoctor: (id, doctorId) => api.patch(`/departments/${id}/remove-doctor`, { doctorId }),
};

// Analytics endpoints
export const analyticsService = {
  getOverview: () => api.get('/analytics/overview'),
};

// Billing endpoints (receptionist creates/collects, admin can also view)
export const billingService = {
  create: (data) => api.post('/billing', data),
  getBills: (filters) => api.get('/billing', { params: filters }),
  getMyBills: () => api.get('/billing/my-bills'),
  getBillableItems: (appointmentCode) =>
    api.get(`/billing/billable/${encodeURIComponent(appointmentCode)}`),
  markPaid: (id, paymentMethod) => api.patch(`/billing/${id}/pay`, { paymentMethod }),
};

// Finance endpoints (admin only) - cash flow overview and salary slips
export const financeService = {
  getCashFlow: (from, to) => api.get('/finance/cashflow', { params: { from, to } }),
  createSalarySlip: (data) => api.post('/finance/salary-slips', data),
  getSalarySlips: (filters) => api.get('/finance/salary-slips', { params: filters }),
  markSalaryPaid: (id) => api.patch(`/finance/salary-slips/${id}/pay`),
  // Any staff member / admin: my own salary slips
  getMySalarySlips: () => api.get('/finance/my-salary-slips'),
};

// Admin-only: sensitive-action audit trail
export const auditLogService = {
  getLogs: (filters) => api.get('/audit-logs', { params: filters }),
};

// EMR endpoints - vitals, diagnosis, clinical notes per encounter
export const encounterService = {
  create: (data) => api.post('/encounters', data),
  getMine: () => api.get('/encounters/mine'),
  getForAppointment: (appointmentId) => api.get(`/encounters/appointment/${appointmentId}`),
};

// IPD endpoints - wards/beds and admission/transfer/discharge workflow
export const ipdService = {
  getWards: () => api.get('/ipd/wards'),
  createWard: (data) => api.post('/ipd/wards', data),
  deleteWard: (wardId) => api.delete(`/ipd/wards/${wardId}`),
  addBed: (wardId, data) => api.post(`/ipd/wards/${wardId}/beds`, data),
  deleteBed: (wardId, bedId) => api.delete(`/ipd/wards/${wardId}/beds/${bedId}`),
  updateBedStatus: (wardId, bedId, status) =>
    api.patch(`/ipd/wards/${wardId}/beds/${bedId}/status`, { status }),
  admit: (data) => api.post('/ipd/admissions', data),
  getAdmissions: (status) => api.get('/ipd/admissions', { params: { status } }),
  transfer: (id, data) => api.patch(`/ipd/admissions/${id}/transfer`, data),
  discharge: (id, data) => api.patch(`/ipd/admissions/${id}/discharge`, data),
  createBill: (id, data) => api.post(`/ipd/admissions/${id}/bill`, data),
};

// Emergency ambulance requests - the create call is public (no login required),
// so it works for anyone landing on the site in a crisis.
export const ambulanceService = {
  // Phone verification (OTP) for public ambulance requests - reduces
  // prank/spam dispatches without ever requiring an account or login.
  sendOtp: (phone) => api.post('/ambulance/send-otp', { phone }),
  create: (data, captchaId, captchaAnswer) => api.post('/ambulance', { ...data, captchaId, captchaAnswer }),
  // Reception / admin
  getAll: (status) => api.get('/ambulance', { params: { status } }),
  updateStatus: (id, status) => api.patch(`/ambulance/${id}/status`, { status }),
};

// Server-side captcha (see backend utils/captcha.js). Returns an id + an SVG
// image string to render directly; the plaintext code never reaches the client.
export const captchaService = {
  getNew: () => api.get('/captcha/new'),
  // Standalone server-side verification for flows that don't post directly
  // to one of our own protected routes (see BookAppointment.jsx's MSG91
  // send-OTP step). Single-use, same as the inline requireCaptcha checks.
  verify: (captchaId, captchaAnswer) => api.post('/captcha/verify', { captchaId, captchaAnswer }),
};

// Internal staff message board - any staff member can post; every staff
// member (across every portal) sees the same shared feed.
export const messageService = {
  getAll: () => api.get('/messages'),
  create: (message) => api.post('/messages', { message }),
  delete: (id) => api.delete(`/messages/${id}`),
};

// Public announcements (e.g. "Free OPD on 15th August") - shown on the
// landing page to visitors, managed by admin.
export const announcementService = {
  getPublic: () => api.get('/announcements/public'),
  getAll: () => api.get('/announcements'),
  create: (data) => api.post('/announcements', data),
  toggle: (id) => api.patch(`/announcements/${id}/toggle`),
  delete: (id) => api.delete(`/announcements/${id}`),
};

// Public landing-page FAQ chatbot - no login required.
export const chatbotService = {
  sendMessage: (message, history) => api.post('/chatbot/message', { message, history }),
  getSuggestions: () => api.get('/chatbot/suggestions'),
};

export default api;

// Authenticated patient portal AI assistant. Unlike the public landing chatbot,
// this endpoint can use the logged-in patient's own appointments, bills,
// prescriptions, queue and support tools.
export const patientChatbotService = {
  sendMessage: (message, history) => api.post('/patient-chatbot/message', { message, history }),
};
