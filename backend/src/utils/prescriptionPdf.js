// Server-side prescription PDF generator, used to attach a prescription to
// the "bill generated" email (see mailer.js#sendPrescriptionPdfEmail and
// controllers/billingController.js#createBill). This is a separate
// implementation from frontend/src/utils/generatePrescriptionPdf.js - that
// one runs in the browser (jsPDF) for a staff/patient "download" button and
// has no reason to touch the network; this one runs on the server so the
// PDF can be generated and emailed without a browser in the loop at all,
// and - critically - so it can be encrypted with pdf-lib-plus-encrypt.
// jsPDF has no built-in encryption support, which is why this file uses a
// different PDF library from the frontend one.
//
// pdf-lib-plus-encrypt ships as CommonJS; this backend is "type": "module",
// so it's imported via the default-export + destructure pattern rather than
// named imports (named ESM imports of a CJS module aren't statically
// analyzable by Node's loader).
import pdfLib from 'pdf-lib-plus-encrypt';
import { HEARTSTONE_LOGO_PNG_BASE64 } from './logoBase64.js';

const { PDFDocument, StandardFonts, rgb } = pdfLib;

const CRIMSON = rgb(200 / 255, 16 / 255, 46 / 255);
const NAVY = rgb(15 / 255, 31 / 255, 61 / 255);
const MIST = rgb(238 / 255, 241 / 255, 246 / 255);
const INK = rgb(20 / 255, 33 / 255, 61 / 255);
const SLATE = rgb(91 / 255, 100 / 255, 120 / 255);
const LINE = rgb(222 / 255, 226 / 255, 234 / 255);

const PAGE_WIDTH = 595.28; // A4 at 72dpi, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

let cachedLogoPngBytes = null;
function logoPngBytes() {
  if (!cachedLogoPngBytes) {
    const base64 = HEARTSTONE_LOGO_PNG_BASE64.replace(/^data:image\/png;base64,/, '');
    cachedLogoPngBytes = Buffer.from(base64, 'base64');
  }
  return cachedLogoPngBytes;
}

// Derives the "last 4 digits of the registered mobile number" open-password.
// Strips everything but digits first (phone numbers on file may carry a
// country code, spaces, or a leading +), so this is genuinely the last 4
// digits a patient would recognize from their own number - not affected by
// how the number happens to be formatted in the database. Always returns
// exactly 4 characters (zero-padded on the rare account with fewer than 4
// digits on file) so the password length is predictable.
export function last4DigitsPassword(phone) {
  const digitsOnly = String(phone || '').replace(/\D/g, '');
  return digitsOnly.slice(-4).padStart(4, '0');
}

