// src/services/pdfService.js
const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const QRCode = require("qrcode");

const ROOT = path.resolve(__dirname, "..", ".."); // backend/
const TEMPLATE_FOLDER = path.join(ROOT, "templates");
const STATIC_FOLDER = path.join(ROOT, "public", "static");
const PDF_FOLDER = path.join(ROOT, "generated_pdfs");

fs.mkdirSync(PDF_FOLDER, { recursive: true });
fs.mkdirSync(path.join(PDF_FOLDER, "certificates"), { recursive: true });

/**
 * Generate Offer Letter PDF (overlay on template if available)
 * data: { full_name, domain, unique_id, internship_duration, start_date, stipend }
 * returns absolute path to generated PDF
 */
async function generateOfferLetterPDF(data) {
  const templatePath = path.join(TEMPLATE_FOLDER, "offerLetterTemplate.pdf");
  const outPath = path.join(PDF_FOLDER, `${data.unique_id}_offer_letter.pdf`);

  try {
    if (fs.existsSync(templatePath)) {
      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const page = pdfDoc.getPage(0);
      const { width, height } = page.getSize();

      // small helper for vertical spacing like your Python layout
      const drawLines = (lines, startX, startY, font, size, spacing = 14) => {
        let y = startY;
        for (const line of lines) {
          page.drawText(line, { x: startX, y, size, font });
          y -= spacing;
        }
        return y;
      };

      // Header fields
      page.drawText(`To: ${data.full_name}`, { x: 50, y: 640, size: 10, font: helvetica });
      page.drawText(`Domain: ${data.domain}`, { x: 50, y: 620, size: 10, font: helvetica });
      page.drawText(`Location: Online(Remote)`, { x: 50, y: 600, size: 10, font: helvetica });
      page.drawText(`ID: ${data.unique_id}`, { x: 300, y: 640, size: 10, font: helvetica });
      page.drawText(`Start Date: ${data.start_date}`, { x: 300, y: 600, size: 10, font: helvetica });
      page.drawText(`Duration: ${data.internship_duration}`, { x: 300, y: 620, size: 10, font: helvetica });

      // Body
      const content = [
        `Dear ${data.full_name},`,
        ``,
        `Congratulations! We are excited to offer you the position of ${data.domain} at GT Technovation Innovations.`,
        `Your application demonstrated exceptional potential and alignment with our organization's values and objectives.`,
        ``,
        `This internship opportunity is designed to provide you with hands-on experience in real-world projects while working`,
        `alongside our experienced professionals. We are confident that this experience will significantly contribute to your`,
        `professional development and career growth.`,
        ``,
        `During your ${data.internship_duration} internship period, you will have the opportunity to work on challenging projects and contribute`,
        `to meaningful solutions. We believe that your unique perspective and skills will be valuable assets to our team and`,
        `and we look forward to the innovative contributions we know you will make.`,
        ``,
        `Welcome to GT Technovation Innovations! We look forward to seeing the great work you will accomplish.`,
      ];
      let yAfterBody = drawLines(content, 50, 560, helvetica, 10, 14);

      // Terms & Conditions
      yAfterBody -= 10;
      page.drawText("Terms & Conditions:", { x: 50, y: yAfterBody, size: 11, font: helveticaBold });
      yAfterBody -= 18;
      const terms = [
        `• Internship period: ${data.internship_duration}`,
        `• Participate in project planning and development activities`,
        `• Professional conduct and performance expectations must be maintained`,
        `• All company policies and procedures must be adhered to during the internship period`,
        `• Successful completion may lead to certificate of completion and potential references`,
        `• Provide regular progress updates to your supervisor`
      ];
      yAfterBody = drawLines(terms, 60, yAfterBody, helvetica, 9, 12);

      // Signatures (if images exist)
      const signaturePath = path.join(STATIC_FOLDER, "signature.png");
      const verifyPath = path.join(STATIC_FOLDER, "verify.png");
      const sigY = yAfterBody - 30;
      if (fs.existsSync(signaturePath)) {
        const sigBytes = fs.readFileSync(signaturePath);
        try {
          const pngImage = await pdfDoc.embedPng(sigBytes);
          page.drawImage(pngImage, { x: 70, y: sigY, width: 80, height: 30 });
        } catch (e) { /* ignore */ }
      }
      if (fs.existsSync(verifyPath)) {
        const vBytes = fs.readFileSync(verifyPath);
        try {
          const pngImage = await pdfDoc.embedPng(vBytes);
          page.drawImage(pngImage, { x: 330, y: sigY, width: 80, height: 30 });
        } catch (e) { /* ignore */ }
      }

      // Footer text
      const footerY = 120;
      page.drawText(`Internship ID: ${data.unique_id}`, { x: 50, y: footerY, size: 8, font: helvetica });
      const nowStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
      page.drawText(`Date: ${nowStr}`, { x: 50, y: footerY - 12, size: 8, font: helvetica });
      page.drawText(`www.gttechnovation.com`, { x: 50, y: footerY - 24, size: 8, font: helvetica });

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outPath, pdfBytes);
      return outPath;
    } else {
      // fallback: build a simple single-page PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(`To: ${data.full_name}`, { x: 50, y: 740, size: 12, font: helvetica });
      page.drawText(`Domain: ${data.domain}`, { x: 50, y: 720, size: 12, font: helvetica });
      page.drawText(`ID: ${data.unique_id}`, { x: 300, y: 740, size: 12, font: helvetica });
      page.drawText(`Start Date: ${data.start_date}`, { x: 300, y: 720, size: 11, font: helvetica });
      page.drawText(`Duration: ${data.internship_duration}`, { x: 300, y: 700, size: 11, font: helvetica });

      const body = [
        `Dear ${data.full_name},`,
        ``,
        `Congratulations! We are excited to offer you the position of ${data.domain} at GT Technovation Innovations.`,
        ``,
        `Start Date: ${data.start_date}`,
        `Duration: ${data.internship_duration}`
      ];
      let y = 680;
      for (const line of body) {
        page.drawText(line, { x: 50, y, size: 11, font: helvetica });
        y -= 18;
      }

      const bytes = await pdfDoc.save();
      fs.writeFileSync(outPath, bytes);
      return outPath;
    }
  } catch (err) {
    console.error("PDF offer generation error:", err);
    throw err;
  }
}

