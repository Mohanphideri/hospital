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

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const inferImageFormat = (dataUrl) => (/^data:image\/jpe?g/i.test(dataUrl || "") ? "JPEG" : "PNG");

export function downloadPrescriptionPdf(prescription, patientOverride, doctorOverride) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  const isPopulatedObject = (val) => val && typeof val === "object";
  const doctor = isPopulatedObject(prescription.doctorId) ? prescription.doctorId : doctorOverride || {};
  const patient = isPopulatedObject(prescription.patientId) ? prescription.patientId : patientOverride || {};

  
  
  doc.setFillColor(...CRIMSON);
  doc.rect(0, 0, pageWidth, 5, "F");

  
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
  doc.text("Multi-specialty care, when it matters most", textX, 62);
  doc.text("123 Wellness Avenue, Ludhiana, Punjab, India  |  +91-161-000-0000  |  care@heartstone.com", textX, 76);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...CRIMSON);
  doc.text("PRESCRIPTION", pageWidth - margin, 44, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const shortId = (prescription._id || "").toString().slice(-8).toUpperCase();
  doc.setTextColor(...SLATE);
  doc.text(`Ref: RX-${shortId}`, pageWidth - margin, 60, { align: "right" });
  doc.text(`Date: ${formatDate(prescription.createdAt || Date.now())}`, pageWidth - margin, 73, { align: "right" });

  doc.setDrawColor(222, 226, 234);
  doc.setLineWidth(1);
  doc.line(margin, logoY + logoSize + 16, pageWidth - margin, logoY + logoSize + 16);

  let y = 104;

  
  const panelWidth = (pageWidth - margin * 2 - 16) / 2;

  const drawPanel = (x, title, lines) => {
    doc.setDrawColor(...MIST);
    doc.setFillColor(...MIST);
    doc.roundedRect(x, y, panelWidth, 98, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...CRIMSON);
    doc.text(title.toUpperCase(), x + 14, y + 20);
    doc.setTextColor(...INK);
    let ly = y + 38;
    lines.forEach((line) => {
      if (!line) return;
      doc.setFont("helvetica", line.bold ? "bold" : "normal");
      doc.setFontSize(line.bold ? 10.5 : 9.5);
      doc.text(line.text, x + 14, ly);
      ly += 15;
    });
  };

  drawPanel(margin, "Attending Doctor", [
    { text: doctor.name || "Doctor", bold: true },
    { text: [doctor.designation, doctor.degree].filter(Boolean).join(" · ") || "—" },
    { text: doctor.registrationNo ? `Reg. No: ${doctor.registrationNo}` : null },
  ]);

  const ageGenderText = [
    patient?.age ? `${patient.age} yrs` : null,
    patient?.gender ? patient.gender.replace(/^\w/, (c) => c.toUpperCase()) : null,
  ].filter(Boolean).join(" · ");

  drawPanel(margin + panelWidth + 16, "Patient", [
    { text: patient?.name || "Patient", bold: true },
    { text: ageGenderText || null },
    { text: patient?.phone ? `Phone: ${patient.phone}` : null },
    { text: prescription.appointmentId?.appointmentCode ? `Appointment ID: ${prescription.appointmentId.appointmentCode}` : null },
  ]);

  y += 98 + 26;

  
  doc.setFont("times", "bolditalic");
  doc.setFontSize(28);
  doc.setTextColor(...CRIMSON);
  doc.text("Rx", margin, y);
  doc.setDrawColor(...CRIMSON);
  doc.setLineWidth(1.2);
  doc.line(margin + 34, y - 8, pageWidth - margin, y - 8);

  y += 20;

  
  const rows = (prescription.medicines || []).map((med, i) => [
    String(i + 1),
    med.name || "—",
    med.dosage || "—",
    med.quantity ? String(med.quantity) : "—",
    (med.availability || "pending").replace(/^\w/, (c) => c.toUpperCase()),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Medicine", "Dosage", "Qty", "Pharmacy status"]],
    body: rows,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: 8,
      textColor: INK,
      lineColor: [222, 226, 234],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: CRIMSON_TINT,
      textColor: CRIMSON,
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 110 },
      3: { cellWidth: 50, halign: "center" },
      4: { cellWidth: 110 },
    },
  });

  let afterTableY = doc.lastAutoTable.finalY + 30;

  
  const notesText = (prescription.notes || "").trim();
  if (notesText) {
    const wrapped = doc.splitTextToSize(notesText, pageWidth - margin * 2 - 28);
    const boxHeight = 34 + wrapped.length * 13;

    if (afterTableY + boxHeight > 730) {
      doc.addPage();
      afterTableY = 60;
    }

    doc.setFillColor(...MIST);
    doc.roundedRect(margin, afterTableY, pageWidth - margin * 2, boxHeight, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...CRIMSON);
    doc.text("ADVICE / NOTES", margin + 14, afterTableY + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(wrapped, margin + 14, afterTableY + 34);

    afterTableY += boxHeight + 32;
  } else {
    afterTableY += 10;
  }

  
  const signatureBlockHeight = 92;
  if (afterTableY + signatureBlockHeight > 700) {
    doc.addPage();
    afterTableY = 60;
  }

  const sigLineY = afterTableY + 58;
  const sigImg = doctor.signatureUrl || SIGNATURE_PNG_BASE64;
  const sigImgWidth = 110;
  const sigImgHeight = 41;
  doc.addImage(sigImg, inferImageFormat(sigImg), pageWidth - margin - sigImgWidth, sigLineY - sigImgHeight - 4, sigImgWidth, sigImgHeight);

  doc.setDrawColor(...SLATE);
  doc.setLineWidth(0.75);
  doc.line(pageWidth - margin - 160, sigLineY, pageWidth - margin, sigLineY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text("Doctor's signature", pageWidth - margin, sigLineY + 14, { align: "right" });
  if (doctor.name) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(doctor.name, pageWidth - margin, sigLineY + 28, { align: "right" });
  }

  afterTableY = sigLineY + 28;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(
    "This is a digitally generated prescription issued through the HeartStone Hospital patient portal.",
    margin,
    afterTableY + 20
  );
  doc.text(
    "Please consult your pharmacist before substituting any medicine listed above.",
    margin,
    afterTableY + 32
  );

  
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...MIST);
  doc.rect(0, pageHeight - 28, pageWidth, 28, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text("HeartStone Hospital · Multi-specialty care, when it matters most", margin, pageHeight - 11);

  doc.save(`HeartStone-Prescription-${shortId}.pdf`);
}
