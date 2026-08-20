

import pdfLib from 'pdf-lib-plus-encrypt';
import { HEARTSTONE_LOGO_PNG_BASE64 } from './logoBase64.js';
import { last4DigitsPassword } from './prescriptionPdf.js';

const { PDFDocument, StandardFonts, rgb } = pdfLib;

const CRIMSON = rgb(200 / 255, 16 / 255, 46 / 255);
const CRIMSON_TINT = rgb(252 / 255, 231 / 255, 235 / 255);
const NAVY = rgb(15 / 255, 31 / 255, 61 / 255);
const MIST = rgb(238 / 255, 241 / 255, 246 / 255);
const INK = rgb(20 / 255, 33 / 255, 61 / 255);
const SLATE = rgb(91 / 255, 100 / 255, 120 / 255);
const LINE = rgb(222 / 255, 226 / 255, 234 / 255);

const PAGE_WIDTH = 595.28; 
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

const PAYMENT_METHOD_LABELS = { cash: 'Cash', card: 'Card', upi: 'UPI', other: 'Other' };

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function threeDigitsToWords(n) {
  let str = '';
  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    str += `${TENS[Math.floor(n / 10)]} `;
    n %= 10;
  } else if (n >= 1) {
    str += `${ONES[n]} `;
  }
  return str.trim();
}

// Indian numbering system (Lakh/Crore) - matches the frontend bill PDF so a
// staff-downloaded copy and the emailed copy read identically.
function amountToWords(amount) {
  const whole = Math.round(Number(amount) || 0);
  if (whole === 0) return 'Zero Rupees Only';

  const crore = Math.floor(whole / 10000000);
  const lakh = Math.floor((whole % 10000000) / 100000);
  const thousand = Math.floor((whole % 100000) / 1000);
  const hundred = whole % 1000;

  const parts = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return `Rupees ${parts.join(' ')} Only`;
}

let cachedLogoPngBytes = null;
function logoPngBytes() {
  if (!cachedLogoPngBytes) {
    const base64 = HEARTSTONE_LOGO_PNG_BASE64.replace(/^data:image\/png;base64,/, '');
    cachedLogoPngBytes = Buffer.from(base64, 'base64');
  }
  return cachedLogoPngBytes;
}

