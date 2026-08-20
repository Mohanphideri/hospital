

const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID;
const TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH;

export const isMsg91Configured = Boolean(WIDGET_ID && TOKEN_AUTH);

const WIDGET_SCRIPT_URLS = [
  'https://verify.msg91.com/otp-provider.js',
  'https://verify.phone91.com/otp-provider.js', 
];

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
      exposeMethods: true, 
      
      
      
      
      
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
        
        
        
        
        waitForExposedMethods(resolve, reject);
      };
      script.onerror = () => {
        i += 1;
        if (i < WIDGET_SCRIPT_URLS.length) {
          attempt();
        } else {
          loadPromise = null; 
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
    loadPromise = null; 
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

export function normalizeIndianPhoneForMsg91(raw) {
  const digits = (raw || '').replace(/[^\d]/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return null; 
}
