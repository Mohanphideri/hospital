import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { RotateCw } from "lucide-react";
import { captchaService } from "../services/api.js";

// Replaces the old fully-client-side captcha (which generated AND checked
// its own code in the browser - trivially bypassed by calling the API
// directly). This one only ever holds a challenge id and the SVG image the
// server rendered; the actual code lives and is checked server-side.
//
// Usage: attach the ref, read `.captchaId` and pass along whatever the user
// typed as `captchaAnswer` when submitting the form. Call `.refresh()` (or
// let the component do it automatically) after a failed submission, since
// each challenge is single-use.
const CaptchaField = forwardRef(function CaptchaField({ answer, onAnswerChange }, ref) {
  const [captchaId, setCaptchaId] = useState(null);
  const [svg, setSvg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNew = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await captchaService.getNew();
      setCaptchaId(res.data.captchaId);
      setSvg(res.data.svg);
      onAnswerChange("");
    } catch {
      setError("Couldn't load the captcha - check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [onAnswerChange]);

  useEffect(() => {
    fetchNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({ captchaId, refresh: fetchNew }));

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Security check</label>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-[150px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {loading ? (
            <span className="text-xs text-slate-400">Loading...</span>
          ) : (
            // Server-rendered SVG - safe to inject as markup, it's our own
            // API response (an image), never user-supplied HTML.
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </div>
        <button
          type="button"
          onClick={fetchNew}
          disabled={loading}
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          aria-label="Get a new captcha"
        >
          <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <input
          type="text"
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Enter the code"
          autoComplete="off"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-crimson focus:outline-none focus:ring-2 focus:ring-crimson/20"
          required
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

export default CaptchaField;