export async function buildBillPdf({ bill }) {
  const patient = bill.patientId || {};
  const appointment = bill.appointmentId || {};
  const doctor = appointment.doctorId || {};
  const department = appointment.department || {};

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const logoImage = await pdfDoc.embedPng(logoPngBytes());

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT;

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

  const invoiceLabel = 'INVOICE';
  const billNoLabel = `Bill No: ${bill.billNumber || '-'}`;
  const dateLabel = `Date: ${formatDate(bill.createdAt || Date.now())}`;
  drawTextTopDown(invoiceLabel, PAGE_WIDTH - MARGIN - helveticaBold.widthOfTextAtSize(invoiceLabel, 11), 44, {
    size: 11,
    font: helveticaBold,
    color: CRIMSON,
  });
  drawTextTopDown(billNoLabel, PAGE_WIDTH - MARGIN - helvetica.widthOfTextAtSize(billNoLabel, 8), 60, {
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

  drawPanel(MARGIN, 'Billed To', [
    { text: patient.name || 'Patient', bold: true },
    patient.phone ? { text: `Phone: ${patient.phone}` } : null,
    patient.age || patient.gender
      ? { text: [patient.age ? `${patient.age} yrs` : null, patient.gender ? patient.gender.replace(/^\w/, (c) => c.toUpperCase()) : null].filter(Boolean).join(' - ') }
      : null,
  ]);

  drawPanel(MARGIN + panelWidth + 16, 'Visit Details', [
    appointment.appointmentCode ? { text: `Appointment ID: ${appointment.appointmentCode}`, bold: true } : null,
    department.name ? { text: `Department: ${department.name}` } : null,
    doctor.name ? { text: `Doctor: ${doctor.name}` } : null,
    { text: `Payment: ${PAYMENT_METHOD_LABELS[bill.paymentMethod] || 'Cash'} - ${bill.status === 'paid' ? 'Paid' : 'Unpaid'}` },
  ]);

  y += panelHeight + 26;

  
  const rows = [];
  if (bill.appointmentFee) rows.push({ description: 'Appointment fee', qty: '', unit: '', amount: bill.appointmentFee });
  if (bill.consultationFee) rows.push({ description: 'Consultation fee', qty: '', unit: '', amount: bill.consultationFee });
  if (bill.applicationFee) rows.push({ description: 'Application/visit fee', qty: '', unit: '', amount: bill.applicationFee });
  (bill.items || []).forEach((it) => {
    rows.push({ description: it.description, qty: String(it.quantity ?? ''), unit: formatCurrency(it.unitPrice), amount: it.amount });
  });
  (bill.otherCharges || []).forEach((c) => {
    rows.push({ description: c.type, qty: '', unit: '', amount: c.amount });
  });
  if (rows.length === 0) {
    rows.push({ description: 'No itemized charges', qty: '', unit: '', amount: 0 });
  }

  const colX = [MARGIN, MARGIN + 280, MARGIN + 340, MARGIN + 420];
  const colW = [280, 60, 80, PAGE_WIDTH - MARGIN - (MARGIN + 420)];
  const headers = ['Description', 'Qty', 'Unit', 'Amount'];
  const rowHeight = 22;

  const drawTableHeader = () => {
    drawRectTopDown(MARGIN, y, PAGE_WIDTH - MARGIN * 2, rowHeight, { color: CRIMSON_TINT });
    headers.forEach((h, i) => {
      const isRight = i === headers.length - 1;
      const w = helveticaBold.widthOfTextAtSize(h, 9);
      drawTextTopDown(h, isRight ? colX[i] + colW[i] - 6 - w : colX[i] + 6, y + 15, { size: 9, font: helveticaBold, color: CRIMSON });
    });
    y += rowHeight;
  };

  drawTableHeader();

  rows.forEach((r, i) => {
    if (y + rowHeight > PAGE_HEIGHT - 160) {
      newPage();
      y = 60;
      drawTableHeader();
    }
    drawRectTopDown(MARGIN, y, PAGE_WIDTH - MARGIN * 2, rowHeight, {
      borderColor: LINE,
      borderWidth: 0.5,
      color: i % 2 === 1 ? rgb(250 / 255, 250 / 255, 252 / 255) : rgb(1, 1, 1),
    });
    const desc = r.description && r.description.length > 44 ? `${r.description.slice(0, 43)}…` : r.description || '-';
    drawTextTopDown(desc, colX[0] + 6, y + 15, { size: 9, font: helvetica, color: INK });
    drawTextTopDown(r.qty, colX[1] + 6, y + 15, { size: 9, font: helvetica, color: INK });
    drawTextTopDown(r.unit, colX[2] + 6, y + 15, { size: 9, font: helvetica, color: INK });
    const amtText = formatCurrency(r.amount);
    const amtW = helvetica.widthOfTextAtSize(amtText, 9);
    drawTextTopDown(amtText, colX[3] + colW[3] - 6 - amtW, y + 15, { size: 9, font: helvetica, color: INK });
    y += rowHeight;
  });

  y += 16;

  
  y = ensureSpace(140, y);
  const totalsX = PAGE_WIDTH - MARGIN - 220;
  const totalsW = 220;

  const totalLines = [
    { label: 'Subtotal', value: bill.totalAmount + (bill.discountAmount || 0) },
    bill.discountAmount ? { label: 'Discount', value: -bill.discountAmount } : null,
  ].filter(Boolean);

  totalLines.forEach((line) => {
    drawTextTopDown(line.label, totalsX, y + 14, { size: 9.5, font: helvetica, color: SLATE });
    const valText = formatCurrency(line.value);
    const w = helvetica.widthOfTextAtSize(valText, 9.5);
    drawTextTopDown(valText, totalsX + totalsW - w, y + 14, { size: 9.5, font: helvetica, color: INK });
    y += 18;
  });

  drawRectTopDown(totalsX, y, totalsW, 32, { color: NAVY });
  drawTextTopDown('Total Amount', totalsX + 14, y + 20, { size: 10, font: helveticaBold, color: rgb(1, 1, 1) });
  const grandTotalText = formatCurrency(bill.totalAmount);
  const gW = helveticaBold.widthOfTextAtSize(grandTotalText, 12);
  drawTextTopDown(grandTotalText, totalsX + totalsW - 14 - gW, y + 21, { size: 12, font: helveticaBold, color: rgb(1, 1, 1) });
  y += 32 + 20;

  
  y = ensureSpace(30, y);
  drawTextTopDown('Amount in words:', MARGIN, y, { size: 8.5, font: helveticaBold, color: SLATE });
  drawTextTopDown(amountToWords(bill.totalAmount), MARGIN + 100, y, { size: 8.5, font: helvetica, color: INK });
  y += 30;

  
  const notesText = (bill.notes || '').trim();
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
    drawTextTopDown('NOTES', MARGIN + 14, y + 18, { size: 8.5, font: helveticaBold, color: CRIMSON });
    wrapped.forEach((wline, i) => {
      drawTextTopDown(wline, MARGIN + 14, y + 34 + i * 13, { size: 9.5, font: helvetica, color: INK });
    });
    y += boxHeight + 20;
  }

  
  y = ensureSpace(40, y);
  drawTextTopDown('This is a digitally generated invoice issued through the HeartStone Hospital system.', MARGIN, y, {
    size: 8,
    font: helvetica,
    color: SLATE,
  });
  if (bill.prescriptionId) {
    drawTextTopDown('A copy of the related prescription is attached separately to this email.', MARGIN, y + 12, {
      size: 8,
      font: helvetica,
      color: SLATE,
    });
  }

  drawRectTopDown(0, PAGE_HEIGHT - 28, PAGE_WIDTH, 28, { color: MIST });
  drawTextTopDown('HeartStone Hospital - Multi-specialty care, when it matters most', MARGIN, PAGE_HEIGHT - 11, {
    size: 7.5,
    font: helvetica,
    color: SLATE,
  });

  
  const password = last4DigitsPassword(patient.phone);
  await pdfDoc.encrypt({ userPassword: password });

  const bytes = await pdfDoc.save();
  return { bytes, password };
}
