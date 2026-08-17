import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { HEARTSTONE_LOGO_PNG_BASE64 } from "./logoBase64.js";
import { SIGNATURE_PNG_BASE64 } from "./signatureBase64.js";

const CRIMSON = [200, 16, 46];
const CRIMSON_TINT = [252, 231, 235];
const NAVY = [15, 31, 61];
const MIST = [238, 241, 246];
const INK = [20, 33, 61];
const SLATE = [91, 100, 120];

// Converts a whole-rupee amount to words using the Indian numbering system
// (Lakh/Crore, not Million/Billion) - the "Amount in words" line is a
// standard fixture on real Indian hospital/pharmacy bills, and its absence
// is one of the things that makes a generated bill read as a demo/mockup
// rather than a real invoice.
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function threeDigitsToWords(n) {
  let str = "";
  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    str += `${TENS[Math.floor(n / 10)]} `;
    n %= 10;
  }
  if (n > 0) str += `${ONES[n]} `;
  return str.trim();
}

function amountToWords(amount) {
  const whole = Math.round(Number(amount) || 0);
  if (whole === 0) return "Zero Rupees Only";

  const crore = Math.floor(whole / 10000000);
  const lakh = Math.floor((whole % 10000000) / 100000);
  const thousand = Math.floor((whole % 100000) / 1000);
  const hundred = whole % 1000;

  const parts = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return `Rupees ${parts.join(" ")} Only`;
}

const PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  insurance: "Insurance",
  online: "Online",
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// jsPDF's built-in core fonts (Helvetica/Times) only cover WinAnsi/Latin-1 -
// the Indian Rupee sign (U+20B9) isn't in that set and renders as a garbled
// substitute glyph. "Rs." is what most real Indian hospital/pharmacy bills
// print anyway, and it's guaranteed to render correctly with any font.
const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

// jsPDF's addImage() needs to be told the actual image format - staff
// signatures are uploaded as PNG or JPEG (see AdminContent's file input),
// so read it off the data URL rather than assuming PNG.
const inferImageFormat = (dataUrl) => (/^data:image\/jpe?g/i.test(dataUrl || "") ? "JPEG" : "PNG");

const TABLE_STYLES = {
  font: "helvetica",
  fontSize: 9.5,
  cellPadding: 8,
  textColor: INK,
  lineColor: [222, 226, 234],
  lineWidth: 0.5,
};

const TABLE_HEAD_STYLES = {
  fillColor: CRIMSON_TINT,
  textColor: CRIMSON,
  fontStyle: "bold",
  fontSize: 9,
};

