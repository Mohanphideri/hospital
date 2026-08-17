// MSG91 OTP Widget (Web SDK - Custom UI / "exposeMethods" mode).
//
// Loads MSG91's widget script once, configures it with exposeMethods: true
// (so it never shows its own popup UI - we use our own phone/OTP inputs on
// the login/booking/emergency pages), and wraps the window.sendOtp /
// verifyOtp / retryOtp methods it exposes as promises.
//
// Captcha handling: this deployment does NOT use MSG91's built-in captcha
// (it renders as an hCaptcha widget once enabled on the MSG91 dashboard,
// and it wasn't getting cleaned up on SPA route changes - it kept showing
// up floating over unrelated pages, including staff dashboards, after a
// patient logged in and navigated away). We deliberately do not set
// `captchaRenderId` in the widget configuration below, so MSG91 never
// tries to paint a captcha into the page at all. Human verification before
// sending an OTP is instead handled by our server-issued/server-verified
// captcha (see components/CaptchaField.jsx + POST /api/captcha/verify) on
// every page that calls sendMsg91Otp().
//
// Docs: https://msg91.com/help/sendotp/how-to-integrate-the-new-login-with-otp-widget

const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID;
const TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH;

// True only when both widget env vars are set - lets the login page fall
// back to a friendly message instead of a runtime error when "Real" mode
// hasn't been configured yet (Demo mode keeps working either way).
export const isMsg91Configured = Boolean(WIDGET_ID && TOKEN_AUTH);

const WIDGET_SCRIPT_URLS = [
  'https://verify.msg91.com/otp-provider.js',
  'https://verify.phone91.com/otp-provider.js', // fallback mirror
];

