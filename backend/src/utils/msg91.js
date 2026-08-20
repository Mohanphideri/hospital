

const MSG91_VERIFY_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';

export const isMsg91Configured = () => Boolean(process.env.MSG91_AUTHKEY);

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

    
    
    
    
    
    
    
    
    
    if (/authenticationfailure/i.test(reasonStr)) {
      throw new Error(
        `${reasonStr} - MSG91_AUTHKEY is likely wrong. It must be your MSG91 account Authkey ` +
          '(dashboard > profile menu > Authkey), not the widget\'s tokenAuth value used in the frontend .env.'
      );
    }
    throw new Error(reasonStr);
  }

  
  
  
  
  
  
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

const MSG91_SMS_URL = 'https://control.msg91.com/api/v5/flow/';

export const isMsg91SmsConfigured = () =>
  Boolean(process.env.MSG91_AUTHKEY && process.env.MSG91_SMS_TEMPLATE_ID && process.env.MSG91_SMS_SENDER_ID);

const toMsg91Mobile = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

// Low-level: fire a single templated SMS through a MSG91 Flow. `variables`
// keys must match the VAR names your flow's template was built with

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