export function downloadBillPdf(bill) {
  if (!bill) return;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const footerHeight = 28;

  const drawFooter = () => {
    doc.setFillColor(...MIST);
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text("HeartStone Hospital \u00b7 Patient billing statement", margin, pageHeight - 11);
  };

  // Makes sure there's room for the next `neededHeight` pt before the
  // footer band - starts a fresh page (with its own footer) otherwise, so
  // the signature block never gets sliced across a page break.
  const ensureSpace = (currentY, neededHeight) => {
    if (currentY + neededHeight > pageHeight - footerHeight - 16) {
      drawFooter();
      doc.addPage();
      return 40;
    }
    return currentY;
  };

  // ---- Header band: white background, thin crimson accent rule underneath
  // (no solid dark/navy block, so it stays light and cheap to print). ----
  doc.setFillColor(...CRIMSON);
  doc.rect(0, 0, pageWidth, 5, "F");

  // Logo mark (heart + cross + "H") in a soft mist card, left of the name.
  const logoSize = 42;
  const logoY = 22;
  doc.setFillColor(...MIST);
  doc.roundedRect(margin, logoY, logoSize, logoSize, 6, 6, "F");
  doc.addImage(HEARTSTONE_LOGO_PNG_BASE64, "PNG", margin + 4, logoY + 4, logoSize - 8, logoSize - 8);

  const textX = margin + logoSize + 14;
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...NAVY);
  doc.text("HeartStone Hospital", textX, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text("Patient billing statement", textX, 62);
  doc.text("123 Wellness Avenue, Ludhiana, Punjab, India  |  +91-161-000-0000  |  care@heartstone.com", textX, 76);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...CRIMSON);
  doc.text("BILL", pageWidth - margin, 44, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const shortId = (bill.billNumber || bill._id || "BILL").toString().slice(-8).toUpperCase();
  doc.setTextColor(...SLATE);
  doc.text(`Ref: ${bill.billNumber || shortId}`, pageWidth - margin, 60, { align: "right" });
  doc.text(`Date: ${formatDate(bill.createdAt || Date.now())}`, pageWidth - margin, 73, { align: "right" });

  doc.setDrawColor(222, 226, 234);
  doc.setLineWidth(1);
  doc.line(margin, logoY + logoSize + 16, pageWidth - margin, logoY + logoSize + 16);

  let y = 104;

  const patientName = bill.patientId?.name || bill.patient?.name || "Patient";
  const appointmentCode = bill.appointmentId?.appointmentCode || bill.appointmentCode || "\u2014";
  const departmentName = bill.department?.name || bill.appointmentId?.department?.name || "\u2014";

  doc.setFillColor(...MIST);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 88, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...CRIMSON);
  doc.text("PATIENT / VISIT DETAILS", margin + 14, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`Patient: ${patientName}`, margin + 14, y + 40);
  doc.text(`Appointment: ${appointmentCode}`, margin + 14, y + 56);
  doc.text(`Department: ${departmentName}`, margin + 14, y + 72);

  y += 122;

  // ---- Itemized charges: one real invoice table, not a lump "Medicine
  // charges" total with a disconnected medicines table bolted on somewhere
  // else in the document. Every medicine dispensed appears as its own line
  // item (with its dosage folded into the description, exactly as prescribed
  // - e.g. "Paracetamol (1-0-1)") right where a "Medicine charges" row would
  // have been, in the same table and the same reading order as the
  // appointment/consultation fee and any other charges. ----
  const appointmentFee = Number(bill.appointmentFee ?? 0);
  const consultationFee = Number(bill.consultationFee ?? 0);
  const applicationFee = Number(bill.applicationFee ?? 0);
  const medicineItems = bill.items || [];
  const otherCharges = Array.isArray(bill.otherCharges) ? bill.otherCharges : [];
  const otherChargesTotal = otherCharges.reduce((sum, charge) => sum + Number(charge?.amount || 0), 0);
  const medicinesTotal = medicineItems.reduce(
    (sum, it) => sum + Number(it.amount ?? (it.quantity || 1) * (it.unitPrice || it.price || 0)),
    0
  );
  const discount = Number(bill.discountAmount ?? 0);
  const subtotal = appointmentFee + consultationFee + medicinesTotal + applicationFee + otherChargesTotal;
  const total = Number(bill.totalAmount ?? subtotal - discount);

  const lineItemRows = [];
  if (appointmentFee > 0) lineItemRows.push(["Appointment fee", formatCurrency(appointmentFee)]);
  if (consultationFee > 0) lineItemRows.push(["Consultation fee", formatCurrency(consultationFee)]);
  medicineItems.forEach((item) => {
    const qty = item.quantity || 1;
    const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
    const amount = Number(item.amount ?? qty * unitPrice);
    lineItemRows.push([item.description || item.name || "Medicine", formatCurrency(amount)]);
  });
  if (applicationFee > 0) lineItemRows.push(["Visit / application fee", formatCurrency(applicationFee)]);
  otherCharges.forEach((charge) => {
    if (Number(charge?.amount || 0) > 0) {
      lineItemRows.push([charge?.type || "Other charge", formatCurrency(charge.amount)]);
    }
  });
  // Serial-number every line item, matching how a real pharmacy/hospital
  // invoice numbers its rows.
  const numberedRows = lineItemRows.map((row, i) => [String(i + 1), ...row]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Description", "Amount"]],
    body: numberedRows,
    theme: "grid",
    styles: TABLE_STYLES,
    headStyles: TABLE_HEAD_STYLES,
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 100, halign: "right" },
    },
  });

  y = doc.lastAutoTable.finalY + 16;

  // ---- Totals block: subtotal / discount / total due, right-aligned like
  // the foot of a real invoice, separate from the line items above it. ----
  const totalsRows = [];
  if (discount > 0) totalsRows.push(["Subtotal", formatCurrency(subtotal)]);
  if (discount > 0) totalsRows.push(["Discount", `-${formatCurrency(discount)}`]);
  totalsRows.push(["Total due", formatCurrency(total)]);

  autoTable(doc, {
    startY: y,
    margin: { left: pageWidth - margin - 220, right: margin },
    body: totalsRows,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 8, right: 0 }, textColor: INK },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: "normal" },
      1: { cellWidth: 100, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.raw[0] === "Total due") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = CRIMSON;
        data.cell.styles.fontSize = 11;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ---- Amount in words: a standard fixture on real Indian hospital /
  // pharmacy bills, computed from the actual total rather than hardcoded. ----
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text(`Amount in words: ${amountToWords(total)}`, margin, y + 10);

  y += 30;

  // ---- Status ----
  y = ensureSpace(y, 36 + 16);
  doc.setFillColor(...MIST);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 36, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...CRIMSON);
  doc.text("STATUS", margin + 14, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const paymentLabel = PAYMENT_METHOD_LABELS[bill.paymentMethod] || bill.paymentMethod || "Cash";
  const statusLine =
    bill.status === "paid"
      ? `Payment status: PAID  \u00b7  Mode: ${paymentLabel}${bill.paidAt ? `  \u00b7  Paid on ${formatDate(bill.paidAt)}` : ""}`
      : `Payment status: ${String(bill.status || "unpaid").toUpperCase()}  \u00b7  Mode: ${paymentLabel}`;
  doc.text(statusLine, margin + 14, y + 20 + 16);

  y += 36 + 34;

  // ---- Authorised signatory: who actually raised this bill (the biller's
  // recorded name/role), stamped with the hospital's signature mark. ----
  const signatureBlockHeight = 96;
  y = ensureSpace(y, signatureBlockHeight);

  const billerName = bill.generatedBy?.name || "HeartStone Hospital staff";
  const billerRole = bill.generatedBy?.role
    ? bill.generatedBy.role.charAt(0).toUpperCase() + bill.generatedBy.role.slice(1)
    : "Billing staff";

  const sigBoxWidth = 200;
  const sigX = pageWidth - margin - sigBoxWidth;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...CRIMSON);
  doc.text("AUTHORISED SIGNATORY", sigX, y);

  // Signature image, sized to keep its aspect ratio within the box. Uses
  // the biller's own uploaded signature when they have one on file,
  // falling back to the generic hospital stamp otherwise.
  const sigImg = bill.generatedBy?.signatureUrl || SIGNATURE_PNG_BASE64;
  const sigImgWidth = 110;
  const sigImgHeight = 41;
  doc.addImage(sigImg, inferImageFormat(sigImg), sigX, y + 10, sigImgWidth, sigImgHeight);

  doc.setDrawColor(180, 186, 198);
  doc.setLineWidth(0.75);
  doc.line(sigX, y + 58, sigX + sigBoxWidth, y + 58);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(billerName, sigX, y + 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text(billerRole, sigX, y + 84);

  drawFooter();

  doc.save(`HeartStone-Bill-${shortId}.pdf`);
}
