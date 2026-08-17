// Sends transactional email via Brevo's HTTPS API (https://api.brevo.com).
// Deliberately uses plain fetch instead of Brevo's SDK - one less dependency,
// and Node 18+ (Render's default) has fetch built in.

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

export const isEmailConfigured = () =>
  Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);

// Branded password-reset OTP email. Kept as a single self-contained template
// function (no external template engine) since it's the only transactional
// email this app sends today.
function otpEmailHtml({ name, otp, minutesValid }) {
  return `
  <div style="background:#F4F5F7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
      <tr>
        <td style="background:#0F1F3D;padding:24px 32px;">
          <span style="color:#E63950;font-size:20px;font-weight:700;">Heart</span><span style="color:#FFFFFF;font-size:20px;font-weight:700;">Stone</span>
          <div style="color:#B9C2D0;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-top:4px;">HeartStone Hospital</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h1 style="font-size:18px;color:#0F1F3D;margin:0 0 12px;">Password reset code</h1>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">
            ${name ? `Hi ${name}, use` : 'Use'} the code below to reset your HeartStone staff account password.
          </p>
          <div style="background:#F4F5F7;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
            <span style="font-size:32px;letter-spacing:8px;font-weight:700;color:#0F1F3D;">${otp}</span>
          </div>
          <p style="font-size:13px;color:#64748B;line-height:1.6;margin:0 0 8px;">
            This code expires in <strong>${minutesValid} minutes</strong>.
          </p>
          <p style="font-size:13px;color:#64748B;line-height:1.6;margin:0;">
            If you did not request this code, please ignore this email - your password will not be changed, and you don't need to take any action.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;background:#F4F5F7;border-top:1px solid #E5E7EB;">
          <p style="font-size:11px;color:#94A3B8;margin:0;">
            © ${new Date().getFullYear()} HeartStone Hospital. This is an automated message.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

// Parses "Name <email@example.com>" or a bare "email@example.com" into the
// { name, email } shape Brevo's API expects.
function parseAddress(raw) {
  const match = raw.match(/^(.*)<(.+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() };
  }
  return { email: raw.trim() };
}

// Shared low-level sender - every transactional email (password reset,
// appointment confirmation, ...) goes through this one Brevo API call.
// `attachments`, if given, is an array of { name, base64 } - Brevo's API
// takes the file content as a base64 string directly (no multipart upload
// needed), which is convenient since PDFs are already generated in-memory
// as bytes (see utils/prescriptionPdf.js) and never touch disk.
async function sendEmail({ to, name, subject, html, attachments }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('Email is not configured. Set BREVO_API_KEY and EMAIL_FROM.');
  }

  const body = {
    sender: parseAddress(process.env.EMAIL_FROM),
    to: [name ? { email: to, name } : { email: to }],
    subject,
    htmlContent: html,
  };

  if (Array.isArray(attachments) && attachments.length > 0) {
    body.attachment = attachments.map((a) => ({ name: a.name, content: a.base64 }));
  }

  if (process.env.EMAIL_REPLY_TO) {
    body.replyTo = parseAddress(process.env.EMAIL_REPLY_TO);
  }

  const response = await fetch(BREVO_SEND_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Brevo error (${response.status}): ${errBody}`);
  }
}

export const sendPasswordResetOtpEmail = async (toEmail, name, otp, minutesValid = 10) => {
  await sendEmail({
    to: toEmail,
    name,
    subject: 'Your HeartStone password reset code',
    html: otpEmailHtml({ name, otp, minutesValid }),
  });
};

