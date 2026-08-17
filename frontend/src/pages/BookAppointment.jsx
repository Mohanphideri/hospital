import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, CalendarCheck, Smartphone, Lock, CheckCircle2, Building2, Clock, Phone, RotateCw, User, Mail } from "lucide-react";
import Spinner from "../components/Spinner";
import HeartMark from "../components/HeartMark";
import Modal from "../components/Modal.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { initSocket } from "../utils/socket.js";
import { authService, patientService, departmentService, scheduleService, appointmentService, captchaService } from "../services/api.js";
import { setToken as setStoredToken } from "../services/tokenStore.js";
import {
  isMsg91Configured,
  loadMsg91Widget,
  sendMsg91Otp,
  verifyMsg91Otp,
  retryMsg91Otp,
  normalizeIndianPhoneForMsg91,
} from "../utils/msg91Widget.js";
import CaptchaField from "../components/CaptchaField.jsx";

const RESEND_COOLDOWN_SECONDS = 60;

// A dedicated, single-purpose page: verify phone with OTP, pick a department
// + slot, done. Nothing else on this page - no navbar links, no chatbot, no
// facilities/marketing sections - just the one thing the person came here to
// do. Reached directly from the "Book an appointment" button on the landing
// page instead of opening as a modal over it.
export default function BookAppointment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  // step: "phone" -> "otp" -> "name" (only for brand-new numbers that didn't
  // enter a name upfront) -> "book" -> "done"
  const [step, setStep] = useState(user?.role === "patient" ? "book" : "phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingAuth, setPendingAuth] = useState(null); // { token, patient } while step === "name"

  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  // An email is required to book (that's what the confirmation email goes
  // to). This landing-page flow always asks the patient to type it in here,
  // every time - it deliberately does NOT silently reuse whatever email may
  // already be on file for their profile, so the patient always sees and
  // confirms exactly where the confirmation is going.
  const [emailInput, setEmailInput] = useState("");

  // Phone verification mode - "demo" (fixed/dev OTP) or "real" (actual
  // MSG91 SMS OTP Widget), same choice offered on the staff/patient login
  // page. Real mode sends an actual text message and verifies it
  // server-side before logging the patient in.
  const [otpMode, setOtpMode] = useState("demo");
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetLoadError, setWidgetLoadError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);

  // Server-issued/server-verified captcha (see components/CaptchaField.jsx).
  // Real (MSG91) mode shows it before "Send verification code" - that call
  // goes straight from the browser to MSG91, not through our backend, so we
  // gate it via the standalone /captcha/verify endpoint instead of an
  // action route. Demo mode shows it alongside the OTP itself, since
  // /auth/patient/verify-otp requires captchaId/captchaAnswer server-side.
  const sendCaptchaRef = useRef(null);
  const [sendCaptchaAnswer, setSendCaptchaAnswer] = useState("");
  const verifyCaptchaRef = useRef(null);
  const [verifyCaptchaAnswer, setVerifyCaptchaAnswer] = useState("");

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  useEffect(() => {
    if (otpMode !== "real" || !isMsg91Configured) return;
    let cancelled = false;
    setWidgetReady(false);
    setWidgetLoadError("");
    loadMsg91Widget()
      .then(() => {
        if (!cancelled) setWidgetReady(true);
      })
      .catch((err) => {
        if (!cancelled) setWidgetLoadError(err?.message || "Could not load phone verification. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [otpMode]);

  const startResendCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const switchOtpMode = (mode) => {
    if (mode === otpMode) return;
    setOtpMode(mode);
    setOtp("");
    setError("");
    setSuccess("");
    sendCaptchaRef.current?.refresh();
    verifyCaptchaRef.current?.refresh();
  };

  useEffect(() => {
    if (step === "book" && departments.length === 0) {
      departmentService
        .getAll()
        .then((res) => setDepartments(res.data || []))
        .catch(() => setError("Failed to load departments"));
    }
  }, [step]);

  const completeAuth = async ({ token, patient, nameRequired }) => {
    if (nameRequired) {
      // Brand-new phone number. If they already typed a name on the phone
      // step, save it immediately and go straight into booking - no detour,
      // no losing their place. Only fall back to a dedicated "name" step if
      // they left it blank.
      if (name.trim()) {
        try {
          setStoredToken(token);
          const response = await patientService.updateMyProfile({ name: name.trim() });
          const updatedPatient = response.data.patient;
          login(token, {
            _id: updatedPatient._id,
            phone: updatedPatient.phone,
            name: updatedPatient.name,
            role: "patient",
          });
          initSocket(token);
          setStep("book");
          return;
        } catch {
          // Fall through to the manual name step below if this failed.
        }
      }
      setPendingAuth({ token, patient });
      setStep("name");
      return;
    }
    login(token, {
      _id: patient._id,
      phone: patient.phone,
      name: patient.name,
      role: "patient",
    });
    initSocket(token);
    setStep("book");
  };

  const handleSubmitName = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Please enter your name to continue.");
      return;
    }
    setLoading(true);
    try {
      const { token, patient } = pendingAuth;
      setStoredToken(token);
      const response = await patientService.updateMyProfile({ name: name.trim() });
      const updatedPatient = response.data.patient;
      login(token, {
        _id: updatedPatient._id,
        phone: updatedPatient.phone,
        name: updatedPatient.name,
        role: "patient",
      });
      initSocket(token);
      setStep("book");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save your name");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.sendOTP(phone);
      setSuccess("A verification code has been sent to your phone.");
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await authService.verifyOTP(
        phone,
        otp,
        verifyCaptchaRef.current?.captchaId,
        verifyCaptchaAnswer
      );
      await completeAuth(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid verification code");
      // Every challenge is single-use (consumed whether it passed or failed),
      // so a failed submission - captcha or otherwise - needs a fresh one.
      verifyCaptchaRef.current?.refresh();
    } finally {
      setLoading(false);
    }
  };

  // --- Real mode: MSG91 OTP Widget ---

  const handleSendMsg91Otp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const identifier = normalizeIndianPhoneForMsg91(phone);
    if (!identifier) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    try {
      // sendMsg91Otp() goes straight from the browser to MSG91, not through
      // our backend, so the only way to actually enforce the captcha
      // server-side here is a standalone check first - see routes/captcha.js.
      try {
        await captchaService.verify(sendCaptchaRef.current?.captchaId, sendCaptchaAnswer);
      } catch {
        setError("The captcha code doesn't match. Please try again.");
        sendCaptchaRef.current?.refresh();
        return;
      }

      await sendMsg91Otp(identifier);
      setSuccess("A verification code has been sent to your phone.");
      startResendCooldown();
      setStep("otp");
    } catch (err) {
      setError(err?.message || (typeof err === "string" ? err : "Failed to send OTP. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleResendMsg91Otp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await retryMsg91Otp(null);
      setSuccess("A new verification code has been sent to your phone.");
      startResendCooldown();
    } catch (err) {
      setError(err?.message || (typeof err === "string" ? err : "Failed to resend OTP. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMsg91Otp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await verifyMsg91Otp(otp);
      const accessToken = result?.message;
      if (!accessToken) {
        setError("Verification did not return an access token - please try again.");
        return;
      }
      const response = await authService.msg91Login(accessToken);
      await completeAuth(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || (typeof err === "string" ? err : "Invalid verification code")
      );
    } finally {
      setLoading(false);
    }
  };

  const isReal = otpMode === "real";
  const onSendOtp = isReal ? handleSendMsg91Otp : handleSendOtp;
  const onVerifyOtp = isReal ? handleVerifyMsg91Otp : handleVerifyOtp;
  const canSendOtp = !isReal || (isMsg91Configured && !widgetLoadError && widgetReady);

  const fetchSlots = async (deptId, d) => {
    if (!deptId || !d) return;
    setSlotsLoading(true);
    setError("");
    try {
      const response = await scheduleService.getAvailable(deptId, d);
      setSlots((response.data || []).filter((s) => s.available));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load available slots");
    } finally {
      setSlotsLoading(false);
    }
  };

  // Nothing books the moment a slot/button is clicked - it just opens a
  // "confirm this appointment?" dialog first. { time } for a normal slot
  // booking, or { general: true } for a General-consultation request.
  const [pendingConfirm, setPendingConfirm] = useState(null);

  const runBooking = async (time) => {
    setError("");
    try {
      const payload = { departmentId };
      if (time) {
        const [hh, mm] = time.split(":").map(Number);
        const slotDate = new Date(date);
        slotDate.setHours(hh, mm, 0, 0);
        payload.slotTime = slotDate.toISOString();
      }
      payload.email = emailInput.trim();
      const response = await appointmentService.bookAppointment(payload);
      setConfirmed(response.data?.appointment);
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to book appointment");
    }
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const requireEmailFirst = () => {
    if (!emailInput.trim() || !EMAIL_REGEX.test(emailInput.trim())) {
      setError("Please enter a valid email address — we'll send your appointment confirmation there.");
      return false;
    }
    return true;
  };

  const handleBook = (time) => {
    if (!requireEmailFirst()) return;
    setPendingConfirm({ time });
  };

  const selectedDepartment = departments.find((d) => d._id === departmentId);
  const isGeneralDepartment = Boolean(selectedDepartment?.isGeneral);

  const handleBookGeneral = () => {
    if (!requireEmailFirst()) return;
    setPendingConfirm({ general: true });
  };

  const confirmYes = async () => {
    const details = pendingConfirm;
    setPendingConfirm(null);
    if (!details) return;
    setLoading(true);
    await runBooking(details.time);
    setLoading(false);
  };

  const confirmNo = () => setPendingConfirm(null);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,16,46,0.10),_transparent_20%),_radial-gradient(circle_at_bottom_right,_rgba(15,31,61,0.06),_transparent_24%)] flex flex-col">
      {/* Minimal header - brand mark + a way back, nothing else. No nav
          links, no chatbot, no facilities/marketing - just the booking task. */}
      <header className="border-b border-mist bg-white/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <HeartMark size={30} />
            <div className="font-display text-lg">
              <span className="text-crimson">Heart</span>
              <span className="text-navy">Stone</span>
            </div>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-soft hover:text-crimson transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-[1.75rem] bg-white border border-mist shadow-[0_40px_120px_-40px_rgba(15,31,61,0.25)] p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center justify-center rounded-full bg-crimson/10 p-3 mb-4">
                <CalendarCheck className="w-5 h-5 text-crimson" />
              </div>
              <h1 className="font-display text-2xl text-ink">
                {step === "done" ? "You're booked" : "Book an appointment"}
              </h1>
              <p className="mt-1 text-sm text-slate-soft">
                {step === "phone"
                  ? "We just need your name and phone number - no separate account needed."
                  : step === "otp"
                  ? `Enter the code sent to ${phone}`
                  : step === "name"
                  ? "One last thing - what should we call you?"
                  : step === "book"
                  ? "Choose a department, date, and time that works for you."
                  : undefined}
              </p>
            </div>
            {(step === "phone" || step === "otp") && (
              <div className="flex shrink-0 rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                {["demo", "real"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchOtpMode(m)}
                    className={`rounded-full px-3 py-1.5 transition-colors ${
                      otpMode === m ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {m === "demo" ? "Demo" : "Real SMS"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {step === "phone" && (
            <form onSubmit={onSendOtp} className="space-y-4">
              {isReal && !isMsg91Configured && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  Real SMS verification isn't configured on this deployment yet. Switch to "Demo" to continue.
                </div>
              )}
              {isReal && isMsg91Configured && widgetLoadError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{widgetLoadError}</div>
              )}
              {isReal && isMsg91Configured && !widgetLoadError && !widgetReady && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
                  <Spinner size={14} />
                  Loading phone verification...
                </div>
              )}
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Patient name</span>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                    required
                  />
                </div>
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Mobile number</span>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={isReal ? "10-digit mobile number" : "+91-9876543210"}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                    required
                  />
                </div>
              </label>
              {isReal && (
                <CaptchaField ref={sendCaptchaRef} answer={sendCaptchaAnswer} onAnswerChange={setSendCaptchaAnswer} />
              )}
              {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
              <button
                type="submit"
                disabled={loading || !canSendOtp}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors disabled:opacity-60"
              >
                {loading && <Spinner size={16} />}
                {loading ? "Sending code..." : "Send verification code"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={onVerifyOtp} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Verification code (OTP)</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter code"
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                    required
                  />
                </div>
              </label>
              {!isReal && (
                <CaptchaField ref={verifyCaptchaRef} answer={verifyCaptchaAnswer} onAnswerChange={setVerifyCaptchaAnswer} />
              )}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); setSuccess(""); }}
                  className="text-sm text-crimson hover:text-crimson-dark"
                >
                  Use a different number
                </button>
                {isReal && (
                  <button
                    type="button"
                    disabled={loading || resendCooldown > 0}
                    onClick={handleResendMsg91Otp}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-crimson disabled:opacity-50"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                )}
              </div>
              {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{success}</div>}
              {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors disabled:opacity-60"
              >
                {loading && <Spinner size={16} />}
                {loading ? "Verifying..." : "Verify & continue"}
              </button>
            </form>
          )}

          {step === "name" && (
            <form onSubmit={handleSubmitName} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Your name</span>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                    required
                  />
                </div>
              </label>
              {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors disabled:opacity-60"
              >
                {loading && <Spinner size={16} />}
                {loading ? "Saving..." : "Continue to booking"}
              </button>
            </form>
          )}

          {step === "book" && (
            <div className="space-y-5">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Department</span>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <select
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setSlots([]);
                      const dept = departments.find((d) => d._id === e.target.value);
                      if (e.target.value && !dept?.isGeneral) fetchSlots(e.target.value, date);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                  >
                    <option value="">Select a department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                        {d.isGeneral ? " (not sure? start here)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Email address</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-ink focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                  />
                </div>
                <span className="block text-xs text-slate-soft">We'll send your appointment ID, date and time here — required every time you book.</span>
              </label>

              {isGeneralDepartment ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-mist/70 p-4 text-sm text-slate-soft leading-relaxed">
                    No need to pick a time for a general consultation — just submit your request and
                    our front desk will confirm a doctor and time with you shortly.
                  </div>
                  {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
                  <button
                    onClick={handleBookGeneral}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors disabled:opacity-60"
                  >
                    {loading && <Spinner size={16} />}
                    {loading ? "Submitting..." : "Request consultation"}
                  </button>
                </div>
              ) : (
                <>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Date</span>
                    <div className="relative">
                      <input
                        type="date"
                        value={date}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => {
                          setDate(e.target.value);
                          setSlots([]);
                          if (departmentId) fetchSlots(departmentId, e.target.value);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                      />
                    </div>
                  </label>

                  {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

                  {slotsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-soft">
                      <Spinner size={18} className="text-crimson" />
                      Checking availability...
                    </div>
                  ) : departmentId && slots.length === 0 ? (
                    <div className="rounded-xl bg-mist/70 p-4 text-sm text-slate-soft text-center">
                      No open slots for this date — try another day.
                    </div>
                  ) : slots.length > 0 ? (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-soft/80">
                        <Clock className="w-3.5 h-3.5" /> Available times
                      </div>
                      <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                        {slots.map((s) => (
                          <button
                            key={s.time}
                            onClick={() => handleBook(s.time)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink hover:border-crimson/50 hover:bg-crimson/5 transition-colors"
                          >
                            {s.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="rounded-full bg-emerald-50 p-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {confirmed?.appointmentCode ? (
                  confirmed?.doctorId ? (
                    <>Your appointment is confirmed. Your appointment ID is <span className="font-semibold text-ink">{confirmed.appointmentCode}</span> — keep it handy for check-in.</>
                  ) : (
                    <>Your request has been received. Your appointment ID is <span className="font-semibold text-ink">{confirmed.appointmentCode}</span> — our front desk will confirm a doctor and time with you shortly.</>
                  )
                ) : (
                  "Your appointment is confirmed."
                )}
              </p>
              {confirmed?.dailyToken != null && (
                <div className="w-full rounded-xl border border-slate-200 bg-mist/70 p-4 text-sm text-ink space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-soft">Your token</span>
                    <span className="font-semibold text-lg">
                      #{confirmed.dailyToken}
                      {confirmed.slotPosition > 1 && (
                        <span className="ml-1 text-xs font-normal text-slate-soft">
                          ({confirmed.dailyToken - confirmed.slotPosition} + {confirmed.slotPosition})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-soft">Position in this slot</span>
                    <span className="font-semibold">#{confirmed.slotPosition}</span>
                  </div>
                  {confirmed.estimatedTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-soft">Estimated turn</span>
                      <span className="font-semibold">
                        ~{new Date(confirmed.estimatedTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  <p className="pt-1 text-xs text-slate-soft">
                    Estimates assume about 15 minutes per patient ahead of you and can shift a little if a consultation runs long.
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full">
                <Link
                  to="/"
                  className="flex-1 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mist transition-colors text-center"
                >
                  Back to home
                </Link>
                <button
                  onClick={() => navigate("/patient")}
                  className="flex-1 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
                >
                  View my account
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Emergency line stays reachable even on this focused page. */}
      <footer className="border-t border-mist bg-white/70">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-center gap-2 text-xs text-slate-soft">
          <Phone className="w-3.5 h-3.5 text-crimson" />
          Medical emergency? Call
          <a href="tel:+911610000911" className="font-semibold text-crimson hover:text-crimson-dark">+91-161-000-0911</a>
        </div>
      </footer>

      {/* Nothing books until the person explicitly says yes here. */}
      <Modal open={Boolean(pendingConfirm)} onClose={confirmNo} title="Confirm your appointment">
        {pendingConfirm && (
          <div className="space-y-5">
            <div className="rounded-xl bg-mist/70 p-4 text-sm text-ink space-y-1.5">
              <div><span className="text-slate-soft">Department:</span> <span className="font-semibold">{selectedDepartment?.name || "—"}</span></div>
              {pendingConfirm.time ? (
                <>
                  <div><span className="text-slate-soft">Date:</span> <span className="font-semibold">{new Date(date).toLocaleDateString([], { dateStyle: "medium" })}</span></div>
                  <div><span className="text-slate-soft">Time:</span> <span className="font-semibold">{pendingConfirm.time}</span></div>
                </>
              ) : (
                <div className="text-slate-soft">No time slot needed — our front desk will confirm a doctor and time with you shortly.</div>
              )}
            </div>
            <p className="text-sm text-slate-soft">Do you want to confirm this appointment?</p>
            <div className="flex items-center gap-3">
              <button
                onClick={confirmNo}
                className="flex-1 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mist transition-colors"
              >
                No, go back
              </button>
              <button
                onClick={confirmYes}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-crimson px-5 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark disabled:opacity-60 transition-colors"
              >
                {loading && <Spinner size={16} />}
                {loading ? "Booking..." : "Yes, confirm"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
