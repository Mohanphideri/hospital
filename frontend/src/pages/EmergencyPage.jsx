import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Phone, MapPin, User, CheckCircle2, RotateCw, X } from "lucide-react";
import Spinner from "../components/Spinner";
import HeartMark from "../components/HeartMark";
import ambulanceHero from "../assets/ambulance-hero.png";
import { ambulanceService } from "../services/api.js";
import {
  isMsg91Configured,
  loadMsg91Widget,
  sendMsg91Otp,
  verifyMsg91Otp,
  retryMsg91Otp,
  normalizeIndianPhoneForMsg91,
} from "../utils/msg91Widget.js";
import CaptchaField from "../components/CaptchaField.jsx";
import OtpInput from "../components/OtpInput.jsx";

const initialForm = { callerName: "", phone: "", location: "", notes: "" };
const RESEND_COOLDOWN_SECONDS = 60;

// A dedicated, full page version of the emergency-request form (reached from
// the "Emergency" button on the landing page) instead of a modal, with its
// own close button that returns to the homepage. The submitted request is
// picked up live by the reception and admin "Emergency requests" screens.
//
// Phone verification runs in one of two modes:
// - "demo": fixed/dev OTP (works out of the box, no SMS actually sent)
// - "real": actual MSG91 OTP Widget - a real SMS is sent and verified
//   server-side before the request is created, same as patient login.
export default function EmergencyPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  const [otpMode, setOtpMode] = useState("demo");
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetLoadError, setWidgetLoadError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);

  // Server-side captcha (see components/CaptchaField.jsx), required by the
  // backend on the actual ambulance-request submission - shown once the OTP
  // has been entered, right before the final "Verify & request ambulance"
  // submit, for both demo and real mode.
  const submitCaptchaRef = useRef(null);
  const [submitCaptchaAnswer, setSubmitCaptchaAnswer] = useState("");

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

  const close = () => navigate("/");

  const validateDetails = () => {
    if (!form.callerName.trim() || !form.phone.trim() || !form.location.trim()) {
      setError("Please fill in your name, phone number, and location.");
      return false;
    }
    return true;
  };

  // --- Demo mode ---

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateDetails()) return;
    setSendingOtp(true);
    try {
      await ambulanceService.sendOtp(form.phone.trim());
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || "Could not send a verification code. Please call our emergency line directly.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) {
      setError("Enter the verification code we sent you.");
      return;
    }
    setSubmitting(true);
    try {
      await ambulanceService.create(
        { ...form, otp: otp.trim() },
        submitCaptchaRef.current?.captchaId,
        submitCaptchaAnswer
      );
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please call our emergency line directly.");
      submitCaptchaRef.current?.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  // --- Real mode: MSG91 OTP Widget ---

  const handleSendMsg91Otp = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateDetails()) return;

    const identifier = normalizeIndianPhoneForMsg91(form.phone);
    if (!identifier) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setSendingOtp(true);
    try {
      await sendMsg91Otp(identifier);
      setOtpSent(true);
      startResendCooldown();
    } catch (err) {
      setError(err?.message || (typeof err === "string" ? err : "Failed to send OTP. Please try again."));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendMsg91Otp = async () => {
    setError("");
    setSendingOtp(true);
    try {
      await retryMsg91Otp(null);
      startResendCooldown();
    } catch (err) {
      setError(err?.message || (typeof err === "string" ? err : "Failed to resend OTP. Please try again."));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmitMsg91 = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) {
      setError("Enter the verification code we sent you.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await verifyMsg91Otp(otp.trim());
      const accessToken = result?.message;
      if (!accessToken) {
        setError("Verification did not return an access token - please try again.");
        return;
      }
      await ambulanceService.create(
        { ...form, accessToken },
        submitCaptchaRef.current?.captchaId,
        submitCaptchaAnswer
      );
      setDone(true);
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || (typeof err === "string" ? err : "Invalid verification code")
      );
      submitCaptchaRef.current?.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const isReal = otpMode === "real";
  const onSendOtp = isReal ? handleSendMsg91Otp : handleSendOtp;
  const onSubmit = isReal ? handleSubmitMsg91 : handleSubmit;
  const canSendOtp = !isReal || (isMsg91Configured && !widgetLoadError && widgetReady);

  const switchMode = (mode) => {
    if (mode === otpMode) return;
    setOtpMode(mode);
    setOtpSent(false);
    setOtp("");
    setError("");
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center py-10 px-4">
      {/* HeartStone ambulance photo as the page backdrop, dimmed under a
          navy/crimson gradient so the white form card stays readable. */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ambulanceHero})` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(15,31,61,0.88)_0%,_rgba(15,31,61,0.82)_45%,_rgba(200,16,46,0.35)_100%)]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 rounded-full bg-white/95 pl-2 pr-4 py-1.5 shadow-sm">
            <HeartMark size={24} />
            <span className="text-sm font-semibold uppercase tracking-widest2 text-crimson">HeartStone Hospital</span>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-mist bg-white text-slate-soft shadow-sm hover:bg-mist hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative rounded-[1.75rem] bg-white shadow-[0_50px_140px_-40px_rgba(15,31,61,0.45)] p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl text-ink">{done ? "Help is on the way" : "Request an ambulance"}</h1>
              {!done && (
                <p className="mt-1 text-sm text-slate-soft">
                  For life-threatening emergencies, call your local emergency number immediately. Use this form for a hospital-dispatched ambulance.
                </p>
              )}
            </div>
            {!done && !otpSent && (
              <div className="flex shrink-0 rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                {["demo", "real"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
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

          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="rounded-full bg-emerald-50 p-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Our emergency desk has your details and will call you back right away. Keep your phone nearby.
              </p>
              <button
                onClick={close}
                className="mt-2 rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={otpSent ? onSubmit : onSendOtp} className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>If this is an immediate, life-threatening emergency, please also call your local emergency number.</span>
              </div>

              {isReal && !isMsg91Configured && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  Real SMS verification isn't configured on this deployment yet. Switch to "Demo" to continue, or ask an admin to set VITE_MSG91_WIDGET_ID / VITE_MSG91_TOKEN_AUTH and MSG91_AUTHKEY.
                </div>
              )}
              {isReal && isMsg91Configured && widgetLoadError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{widgetLoadError}</div>
              )}
              {isReal && isMsg91Configured && !widgetLoadError && !widgetReady && !otpSent && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
                  <Spinner size={14} />
                  Loading phone verification...
                </div>
              )}

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Your name</span>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.callerName}
                    onChange={(e) => setForm((p) => ({ ...p, callerName: e.target.value }))}
                    placeholder="Full name"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10 disabled:bg-slate-50 disabled:text-slate-500"
                    autoFocus
                    disabled={otpSent}
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Phone number</span>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder={isReal ? "10-digit mobile number" : "A number we can call you back on"}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10 disabled:bg-slate-50 disabled:text-slate-500"
                    disabled={otpSent}
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Location</span>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Address or landmark"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10 disabled:bg-slate-50 disabled:text-slate-500"
                    disabled={otpSent}
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">What's happening? (optional)</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Briefly describe the situation"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10 disabled:bg-slate-50 disabled:text-slate-500"
                  disabled={otpSent}
                />
              </label>

              {otpSent && (
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Verification code</span>
                  {/* 4 digits everywhere in the project, demo and real alike.
                      Real-mode SMS codes are actually generated by MSG91, so
                      make sure the MSG91 dashboard's OTP widget template is
                      set to send a 4-digit code to match this input. */}
                  <OtpInput length={4} value={otp} onChange={setOtp} />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                        setError("");
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-crimson"
                    >
                      Edit details
                    </button>
                    <button
                      type="button"
                      disabled={sendingOtp || (isReal && resendCooldown > 0)}
                      onClick={isReal ? handleResendMsg91Otp : handleSendOtp}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-crimson disabled:opacity-50"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      {isReal && resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </div>
                </label>
              )}

              {otpSent && (
                <CaptchaField ref={submitCaptchaRef} answer={submitCaptchaAnswer} onAnswerChange={setSubmitCaptchaAnswer} />
              )}

              {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

              <button
                type="submit"
                disabled={submitting || sendingOtp || (!otpSent && !canSendOtp)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors disabled:opacity-60"
              >
                {(submitting || sendingOtp) && <Spinner size={16} />}
                {otpSent
                  ? submitting
                    ? "Sending request..."
                    : "Verify & request ambulance"
                  : sendingOtp
                  ? "Sending code..."
                  : "Send verification code"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