// Builds an encrypted (password-to-open) prescription PDF.
// `prescription` should have doctorId/patientId populated (User/Patient
// docs) - see how it's fetched in billingController.createBill.
// `appointment` optionally supplies the appointment code shown on the PDF.
// Returns { bytes, password } - `password` is also returned so the caller
// can log/audit it was generated without having to recompute it, but it is
// deliberately never written into the email body itself (see mailer.js).
export async function buildPrescriptionPdf({ prescription, appointment, billNumber }) {
  const doctor = prescription.doctorId || {};
  const patient = prescription.patientId || {};

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const logoImage = await pdfDoc.embedPng(logoPngBytes());

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT; // running cursor, top-down; page coords are bottom-up so we always draw at (PAGE_HEIGHT - y-from-top)

  const drawTextTopDown = (text, xFromLeft, yFromTop, opts) => {
    page.drawText(text, { x: xFromLeft, y: PAGE_HEIGHT - yFromTop, ...opts });
  };
  const drawLineTopDown = (x1, yFromTop1, x2, yFromTop2, opts) => {
    page.drawLine({
      start: { x: x1, y: PAGE_HEIGHT - yFromTop1 },
      end: { x: x2, y: PAGE_HEIGHT - yFromTop2 },
      ...opts,
    });
  };
  const drawRectTopDown = (xFromLeft, yFromTop, width, height, opts) => {
    // pdf-lib rectangles are anchored at their bottom-left corner.
    page.drawRectangle({ x: xFromLeft, y: PAGE_HEIGHT - yFromTop - height, width, height, ...opts });
  };

  const newPage = () => {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT;
  };
  const ensureSpace = (needed, cursorTopDown) => {
    if (cursorTopDown + needed > PAGE_HEIGHT - 50) {
      newPage();
      return 60;
    }
    return cursorTopDown;
  };

  // ---- Header ----
  drawRectTopDown(0, 0, PAGE_WIDTH, 5, { color: CRIMSON });

  const logoSize = 42;
  const logoTop = 22;
  drawRectTopDown(MARGIN, logoTop, logoSize, logoSize, { color: MIST });
  const logoImgSize = logoSize - 8;
  page.drawImage(logoImage, {
    x: MARGIN + 4,
    y: PAGE_HEIGHT - logoTop - 4 - logoImgSize,
    width: logoImgSize,
    height: logoImgSize,
  });

  const textX = MARGIN + logoSize + 14;
  drawTextTopDown('HeartStone Hospital', textX, 44, { size: 20, font: timesBold, color: NAVY });
  drawTextTopDown('Multi-specialty care, when it matters most', textX, 60, { size: 8.5, font: helvetica, color: SLATE });
  drawTextTopDown('123 Wellness Avenue, Ludhiana, Punjab, India | +91-161-000-0000 | care@heartstone.com', textX, 73, {
    size: 7.5,
    font: helvetica,
    color: SLATE,
  });

  const shortId = String(prescription._id || '').slice(-8).toUpperCase();
  const refLabel = `Ref: RX-${shortId}`;
  const dateLabel = `Date: ${formatDate(prescription.createdAt || Date.now())}`;
  drawTextTopDown('PRESCRIPTION', PAGE_WIDTH - MARGIN - helveticaBold.widthOfTextAtSize('PRESCRIPTION', 11), 44, {
    size: 11,
    font: helveticaBold,
    color: CRIMSON,
  });
  drawTextTopDown(refLabel, PAGE_WIDTH - MARGIN - helvetica.widthOfTextAtSize(refLabel, 8), 60, {
    size: 8,
    font: helvetica,
    color: SLATE,
  });
  drawTextTopDown(dateLabel, PAGE_WIDTH - MARGIN - helvetica.widthOfTextAtSize(dateLabel, 8), 73, {
    size: 8,
    font: helvetica,
    color: SLATE,
  });

  drawLineTopDown(MARGIN, logoTop + logoSize + 16, PAGE_WIDTH - MARGIN, logoTop + logoSize + 16, {
    thickness: 1,
    color: LINE,
  });

  y = 104;

  // ---- Doctor + patient panels ----
  const panelWidth = (PAGE_WIDTH - MARGIN * 2 - 16) / 2;
  const panelHeight = 88;

  const drawPanel = (x, title, lines) => {
    drawRectTopDown(x, y, panelWidth, panelHeight, { color: MIST });
    drawTextTopDown(title.toUpperCase(), x + 14, y + 20, { size: 8, font: helveticaBold, color: CRIMSON });
    let ly = y + 38;
    lines.filter(Boolean).forEach((line) => {
      drawTextTopDown(line.text, x + 14, ly, {
        size: line.bold ? 10 : 9.5,
        font: line.bold ? helveticaBold : helvetica,
        color: INK,
      });
      ly += 15;
    });
  };

  drawPanel(MARGIN, 'Attending Doctor', [
    { text: doctor.name || 'Doctor', bold: true },
    { text: [doctor.designation, doctor.degree].filter(Boolean).join(' - ') || '-' },
    doctor.registrationNo ? { text: `Reg. No: ${doctor.registrationNo}` } : null,
  ]);

  const ageGenderText = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender ? patient.gender.replace(/^\w/, (c) => c.toUpperCase()) : null,
  ]
    .filter(Boolean)
    .join(' - ');

  drawPanel(MARGIN + panelWidth + 16, 'Patient', [
    { text: patient.name || 'Patient', bold: true },
    ageGenderText ? { text: ageGenderText } : null,
    patient.phone ? { text: `Phone: ${patient.phone}` } : null,
    appointment?.appointmentCode ? { text: `Appointment ID: ${appointment.appointmentCode}` } : null,
  ]);

  y += panelHeight + 26;

  // ---- Rx marker ----
  drawTextTopDown('Rx', MARGIN, y + 6, { size: 24, font: timesBold, color: CRIMSON });
  drawLineTopDown(MARGIN + 32, y - 2, PAGE_WIDTH - MARGIN, y - 2, { thickness: 1.2, color: CRIMSON });

  y += 26;

  // ---- Medicines table (drawn by hand - pdf-lib has no autoTable equivalent) ----
  const colX = [MARGIN, MARGIN + 24, MARGIN + 220, MARGIN + 360, MARGIN + 415];
  const colW = [24, 196, 140, 55, PAGE_WIDTH - MARGIN - (MARGIN + 415)];
  const headers = ['#', 'Medicine', 'Dosage', 'Qty', 'Status'];
  const rowHeight = 22;

  const drawTableHeader = () => {
    drawRectTopDown(MARGIN, y, PAGE_WIDTH - MARGIN * 2, rowHeight, { color: rgb(252 / 255, 231 / 255, 235 / 255) });
    headers.forEach((h, i) => {
      drawTextTopDown(h, colX[i] + 6, y + 15, { size: 9, font: helveticaBold, color: CRIMSON });
    });
    y += rowHeight;
  };

  drawTableHeader();

  const medicines = Array.isArray(prescription.medicines) ? prescription.medicines : [];
  medicines.forEach((med, i) => {
    if (y + rowHeight > PAGE_HEIGHT - 130) {
      newPage();
      y = 60;
      drawTableHeader();
    }
    const status = (med.availability || 'pending').replace(/^\w/, (c) => c.toUpperCase());
    const cells = [String(i + 1), med.name || '-', med.dosage || '-', med.quantity ? String(med.quantity) : '-', status];
    drawRectTopDown(MARGIN, y, PAGE_WIDTH - MARGIN * 2, rowHeight, {
      borderColor: LINE,
      borderWidth: 0.5,
      color: i % 2 === 1 ? rgb(250 / 255, 250 / 255, 252 / 255) : rgb(1, 1, 1),
    });
    cells.forEach((cell, ci) => {
      const truncated = cell.length > 32 ? `${cell.slice(0, 31)}…` : cell;
      drawTextTopDown(truncated, colX[ci] + 6, y + 15, { size: 9, font: helvetica, color: INK });
    });
    y += rowHeight;
  });

  y += 20;

  // ---- Doctor's notes ----
  const notesText = (prescription.notes || '').trim();
  if (notesText) {
    const maxCharsPerLine = 100;
    const words = notesText.split(/\s+/);
    const wrapped = [];
    let line = '';
    words.forEach((w) => {
      if ((line + ' ' + w).trim().length > maxCharsPerLine) {
        wrapped.push(line.trim());
        line = w;
      } else {
        line = (line + ' ' + w).trim();
      }
    });
    if (line) wrapped.push(line);

    const boxHeight = 34 + wrapped.length * 13;
    y = ensureSpace(boxHeight, y);

    drawRectTopDown(MARGIN, y, PAGE_WIDTH - MARGIN * 2, boxHeight, { color: MIST });
    drawTextTopDown('ADVICE / NOTES', MARGIN + 14, y + 18, { size: 8.5, font: helveticaBold, color: CRIMSON });
    wrapped.forEach((wline, i) => {
      drawTextTopDown(wline, MARGIN + 14, y + 34 + i * 13, { size: 9.5, font: helvetica, color: INK });
    });
    y += boxHeight + 30;
  }

  // ---- Signature + footer ----
  y = ensureSpace(90, y);
  const sigLineY = y + 40;
  drawLineTopDown(PAGE_WIDTH - MARGIN - 160, sigLineY, PAGE_WIDTH - MARGIN, sigLineY, { thickness: 0.75, color: SLATE });
  const sigLabel = "Doctor's signature";
  drawTextTopDown(sigLabel, PAGE_WIDTH - MARGIN - helvetica.widthOfTextAtSize(sigLabel, 8.5), sigLineY + 14, {
    size: 8.5,
    font: helvetica,
    color: SLATE,
  });
  if (doctor.name) {
    drawTextTopDown(doctor.name, PAGE_WIDTH - MARGIN - helveticaBold.widthOfTextAtSize(doctor.name, 9.5), sigLineY + 28, {
      size: 9.5,
      font: helveticaBold,
      color: INK,
    });
  }

  y = sigLineY + 44;
  drawTextTopDown(
    'This is a digitally generated prescription issued through the HeartStone Hospital system.',
    MARGIN,
    y,
    { size: 8, font: helvetica, color: SLATE }
  );
  drawTextTopDown('Please consult your pharmacist before substituting any medicine listed above.', MARGIN, y + 12, {
    size: 8,
    font: helvetica,
    color: SLATE,
  });
  if (billNumber) {
    drawTextTopDown(`Related bill: ${billNumber}`, MARGIN, y + 24, { size: 8, font: helvetica, color: SLATE });
  }

  drawRectTopDown(0, PAGE_HEIGHT - 28, PAGE_WIDTH, 28, { color: MIST });
  drawTextTopDown('HeartStone Hospital - Multi-specialty care, when it matters most', MARGIN, PAGE_HEIGHT - 11, {
    size: 7.5,
    font: helvetica,
    color: SLATE,
  });

  // ---- Password-protect: the PDF cannot be opened without the last 4
  // digits of the patient's registered mobile number. No owner password is
  // set, so the same code is required for every permission, not just
  // "opening" vs "editing" - this is meant to gate reading the document at
  // all, since it contains clinical information (diagnosis, medicines).
  const password = last4DigitsPassword(patient.phone);
  await pdfDoc.encrypt({ userPassword: password });

  const bytes = await pdfDoc.save();
  return { bytes, password };
}
