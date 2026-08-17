import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { authService, patientService } from "../services/api.js";
import { setToken as setStoredToken } from "../services/tokenStore.js";
import { initSocket } from "../utils/socket.js";
import { Mail, Lock, Smartphone, ShieldCheck, User, RotateCw, ArrowLeft } from "lucide-react";
import HeartMark from "../components/HeartMark.jsx";
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

const RESEND_COOLDOWN_SECONDS = 60;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, setLoading } = useAuth();
  const [loginType, setLoginType] = useState("patient");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Staff/admin sign-in captcha - server-issued and server-verified (see
  // components/CaptchaField.jsx); the plaintext code never reaches this page.
  const staffCaptchaRef = useRef(null);
  const [staffCaptchaAnswer, setStaffCaptchaAnswer] = useState("");

  // Patient demo-mode OTP verify captcha - same idea, shown alongside the
  // OTP code entry once a code has been sent. Real mode (MSG91 SMS) doesn't
  // need one - phone verification via SMS OTP is already a stronger
  // anti-abuse control than a text captcha.
  const otpCaptchaRef = useRef(null);
  const [otpCaptchaAnswer, setOtpCaptchaAnswer] = useState("");

  // A brand-new phone number has no name on file yet — it must be provided
  // before the patient can continue into the portal. An existing/recognized
  // number already has a name, so this step is skipped for them.
  const [needsName, setNeedsName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [pendingAuth, setPendingAuth] = useState(null); // { token, patient }

  // Patient phone verification runs in one of two modes, chosen at login:
  // "demo" = existing hardcoded-OTP flow (unchanged, always available), or
  // "real" = actual MSG91 OTP Widget (SMS + optional reCAPTCHA). Once real
  // mode is confirmed working end-to-end, demo mode can be retired.
  const [authMode, setAuthMode] = useState("demo");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);

  // The MSG91 widget used to only start loading the moment "Real mode" was
  // selected, which still left a visible wait. It's now preloaded as soon
  // as the patient login tab is active - by the time someone switches to
  // Real mode and clicks Send OTP, the widget is already warm in the
  // background, so there's nothing to show or wait on.
  const [widgetLoadError, setWidgetLoadError] = useState("");

  useEffect(() => {
    return () => clearInterval(cooldownRef.current);
  }, []);

  useEffect(() => {
    if (loginType !== "patient" || !isMsg91Configured) return;
    let cancelled = false;
    setWidgetLoadError("");
    loadMsg91Widget().catch((err) => {
      if (!cancelled) setWidgetLoadError(err?.message || "Could not load phone verification. Please try again.");
    });
    return () => {
      cancelled = true;
    };
  }, [loginType]);

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

  // Shared by both demo and real-mode verification - same JWT/session handling
  // either way, since MSG91 only proves phone ownership.
  const completeAuth = ({ token, patient, nameRequired }) => {
    if (nameRequired) {
      setPendingAuth({ token, patient });
      setNeedsName(true);
      return;
    }
    login(token, {
      _id: patient._id,
      phone: patient.phone,
      name: patient.name,
      role: "patient",
    });
    initSocket(token);
    navigate(location.state?.from || "/patient");
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await authService.sendOTP(phone);
      setSuccess("A verification code has been sent to your phone.");
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.verifyOTP(phone, otp, otpCaptchaRef.current?.captchaId, otpCaptchaAnswer);
      completeAuth(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP");
      otpCaptchaRef.current?.refresh();
    } finally {
      setLoading(false);
    }
  };

  // --- Real mode: MSG91 OTP Widget ---

  const handleSendMsg91OTP = async (e) => {
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
      await sendMsg91Otp(identifier);
      setOtpSent(true);
      setSuccess("A verification code has been sent to your phone.");
      startResendCooldown();
    } catch (err) {
      setError(
        err?.message || (typeof err === "string" ? err : "Failed to send OTP. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendMsg91OTP = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await retryMsg91Otp(null);
      setSuccess("A new verification code has been sent to your phone.");
      startResendCooldown();
    } catch (err) {
      setError(
        err?.message || (typeof err === "string" ? err : "Failed to resend OTP. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMsg91OTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await verifyMsg91Otp(otp);
      // MSG91 returns the verified access-token (JWT) in `result.message`.
      const accessToken = result?.message;
      if (!accessToken) {
        setError("Verification did not return an access token - please try again.");
        return;
      }
      const response = await authService.msg91Login(accessToken);
      completeAuth(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          (typeof err === "string" ? err : "Invalid OTP")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitName = async (e) => {
    e.preventDefault();
    setError("");
    if (!nameDraft.trim()) {
      setError("Please enter your name to continue.");
      return;
    }
    setLoading(true);
    try {
      const { token, patient } = pendingAuth;
      // Temporarily store the token so the authenticated /patients/me call works.
      setStoredToken(token);
      const response = await patientService.updateMyProfile({ name: nameDraft.trim() });
      const updatedPatient = response.data.patient;

      login(token, {
        _id: updatedPatient._id,
        phone: updatedPatient.phone,
        name: updatedPatient.name,
        role: "patient",
      });

      initSocket(token);
      navigate(location.state?.from || "/patient");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save your name");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const response = await authService.staffLogin(
        cleanUsername,
        password,
        staffCaptchaRef.current?.captchaId,
        staffCaptchaAnswer
      );
      const { token, user } = response.data;

      login(token, user);
      initSocket(token);

      if (user.mustResetPassword) {
        navigate("/password-reset");
      } else {
        // Every role now has its own portal path that matches its role name
        // (admin, doctor, nurse, receptionist, pharmacist, patient).
        const targetPortal = `/${user.role}`;
        navigate(location.state?.from || targetPortal);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
      staffCaptchaRef.current?.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,16,46,0.18),_transparent_18%),_radial-gradient(circle_at_bottom_right,_rgba(15,31,61,0.08),_transparent_22%)] flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-6xl mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-mist px-4 py-2 text-sm font-semibold text-slate-soft shadow-sm hover:text-crimson hover:border-crimson/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] w-full max-w-6xl">
        <aside className="rounded-[2rem] bg-white/95 border border-mist p-10 shadow-[0_40px_90px_-50px_rgba(15,31,61,0.25)]">
          <div className="flex items-center gap-3 mb-6">
            <HeartMark size={36} />
            <div>
              <p className="text-sm uppercase tracking-widest2 text-crimson">HeartStone Hospital</p>
              <h2 className="text-2xl font-display text-ink">Secure hospital access</h2>
            </div>
          </div>
          <p className="text-slate-soft leading-relaxed">
            Access your patient or staff portal to manage appointments, ward rounds, pharmacy fulfilment, and hospital operations in a single secure system.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { label: "Emergency ready", value: "24/7 queue monitoring" },
              { label: "Secure login", value: "Protected hospital network" },
              { label: "Clinical workflows", value: "Designed for care teams" },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl bg-mist/80 p-4">
                <p className="text-xs uppercase tracking-widest2 text-slate-500">{item.label}</p>
                <p className="mt-2 font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl bg-navy text-white p-6">
            <div className="flex items-center gap-3 text-sm uppercase tracking-widest2 text-slate-300">
              <ShieldCheck className="w-4 h-4" />
              Hospital-grade safety
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Single sign-on for staff, OTP-based patient access, and strict session handling keep hospital data protected.
            </p>
          </div>
        </aside>

        <div className="rounded-[2rem] bg-white border border-mist shadow-lg p-8 lg:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center rounded-full bg-red-50 p-3 mb-4">
              <HeartMark size={32} />
            </div>
            <h1 className="text-3xl font-display text-ink">Hospital portal login</h1>
            <p className="mt-2 text-slate-soft">Patient OTP and staff authentication for all hospital roles.</p>
          </div>

          <div className="bg-mist/70 rounded-3xl p-6 mb-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest2 text-slate-500">Current mode</p>
                <p className="mt-2 text-sm font-semibold text-ink">{loginType === "patient" ? "Patient access" : "Staff sign in"}</p>
              </div>
              <div className="text-xs uppercase tracking-widest2 text-crimson">Safe login</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            {needsName ? (
              <form onSubmit={handleSubmitName} className="space-y-4">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold text-ink">Welcome — you're new here</h2>
                  <p className="mt-1 text-sm text-slate-soft">
                    We don't have a name on file for this number yet. Please enter your name to
                    continue — it will appear on your prescriptions and across your portal.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Full name"
                      autoFocus
                      className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-crimson focus:ring-2 focus:ring-crimson/20"
                      required
                    />
                  </div>
                </div>
                {error && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-crimson px-4 py-3 text-sm font-semibold text-white transition hover:bg-crimson-dark"
                >
                  Continue
                </button>
              </form>
            ) : (
            <>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => {
                  setLoginType("patient");
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 py-2 rounded-2xl text-sm font-semibold transition ${
                  loginType === "patient"
                    ? "bg-crimson text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Patient
              </button>
              <button
                onClick={() => {
                  setLoginType("staff");
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 py-2 rounded-2xl text-sm font-semibold transition ${
                  loginType === "staff"
                    ? "bg-navy text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Staff
              </button>
            </div>

            {loginType === "patient" && (
              <>
                <div className="flex items-center justify-between gap-3 mb-4 rounded-2xl bg-slate-50 p-1.5">
                  <div className="flex gap-1.5">
                    {["demo", "real"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setAuthMode(m);
                          setOtpSent(false);
                          setOtp("");
                          setError("");
                          setSuccess("");
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          authMode === m ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {m === "demo" ? "Demo mode" : "Real mode (SMS)"}
                      </button>
                    ))}
                  </div>
                </div>
                {authMode === "real" && !isMsg91Configured && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 mb-4">
                    Real SMS verification isn't configured on this deployment yet - use Demo mode for now.
                  </div>
                )}
                {authMode === "real" && isMsg91Configured && widgetLoadError && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-4">
                    {widgetLoadError}
                  </div>
                )}

                <form
                  onSubmit={
                    authMode === "demo"
                      ? otpSent
                        ? handleVerifyOTP
                        : handleSendOTP
                      : otpSent
                      ? handleVerifyMsg91OTP
                      : handleSendMsg91OTP
                  }
                  className="space-y-4"
                >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mobile number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91-9876543210"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-crimson focus:ring-2 focus:ring-crimson/20"
                      disabled={otpSent}
                      required
                    />
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">OTP code</label>
                    {/* 4 digits everywhere in the project, demo and real alike.
                        Real-mode SMS codes are actually generated by MSG91, so
                        make sure the MSG91 dashboard's OTP widget template is
                        set to send a 4-digit code to match this input. */}
                    <OtpInput length={4} value={otp} onChange={setOtp} />
                    <div className="flex items-center justify-between mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp("");
                          setSuccess("");
                        }}
                        className="text-sm text-crimson hover:text-crimson-dark"
                      >
                        Change mobile number
                      </button>
                      {authMode === "real" && (
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || loading}
                          onClick={handleResendMsg91OTP}
                          className="flex items-center gap-1 text-sm text-slate-500 hover:text-crimson disabled:opacity-50 disabled:hover:text-slate-500"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {otpSent && authMode === "demo" && (
                  <CaptchaField ref={otpCaptchaRef} answer={otpCaptchaAnswer} onAnswerChange={setOtpCaptchaAnswer} />
                )}

                {error && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
                {success && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">{success}</div>}

                <button
                  type="submit"
                  disabled={loading || (authMode === "real" && !isMsg91Configured)}
                  className="w-full rounded-2xl bg-crimson px-4 py-3 text-sm font-semibold text-white transition hover:bg-crimson-dark disabled:opacity-50"
                >
                  {loading ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}
                </button>
                </form>
              </>
            )}

            {loginType === "staff" && (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g., admin or dr.smith01"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-navy focus:ring-2 focus:ring-navy/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-navy focus:ring-2 focus:ring-navy/20"
                      required
                    />
                  </div>
                  <div className="text-right mt-2">
                    <Link to="/forgot-password" className="text-sm text-navy hover:text-navy-light font-medium">
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <CaptchaField ref={staffCaptchaRef} answer={staffCaptchaAnswer} onAnswerChange={setStaffCaptchaAnswer} />

                {error && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-light"
                >
                  Login
                </button>

                <div className="text-xs text-slate-500 text-center mt-4">
                  Authorized hospital staff only. If you are a patient, use the patient access tab.
                </div>
              </form>
            )}
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
