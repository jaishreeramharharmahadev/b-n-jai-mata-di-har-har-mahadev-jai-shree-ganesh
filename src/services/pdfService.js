const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const qr = require('qr-image');

async function generateOfferLetterPDF(data) {
  try {
    const TEMPLATE_FOLDER = path.join(__dirname, 'templates');
    const PDF_FOLDER = path.join(__dirname, 'generated_pdfs');
    const STATIC_FOLDER = path.join(__dirname, 'static');
    
    // Ensure directories exist
    [TEMPLATE_FOLDER, PDF_FOLDER, STATIC_FOLDER].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const templatePath = path.join(TEMPLATE_FOLDER, "offerLetterTemplate.pdf");
    
    if (!fs.existsSync(templatePath)) {
      return await generateOfferLetterFromScratch(data);
    }

    // Load the template PDF
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // Get the first page dimensions
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Embed fonts in the main document
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw directly on the template page
    // Candidate Information
    firstPage.drawText(`To: ${data.full_name}`, {
      x: 30,
      y: height - 200,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText(`Domain: ${data.domain}`, {
      x: 30,
      y: height - 220,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText('Location: Online(Remote)', {
      x: 30,
      y: height - 240,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText(`ID: ${data.unique_id}`, {
      x: 300,
      y: height - 200,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText(`Start Date: ${data.start_date}`, {
      x: 300,
      y: height - 240,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText(`Duration: ${data.internship_duration}`, {
      x: 300,
      y: height - 220,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    // Offer letter content
    let yPosition = height - 280;
    const contentLines = [
      `Dear ${data.full_name},`,
      "",
      `Congratulations! We are excited to offer you the position of ${data.domain} at GT Technovation.`,
      "Your application demonstrated exceptional potential and alignment with our organization's values and objectives.",
      "",
      "This internship opportunity is designed to provide you with hands-on experience in real-world projects while working",
      "alongside our experienced professionals. We are confident that this experience will significantly contribute to your",
      "professional development and career growth.",
      "",
      `During your ${data.internship_duration} internship period, you will have the opportunity to work on challenging projects and contribute`,
      "to meaningful solutions. We believe that your unique perspective and skills will be valuable assets to our team and",
      "and we look forward to the innovative contributions we know you will make.",
      "",
      "Welcome to GT Technovation Innovations! We look forward to seeing the great work you will accomplish.",
    ];

    contentLines.forEach(line => {
      firstPage.drawText(line, {
        x: 30,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;
    });

    // Terms and conditions
    yPosition -= 30;
    firstPage.drawText('Terms & Conditions:', {
      x: 30,
      y: yPosition,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    yPosition -= 15;
    const terms = [
      `• Internship period: ${data.internship_duration}`,
      "• Participate in project planning and development activities",
      "• Professional conduct and performance expectations must be maintained",
      "• All company policies and procedures must be adhered to during the internship period",
      "• Successful completion may lead to certificate of completion and potential references",
      "• Provide regular progress updates to your supervisor"
    ];

    terms.forEach(term => {
      firstPage.drawText(term, {
        x: 40,
        y: yPosition,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 12;
    });

    // Add signatures if they exist
    

    // Footer information
    yPosition -= 150;
    const currentDate = format(new Date(), 'dd MMMM, yyyy');

    firstPage.drawText(`Internship ID: ${data.unique_id}`, {
      x: 50,
      y: yPosition,
      size: 8,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText(`Date: ${currentDate}`, {
      x: 50,
      y: yPosition - 12,
      size: 8,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText('www.gttechnovation.com', {
      x: 50,
      y: yPosition - 24,
      size: 8,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    // Save the final PDF
    const pdfBytes = await pdfDoc.save();
    const outputPath = path.join(PDF_FOLDER, `${data.unique_id}_offer_letter.pdf`);
    fs.writeFileSync(outputPath, pdfBytes);

    return outputPath;

  } catch (error) {
    console.error('Error generating offer letter PDF:', error);
    return await generateOfferLetterFromScratch(data);
  }
}

async function generateOfferLetterFromScratch(data) {
  const PDF_FOLDER = path.join(__dirname, 'generated_pdfs');
  
  if (!fs.existsSync(PDF_FOLDER)) {
    fs.mkdirSync(PDF_FOLDER, { recursive: true });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Basic fallback content
  page.drawText('GT Technovation Innovations', {
    x: 30,
    y: 750,
    size: 18,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Offer Letter for ${data.full_name}`, {
    x: 30,
    y: 700,
    size: 16,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Domain: ${data.domain}`, {
    x: 30,
    y: 650,
    size: 12,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Duration: ${data.internship_duration}`, {
    x: 30,
    y: 630,
    size: 12,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  const outputPath = path.join(PDF_FOLDER, `${data.unique_id}_offer_letter_fallback.pdf`);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);

  return outputPath;
}



async function generateCertificatePDF(data) {
  try {
    const TEMPLATE_FOLDER = path.join(__dirname, "templates");
    const PDF_FOLDER = path.join(__dirname, "generated_pdfs");
    const FONT_FOLDER = path.join(__dirname, "fonts");

    

    [TEMPLATE_FOLDER, PDF_FOLDER, FONT_FOLDER].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const templatePath = path.join(TEMPLATE_FOLDER, "certificate_template.pdf");
    if (!fs.existsSync(templatePath))
      throw new Error("Certificate template not found");

    const templateBytes = fs.readFileSync(templatePath);
const pdfDoc = await PDFDocument.load(templateBytes);

pdfDoc.registerFontkit(fontkit);

    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const customFontPath = path.join(
      FONT_FOLDER,
      "GreatVibes-Wmr4.ttf"
    );
    const customFontBytes = fs.readFileSync(customFontPath);
    const customFont = await pdfDoc.embedFont(customFontBytes);

    const bodyColor = rgb(25 / 255, 36 / 255, 28 / 255);
    const darkTeal = rgb(0 / 255, 85 / 255, 87 / 255);

    const formatDate = (d) =>
      d && !isNaN(new Date(d)) ? format(new Date(d), "dd/MM/yyyy") : "";

    const normalizeDuration = (d) =>
      d ? d.replace(/Month/gi, "month") : "";

    const fullName = data.fullName || "Intern Name";
    const duration = normalizeDuration(data.duration || data.durationText || "");
    const domain = data.domain || data.designation || "";
    const startDate = formatDate(data.startDate);
    const endDate = formatDate(data.endDate);
    const certificateNumber = data.certificateNumber || "";
    const verifyUrl = data.verifyUrl;
    const issueFormatted =
      formatDate(data.issueDate) || format(new Date(), "dd/MM/yyyy");

    if (certificateNumber) {
      page.drawText(`CIN No. - ${certificateNumber}`, {
        x: width - 180,
        y: height - 5,
        size: 8,
        font: helvetica,
        color: bodyColor,
      });
    }

    const subtitle = "This certificate is proudly presented to";
    const subSize = 14;
    const subW = helvetica.widthOfTextAtSize(subtitle, subSize);
    page.drawText(subtitle, {
      x: (width - subW) / 2,
      y: height - 205,
      size: subSize,
      font: helvetica,
      color: bodyColor,
    });

    const nameSize = 48;
    const nameWidth = customFont.widthOfTextAtSize(fullName, nameSize);
    page.drawText(fullName, {
      x: (width - nameWidth) / 2,
      y: height - 255,
      size: nameSize,
      font: customFont,
      color: darkTeal,
    });

    const mainY = height - 305;
    const segs = [
      { t: "has successfully completed a ", b: false },
      { t: duration + " ", b: true },
      { t: "internship as a ", b: false },
      { t: domain + " Intern ", b: true },
    ];

    let mainWidth = segs.reduce(
      (a, s) =>
        a +
        (s.b
          ? helveticaBold.widthOfTextAtSize(s.t, 16)
          : helvetica.widthOfTextAtSize(s.t, 16)),
      0
    );

    let mx = (width - mainWidth) / 2;

    segs.forEach((s) => {
      const f = s.b ? helveticaBold : helvetica;
      const w = f.widthOfTextAtSize(s.t, 16);
      page.drawText(s.t, {
        x: mx,
        y: mainY,
        size: 16,
        font: f,
        color: bodyColor,
      });
      mx += w;
    });

    const dateSeg = [
      { t: "at ", b: false },
      { t: "GT Technovation ", b: true },
      { t: "from ", b: false },
      { t: startDate, b: true },
      { t: " to ", b: false },
      { t: endDate, b: true },
      { t: ".", b: false },
    ];

    let dateWidth = dateSeg.reduce(
      (a, s) =>
        a +
        (s.b
          ? helveticaBold.widthOfTextAtSize(s.t, 16)
          : helvetica.widthOfTextAtSize(s.t, 16)),
      0
    );

    let dx = (width - dateWidth) / 2;

    dateSeg.forEach((s) => {
      const f = s.b ? helveticaBold : helvetica;
      const w = f.widthOfTextAtSize(s.t, 16);

      page.drawText(s.t, {
        x: dx,
        y: height - 330,
        size: 16,
        font: f,
        color: bodyColor,
      });
      dx += w;
    });

    const performance =
      "During the internship, the intern consistently demonstrated strong professionalism, learning capability, and dedication toward assigned responsibilities. Their contribution is sincerely appreciated, and we extend our best wishes for a successful future career.";

    const words = performance.split(" ");
    let line = "";
    let py = height - 365;
    const lh = 18;
    const maxWidth = 580;

    for (let i = 0; i < words.length; i++) {
      const test = line ? line + " " + words[i] : words[i];
      if (helvetica.widthOfTextAtSize(test, 14) > maxWidth) {
        page.drawText(line, {
          x: (width - helvetica.widthOfTextAtSize(line, 14)) / 2,
          y: py,
          size: 14,
          font: helvetica,
          color: bodyColor,
        });
        line = words[i];
        py -= lh;
      } else line = test;
    }

    page.drawText(line, {
      x: (width - helvetica.widthOfTextAtSize(line, 14)) / 2,
      y: py,
      size: 14,
      font: helvetica,
      color: bodyColor,
    });

    if (certificateNumber) {
      const cinTxt = `Certificate No.: ${certificateNumber}`;
      page.drawText(cinTxt, {
        x: (width - helveticaBold.widthOfTextAtSize(cinTxt, 12)) / 2,
        y: 120,
        size: 12,
        font: helveticaBold,
        color: bodyColor,
      });
    }

    if (verifyUrl) {
      const qrImg = await pdfDoc.embedPng(
        qr.imageSync(verifyUrl, { type: "png", size: 6 })
      );
      page.drawImage(qrImg, {
        x: (width - 70) / 2,
        y: 40,
        width: 70,
        height: 70,
      });
    }

    page.drawText(`Issued on: ${issueFormatted}`, {
      x: 80,
      y: 20,
      size: 10,
      font: helveticaBold,
      color: bodyColor,
    });

    const outputPath = path.join(
      PDF_FOLDER,
      `${certificateNumber || "certificate"}.pdf`
    );

    fs.writeFileSync(outputPath, await pdfDoc.save());

    return outputPath;
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return null;
  }
}

module.exports = {
  generateOfferLetterPDF,
  generateCertificatePDF
};