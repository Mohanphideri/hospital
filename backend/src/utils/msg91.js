// MSG91 OTP Widget - server-side access-token verification.
//
// Flow: the frontend runs MSG91's OTP Widget (send OTP -> verify OTP), which
// on success returns a JWT "access-token" proving the phone number was
// verified. We exchange that access-token for the verified phone number here
// via MSG91's verifyAccessToken API, then issue our own app JWT exactly like
// the demo OTP flow does - MSG91 only proves phone ownership, it never
// replaces our JWT/session system.
//
// Docs: https://docs.msg91.com/otp-widget

const MSG91_VERIFY_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';

export const isMsg91Configured = () => Boolean(process.env.MSG91_AUTHKEY);

// Verifies an access-token with MSG91 and returns the verified phone number
// (identifier) plus the raw decoded payload MSG91 sent back.
export const verifyMsg91AccessToken = async (accessToken) => {
  const authkey = process.env.MSG91_AUTHKEY;
  if (!authkey) {
    throw new Error('MSG91 is not configured. Set MSG91_AUTHKEY.');
  }

  let response;
  try {
    response = await fetch(MSG91_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        authkey,
        'access-token': accessToken,
      }),
    });
  } catch (err) {
    // Network-level failure (DNS, connection refused, timeout, etc.)
    throw new Error(`Could not reach MSG91: ${err.message}`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`MSG91 returned a non-JSON response (HTTP ${response.status}).`);
  }

  if (!response.ok || data.type !== 'success') {
    const reason =
      (data && (data.message?.reason || data.message)) || `HTTP ${response.status}`;
    const reasonStr = typeof reason === 'string' ? reason : JSON.stringify(reason);

    // "AuthenticationFailure" here almost always means MSG91_AUTHKEY in the
    // backend .env is wrong for this call - most commonly because it's been
    // set to the widget's VITE_MSG91_TOKEN_AUTH value by mistake. Those are
    // two different credentials: tokenAuth is the public, widget-specific
    // value used by the frontend to open the widget; authkey is the private,
    // account-level credential (MSG91 dashboard > top-right username
    // dropdown > Authkey) used only server-side to verify the resulting
    // access-token. Swapping them in makes every verifyAccessToken call fail
    // this way even though the widget itself sends/verifies the OTP fine.
    if (/authenticationfailure/i.test(reasonStr)) {
      throw new Error(
        `${reasonStr} - MSG91_AUTHKEY is likely wrong. It must be your MSG91 account Authkey ` +
          '(dashboard > profile menu > Authkey), not the widget\'s tokenAuth value used in the frontend .env.'
      );
    }
    throw new Error(reasonStr);
  }

  // On success MSG91 returns the verified identifier (the phone number/email
  // the user authenticated with) directly as a STRING in `message`, e.g.
  // { "type": "success", "message": "919876543210" } - matching the shape
  // MSG91's other APIs (sendSMS, otp/verify, ...) use. Some widget configs
  // have been observed to instead nest it inside an object, so we handle
  // both shapes rather than assuming one.
  const raw = data.message;
  const identifier =
    typeof raw === 'string' || typeof raw === 'number'
      ? raw
      : raw && (raw.identifier || raw.mobile || raw.phone);

  if (!identifier) {
    throw new Error('MSG91 response did not include a verified phone number.');
  }

  return { identifier: String(identifier), raw };
};

// ---------------------------------------------------------------------------
// Transactional SMS (e.g. "your appointment is booked") via MSG91's Flow API.
//
// This is separate from the OTP Widget above - it needs its own DLT-approved
// template. From the MSG91 dashboard: Campaign > Flow > create a new flow
// with a message like:
//   "Dear ##name##, your appointment (##code##) with HeartStone Hospital is
//    confirmed for ##time##. - HeartStone Hospital"
// The ##variable## names must match exactly (case-sensitive) what you pass
// as VAR1/VAR2/... below (order matters, not the var name you send).
// Copy the resulting Flow's template_id and your approved Sender ID (6
// letters, e.g. HRTSTN) into .env as MSG91_SMS_TEMPLATE_ID / MSG91_SMS_SENDER_ID.
//
// Docs: https://docs.msg91.com/p/tf9GTinA1/e/le1zN1Ry2Nv/Send-SMS

const MSG91_SMS_URL = 'https://control.msg91.com/api/v5/flow/';

export const isMsg91SmsConfigured = () =>
  Boolean(process.env.MSG91_AUTHKEY && process.env.MSG91_SMS_TEMPLATE_ID && process.env.MSG91_SMS_SENDER_ID);

// Normalizes a stored patient phone number into MSG91's expected
// "countrycode+number" digits-only format (defaults to India, 91).
const toMsg91Mobile = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

// Low-level: fire a single templated SMS through a MSG91 Flow. `variables`
// keys must match the VAR names your flow's template was built with
// (commonly VAR1, VAR2, ... unless you named custom variables in MSG91).
export const sendMsg91Sms = async (phone, variables = {}) => {
  const authkey = process.env.MSG91_AUTHKEY;
  const template_id = process.env.MSG91_SMS_TEMPLATE_ID;
  const sender = process.env.MSG91_SMS_SENDER_ID;

  if (!authkey || !template_id || !sender) {
    throw new Error('MSG91 SMS is not configured. Set MSG91_AUTHKEY, MSG91_SMS_TEMPLATE_ID, MSG91_SMS_SENDER_ID.');
  }

  const mobiles = toMsg91Mobile(phone);
  if (!mobiles) {
    throw new Error('No valid phone number to send SMS to.');
  }

  let response;
  try {
    response = await fetch(MSG91_SMS_URL, {
      method: 'POST',
      headers: {
        authkey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ template_id, sender, mobiles, ...variables }),
    });
  } catch (err) {
    throw new Error(`Could not reach MSG91: ${err.message}`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`MSG91 returned a non-JSON response (HTTP ${response.status}).`);
  }

  if (!response.ok || data.type !== 'success') {
    const reason = (data && (data.message || data.error)) || `HTTP ${response.status}`;
    throw new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
  }

  return data;
};

// High-level helper used right after an appointment is created. Never
// throws - a failed confirmation SMS should never roll back or fail the
// booking itself, so callers just fire-and-forget this and log on error.
export const sendAppointmentConfirmationSms = async (phone, { patientName, appointmentCode, whenText }) => {
  if (!isMsg91SmsConfigured()) {
    console.log(`[SMS SKIPPED - not configured] Would notify ${phone}: appointment ${appointmentCode} booked`);
    return { skipped: true };
  }

  try {
    await sendMsg91Sms(phone, {
      VAR1: patientName || 'Patient',
      VAR2: appointmentCode || '',
      VAR3: whenText || '',
    });
    return { skipped: false, sent: true };
  } catch (err) {
    console.error('Appointment Confirmation SMS Error:', err.message);
    return { skipped: false, sent: false, error: err.message };
  }
};