// Branded appointment-confirmation email. whenText/department/doctorName are
// all optional - a General-consultation request booked with no time/doctor
// yet still gets a "we've got your request" email, just without those rows.
function appointmentEmailHtml({ name, appointmentCode, whenText, departmentName, doctorName }) {
  const rows = [
    { label: 'Appointment ID', value: appointmentCode },
    departmentName && { label: 'Department', value: departmentName },
    doctorName && { label: 'Doctor', value: doctorName },
    { label: 'When', value: whenText || 'To be confirmed by our front desk' },
  ].filter(Boolean);

  return `
  <div style="background:#F4F5F7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
      <tr>
        <td style="background:#0F1F3D;padding:24px 32px;">
          <span style="color:#E63950;font-size:20px;font-weight:700;">Heart</span><span style="color:#FFFFFF;font-size:20px;font-weight:700;">Stone</span>
          <div style="color:#B9C2D0;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-top:4px;">HeartStone Hospital</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h1 style="font-size:18px;color:#0F1F3D;margin:0 0 12px;">Your appointment is booked</h1>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">
            ${name ? `Hi ${name}, here` : 'Here'} are the details of your appointment with HeartStone Hospital.
          </p>
          <table role="presentation" width="100%" style="background:#F4F5F7;border-radius:12px;margin-bottom:24px;">
            ${rows
              .map(
                (r, i) => `
              <tr>
                <td style="padding:14px 20px ${i === rows.length - 1 ? '14px' : '0'} 20px;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;width:38%;">${r.label}</td>
                <td style="padding:14px 20px ${i === rows.length - 1 ? '14px' : '0'} 0;font-size:14px;color:#0F1F3D;font-weight:600;">${r.value}</td>
              </tr>`
              )
              .join('')}
          </table>
          <p style="font-size:13px;color:#64748B;line-height:1.6;margin:0;">
            Keep your appointment ID handy for check-in. If you need to cancel or make changes, you can do so from your HeartStone patient account.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;background:#F4F5F7;border-top:1px solid #E5E7EB;">
          <p style="font-size:11px;color:#94A3B8;margin:0;">
            © ${new Date().getFullYear()} HeartStone Hospital. This is an automated message.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

// Fire-and-forget: called the same way as sendAppointmentConfirmationSms -
// never throws, just logs and resolves, so an email failure (or email simply
// not being configured / the patient not having one on file) never fails the
// booking itself.
export const sendAppointmentConfirmationEmail = async (
  toEmail,
  { patientName, appointmentCode, whenText, departmentName, doctorName }
) => {
  if (!toEmail) return { skipped: true, reason: 'no-email-on-file' };
  if (!isEmailConfigured()) {
    console.log(`[EMAIL SKIPPED - not configured] Would notify ${toEmail}: appointment ${appointmentCode} booked`);
    return { skipped: true, reason: 'not-configured' };
  }

  try {
    await sendEmail({
      to: toEmail,
      name: patientName,
      subject: `Appointment confirmed - ${appointmentCode}`,
      html: appointmentEmailHtml({ name: patientName, appointmentCode, whenText, departmentName, doctorName }),
    });
    return { skipped: false, sent: true };
  } catch (err) {
    console.error('Appointment Confirmation Email Error:', err.message);
    return { skipped: false, sent: false, error: err.message };
  }
};

// Branded "your bill is ready" email carrying the password-protected
// prescription PDF as an attachment. The password itself is deliberately
// never included here (see utils/prescriptionPdf.js) - only a hint telling
// the patient how to derive it themselves, so an intercepted email doesn't
// hand over both the locked file and the key to open it in the same message.
function prescriptionEmailHtml({ name, appointmentCode, billNumber }) {
  return `
  <div style="background:#F4F5F7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
      <tr>
        <td style="background:#0F1F3D;padding:24px 32px;">
          <span style="color:#E63950;font-size:20px;font-weight:700;">Heart</span><span style="color:#FFFFFF;font-size:20px;font-weight:700;">Stone</span>
          <div style="color:#B9C2D0;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-top:4px;">HeartStone Hospital</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h1 style="font-size:18px;color:#0F1F3D;margin:0 0 12px;">Your prescription is attached</h1>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">
            ${name ? `Hi ${name}, your` : 'Your'} bill for appointment <strong>${appointmentCode || '-'}</strong> has been generated, and we've attached a copy of your prescription (PDF) to this email.
          </p>
          <div style="background:#F4F5F7;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
            <p style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Bill number</p>
            <p style="font-size:15px;color:#0F1F3D;font-weight:700;margin:0;">${billNumber || '-'}</p>
          </div>
          <div style="background:#FCE7EB;border-radius:12px;padding:18px 20px;margin-bottom:8px;">
            <p style="font-size:13px;color:#0F1F3D;font-weight:700;margin:0 0 6px;">🔒 This PDF is password-protected</p>
            <p style="font-size:13px;color:#475569;line-height:1.6;margin:0;">
              To open it, enter the <strong>last 4 digits of the mobile number registered with your HeartStone account</strong> as the password.
            </p>
          </div>
          <p style="font-size:12px;color:#94A3B8;line-height:1.6;margin:16px 0 0;">
            If this wasn't you, or your mobile number has changed, please contact reception before opening the attachment.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;background:#F4F5F7;border-top:1px solid #E5E7EB;">
          <p style="font-size:11px;color:#94A3B8;margin:0;">
            © ${new Date().getFullYear()} HeartStone Hospital. This is an automated message.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

// Fire-and-forget, same convention as sendAppointmentConfirmationEmail: never
// throws, just logs and resolves, so a PDF/email failure never fails the
// bill-generation request itself (see controllers/billingController.js).
// `pdfBytes` is a Uint8Array/Buffer (already encrypted - see
// utils/prescriptionPdf.js), converted to base64 here since that's the wire
// format Brevo's attachment field expects.
export const sendPrescriptionPdfEmail = async (
  toEmail,
  { patientName, appointmentCode, billNumber, pdfBytes, fileName }
) => {
  if (!toEmail) return { skipped: true, reason: 'no-email-on-file' };
  if (!isEmailConfigured()) {
    console.log(`[EMAIL SKIPPED - not configured] Would send prescription PDF to ${toEmail} for bill ${billNumber}`);
    return { skipped: true, reason: 'not-configured' };
  }

  try {
    await sendEmail({
      to: toEmail,
      name: patientName,
      subject: `Your prescription - bill ${billNumber || ''}`.trim(),
      html: prescriptionEmailHtml({ name: patientName, appointmentCode, billNumber }),
      attachments: [
        {
          name: fileName || 'prescription.pdf',
          base64: Buffer.from(pdfBytes).toString('base64'),
        },
      ],
    });
    return { skipped: false, sent: true };
  } catch (err) {
    console.error('Prescription PDF Email Error:', err.message);
    return { skipped: false, sent: false, error: err.message };
  }
};
