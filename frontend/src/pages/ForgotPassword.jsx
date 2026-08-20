import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/index.js";
import { Mail, Lock, RotateCw, CheckCircle2 } from "lucide-react";
import HeartMark from "../components/ui/HeartMark.jsx";
import OtpInput from "../components/forms/OtpInput.jsx";

const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); 
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await authService.forgotPasswordSendOtp(email.trim().toLowerCase());
      setSuccess("A reset code has been sent to your email.");
      setStep("otp");
      startCooldown();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.forgotPasswordVerifyOtp(email.trim().toLowerCase(), otp.trim());
      setStep("password");
    } catch (err) {
      setError(err.response?.data?.error || "Incorrect or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPasswordReset(email.trim().toLowerCase(), otp.trim(), newPassword);
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,16,46,0.18),_transparent_18%),_radial-gradient(circle_at_bottom_right,_rgba(15,31,61,0.08),_transparent_22%)] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-[2rem] bg-white border border-mist shadow-lg p-8 lg:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center rounded-full bg-red-50 p-3 mb-4">
              <HeartMark size={32} />
            </div>
            <h1 className="text-2xl font-display text-ink">Reset your password</h1>
            <p className="mt-2 text-sm text-slate-soft">Staff accounts only - patients sign in with a phone OTP.</p>
          </div>

          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Work email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@heartstone.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-navy focus:ring-2 focus:ring-navy/20"
                    required
                    autoFocus
                  />
                </div>
              </div>
              {error && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-light disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset code"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">4-digit code</label>
                <OtpInput length={4} value={otp} onChange={setOtp} />
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setError("");
                    }}
                    className="text-sm text-navy hover:text-navy-light"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    disabled={cooldown > 0 || loading}
                    onClick={handleSendOtp}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-navy disabled:opacity-50 disabled:hover:text-slate-500"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                </div>
              </div>
              {error && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
              {success && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">{success}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-light disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify code"}
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-navy focus:ring-2 focus:ring-navy/20"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm new password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-navy focus:ring-2 focus:ring-navy/20"
                    required
                  />
                </div>
              </div>
              {error && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-light disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm text-slate-soft">Your password has been reset. You can now log in with your new password.</p>
              <button
                onClick={() => navigate("/login")}
                className="w-full rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-light"
              >
                Back to login
              </button>
            </div>
          )}

          {step !== "done" && (
            <div className="text-center mt-6">
              <Link to="/login" className="text-sm text-slate-500 hover:text-navy">
                Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