// Warms up the DNS/TLS connection to MSG91 as soon as this module is
// imported, well before anyone actually switches to "Real" mode - shaves
// real, measurable time off how long OTP sending takes to first fire,
// since that connection setup no longer happens only after the user
// clicks. (No longer preconnects to Google/hCaptcha hosts - we don't load
// any captcha assets.)
if (typeof document !== 'undefined') {
  const PRECONNECT_HOSTS = ['https://verify.msg91.com', 'https://verify.phone91.com'];
  for (const href of PRECONNECT_HOSTS) {
    if (document.querySelector(`link[data-msg91-preconnect="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    link.crossOrigin = 'anonymous';
    link.dataset.msg91Preconnect = href;
    document.head.appendChild(link);
  }
}

let loadPromise = null;

// Loads the widget script exactly once and resolves once window.sendOtp /
// window.verifyOtp are available. Safe to call repeatedly - later calls
// reuse the same in-flight/completed promise instead of re-injecting the
// script tag.
export function loadMsg91Widget() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!isMsg91Configured) {
      reject(
        new Error(
          'MSG91 widget is not configured (missing VITE_MSG91_WIDGET_ID / VITE_MSG91_TOKEN_AUTH).'
        )
      );
      return;
    }

    window.configuration = {
      widgetId: WIDGET_ID,
      tokenAuth: TOKEN_AUTH,
      exposeMethods: true, // expose sendOtp/verifyOtp/retryOtp; suppresses the widget's own popup UI
      // No captchaRenderId here on purpose - see the file header comment.
      // These fire on verifyOtp regardless of whether verifyMsg91Otp()'s own
      // callbacks are also listened to - MSG91 warns you'll get double
      // events if both are used, so we keep these as harmless no-ops and
      // handle everything through the verifyMsg91Otp() promise below.
      success: () => {},
      failure: () => {},
    };

    let i = 0;
    const attempt = () => {
      const script = document.createElement('script');
      script.src = WIDGET_SCRIPT_URLS[i];
      script.async = true;
      script.onload = () => {
        if (typeof window.initSendOTP === 'function') {
          window.initSendOTP(window.configuration);
        }
        // initSendOTP() fetches the widget's config from MSG91's servers
        // asynchronously - window.sendOtp/verifyOtp aren't attached the
        // instant the script tag finishes loading, so poll briefly instead
        // of checking once immediately.
        waitForExposedMethods(resolve, reject);
      };
      script.onerror = () => {
        i += 1;
        if (i < WIDGET_SCRIPT_URLS.length) {
          attempt();
        } else {
          loadPromise = null; // allow retrying on a later call
          reject(new Error('Could not load the MSG91 widget script.'));
        }
      };
      document.head.appendChild(script);
    };
    attempt();
  });

  return loadPromise;
}

function waitForExposedMethods(resolve, reject, elapsedMs = 0) {
  if (typeof window.sendOtp === 'function' && typeof window.verifyOtp === 'function') {
    resolve();
    return;
  }
  const POLL_MS = 50;
  const TIMEOUT_MS = 6000;
  if (elapsedMs >= TIMEOUT_MS) {
    loadPromise = null; // allow retrying on a later call
    reject(
      new Error(
        'MSG91 widget script loaded but did not expose sendOtp/verifyOtp within 6s. ' +
          'Double-check VITE_MSG91_WIDGET_ID / VITE_MSG91_TOKEN_AUTH are correct for this widget.'
      )
    );
    return;
  }
  setTimeout(() => waitForExposedMethods(resolve, reject, elapsedMs + POLL_MS), POLL_MS);
}

// Forces a completely fresh widget load - clears the cached load promise,
// removes any previously injected widget <script> tags, and drops the old
// window.configuration/sendOtp/verifyOtp so the next loadMsg91Widget() call
// re-runs initSendOTP from scratch. Used as a manual recovery step if
// sendMsg91Otp()/verifyMsg91Otp() ever fail because the widget script got
// into a bad state (e.g. a flaky network on first load).
export function reloadMsg91Widget() {
  loadPromise = null;
  if (typeof document !== 'undefined') {
    for (const url of WIDGET_SCRIPT_URLS) {
      document.querySelectorAll(`script[src="${url}"]`).forEach((el) => el.remove());
    }
  }
  if (typeof window !== 'undefined') {
    delete window.sendOtp;
    delete window.verifyOtp;
    delete window.retryOtp;
  }
  return loadMsg91Widget();
}

// Sends an OTP to a mobile number or email. `identifier` must include the
// country code WITHOUT a leading '+' (e.g. "919999999999"). Callers should
// verify the captcha server-side (POST /api/captcha/verify) before calling
// this - see BookAppointment.jsx.
export async function sendMsg91Otp(identifier) {
  await loadMsg91Widget();
  return new Promise((resolve, reject) => {
    window.sendOtp(
      identifier,
      (data) => resolve(data),
      (error) => reject(error)
    );
  });
}

// Resends the OTP. Pass `null` for channel to use the widget's default
// configured channel, or one of '11' (SMS), '4' (Voice), '3' (Email),
// '12' (WhatsApp) to force a specific one.
export async function retryMsg91Otp(channel = null) {
  await loadMsg91Widget();
  return new Promise((resolve, reject) => {
    window.retryOtp(
      channel,
      (data) => resolve(data),
      (error) => reject(error)
    );
  });
}

// Verifies the OTP the user entered. On success, `data.message` is the
// verified access-token (JWT) to send to our backend at POST
// /auth/msg91-login.
export async function verifyMsg91Otp(otp) {
  await loadMsg91Widget();
  return new Promise((resolve, reject) => {
    window.verifyOtp(
      otp,
      (data) => resolve(data),
      (error) => reject(error)
    );
  });
}

// Normalizes an Indian mobile number to the digits-with-country-code format
// MSG91 expects (no leading '+'). Strips spaces/dashes, accepts numbers
// already prefixed with +91, 91, or a leading 0.
export function normalizeIndianPhoneForMsg91(raw) {
  const digits = (raw || '').replace(/[^\d]/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return null; // not a recognizable Indian mobile number
}