/**
 * Generate Certificate PDF (overlay on certificate template if available)
 * data keys: fullName, uniqueId, domain, startDate, endDate, durationText, certificateNumber, issueDate, directorName, verifyUrl
 * returns path to generated file
 */
async function generateCertificatePDF(data) {
  const templatePath = path.join(TEMPLATE_FOLDER, "certificate_template.pdf");
  const certNo = data.certificateNumber || data.uniqueId || `certificate-${Date.now()}`;
  const outPath = path.join(PDF_FOLDER, "certificates", `${certNo}_certificate.pdf`);
  try {
    if (!fs.existsSync(templatePath)) {
      // fallback simple certificate
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([842, 595]); // landscape-ish
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      page.drawText("Certificate of Completion", { x: 220, y: 400, size: 28, font: helveticaBold });
      page.drawText(data.fullName || "", { x: 220, y: 350, size: 22, font: helveticaBold });
      page.drawText(data.domain || "", { x: 220, y: 320, size: 16, font: helvetica });
      const bytes = await pdfDoc.save();
      fs.writeFileSync(outPath, bytes);
      return outPath;
    }

    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();

    // top-right certificate number
    if (data.certificateNumber) {
      page.drawText(String(data.certificateNumber), { x: width - 100, y: height - 30, size: 11, font: helvetica });
    }

    // name centered
    const name = data.fullName || "";
    page.drawText(name, { x: width / 2 - (name.length * 3.5), y: height * 0.5, size: 36, font: helveticaBold });

    if (data.domain) page.drawText(data.domain, { x: width / 2 + 170, y: height * 0.5 - 54, size: 16, font: helvetica });
    if (data.durationText) page.drawText(data.durationText, { x: width / 2 - 70, y: height * 0.5 - 54, size: 16, font: helvetica });

    if (data.startDate || data.endDate) {
      const line = data.startDate && data.endDate ? `${data.startDate} - ${data.endDate}` : (data.startDate || data.endDate);
      page.drawText(line, { x: width / 2 + 125, y: height * 0.5 - 70, size: 14, font: helvetica });
    }

    if (data.issueDate) page.drawText(data.issueDate, { x: 30, y: 30, size: 10, font: helvetica });

    if (data.verifyUrl) {
      // embed QR
      const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, { margin: 1, width: 200 });
      const base64 = qrDataUrl.split(",")[1];
      const qrImageBytes = Buffer.from(base64, "base64");
      try {
        const pngImage = await pdfDoc.embedPng(qrImageBytes);
        const qrSize = 70;
        page.drawImage(pngImage, { x: width - 30 - qrSize, y: 30, width: qrSize, height: qrSize });
      } catch (e) { /* ignore */ }
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outPath, pdfBytes);
    return outPath;
  } catch (err) {
    console.error("Certificate generation error:", err);
    throw err;
  }
}

module.exports = {
  generateOfferLetterPDF,
  generateCertificatePDF
};