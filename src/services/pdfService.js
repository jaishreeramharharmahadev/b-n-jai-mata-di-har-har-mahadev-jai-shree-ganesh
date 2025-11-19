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
    const TEMPLATE_FOLDER = path.join(__dirname, 'templates');
    const PDF_FOLDER = path.join(__dirname, 'generated_pdfs');

    [TEMPLATE_FOLDER, PDF_FOLDER].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const templatePath = path.join(TEMPLATE_FOLDER, "certificate_template.pdf");
    if (!fs.existsSync(templatePath)) throw new Error('Certificate template not found');

    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const nameFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const colorHex = rgb(25 / 255, 36 / 255, 28 / 255);

    const formatDateInput = (input) => {
      if (!input) return '';
      const d = new Date(input);
      if (isNaN(d)) return String(input);
      return format(d, 'dd/MM/yyyy');
    };

    const certificateNumber = data.certificateNumber || data.certificate_number || '';
    const fullName = data.fullName || data.full_name || '';
    const domain = data.domain || data.designation || '';
    const duration = data.durationText || data.internship_duration || data.duration || '';
    const startFormatted = formatDateInput(data.startDate || data.start_date || data.start) || '';
    const endFormatted = formatDateInput(data.endDate || data.end_date || data.end) || '';
    const issueFormatted = formatDateInput(data.issueDate || data.issue_date || data.issue) || format(new Date(), 'dd/MM/yyyy');
    const verifyUrl = data.verifyUrl;

    if (certificateNumber) {
      page.drawText(`CIN No. - ${certificateNumber}`, {
        x: width - 180,
        y: height - 5,
        size: 10,
        font: helveticaBold,
        color: colorHex,
      });
    }

    const subtitle = "This certificate is presented to";
    const subtitleSize = 14;
    const subtitleWidth = helvetica.widthOfTextAtSize(subtitle, subtitleSize);
    page.drawText(subtitle, {
      x: (width - subtitleWidth) / 2,
      y: height - 205,
      size: subtitleSize,
      font: helvetica,
      color: colorHex,
    });

    const nameSize = 35;
    const nameWidth = nameFont.widthOfTextAtSize(fullName || ' ', nameSize);
    page.drawText(fullName || ' ', {
      x: (width - nameWidth) / 2,
      y: height - 260,
      size: nameSize,
      font: nameFont,
      color: colorHex,
    });

    const segSize = 16;
    const segs = [
      { text: 'has successfully completed a ', font: helvetica, bold: false },
      { text: duration || 'N/A', font: helveticaBold, bold: true },
      { text: ' internship as a ', font: helvetica, bold: false },
      { text: domain || 'N/A', font: helveticaBold, bold: true },
      
    ];
    let totalWidth = 0;
    segs.forEach(s => {
      totalWidth += s.font.widthOfTextAtSize(s.text, segSize);
    });
    let curX = (width - totalWidth) / 2;
    const lineY = height - 300;
    for (const s of segs) {
      page.drawText(s.text, {
        x: curX,
        y: lineY,
        size: segSize,
        font: s.font,
        color: colorHex,
      });
      curX += s.font.widthOfTextAtSize(s.text, segSize);
    }

    const dateSegSize = 16;
    const dateSegs = [
      { text: ' Intern at ', font: helvetica, bold: false },
      { text: 'GT Technovation', font: helveticaBold, bold: true },
      { text: '.', font: helvetica, bold: false },
      { text: 'Dated from ', font: helvetica, bold: false },
      { text: startFormatted || 'N/A', font: helveticaBold, bold: true },
      { text: ' to ', font: helvetica, bold: false },
      { text: endFormatted || 'N/A', font: helveticaBold, bold: true },
      { text: '.', font: helvetica, bold: false }
    ];
    let dateTotalWidth = 0;
    dateSegs.forEach(s => { dateTotalWidth += s.font.widthOfTextAtSize(s.text, dateSegSize); });
    let dateX = (width - dateTotalWidth) / 2;
    const dateY = height - 320;
    for (const s of dateSegs) {
      page.drawText(s.text, {
        x: dateX,
        y: dateY,
        size: dateSegSize,
        font: s.font,
        color: colorHex,
      });
      dateX += s.font.widthOfTextAtSize(s.text, dateSegSize);
    }

    const performance = "During the internship we found them consistent & hardworking. We wish them all the best for their future endeavors.";
    const maxLineWidth = 600;
    const paraStartX = (width - maxLineWidth) / 2;
    let cursorY = height - 345;
    const words = performance.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const test = currentLine ? currentLine + ' ' + words[i] : words[i];
      const testW = helvetica.widthOfTextAtSize(test, 16);
      if (testW > maxLineWidth) {
        const lineWidth = helvetica.widthOfTextAtSize(currentLine, 16);
        const lineX = (width - lineWidth) / 2;
        page.drawText(currentLine, { 
          x: lineX, 
          y: cursorY, 
          size: 16, 
          font: helvetica, 
          color: colorHex
        });
        currentLine = words[i];
        cursorY -= 18;
      } else {
        currentLine = test;
      }
      if (i === words.length - 1 && currentLine) {
        const lineWidth = helvetica.widthOfTextAtSize(currentLine, 16);
        const lineX = (width - lineWidth) / 2;
        page.drawText(currentLine, { 
          x: lineX, 
          y: cursorY, 
          size: 16, 
          font: helvetica, 
          color: colorHex
        });
        cursorY -= 18;
      }
    }

    page.drawText(`Issue Date: ${issueFormatted}`, {
      x: 80,
      y: 15,
      size: 10,
      font: helveticaBold,
      color: colorHex,
    });

    if (verifyUrl) {
      try {
        const qrPng = qr.imageSync(verifyUrl, { type: 'png', size: 6 });
        const qrImage = await pdfDoc.embedPng(qrPng);
        
        const verifyText = "Verify";
        const verifyTextWidth = helveticaBold.widthOfTextAtSize(verifyText, 9);
        page.drawText(verifyText, {
          x: width - 110 + (70 - verifyTextWidth) / 2,
          y: 105,
          size: 9,
          font: helveticaBold,
          color: colorHex,
        });
        
        page.drawImage(qrImage, { 
          x: width - 110, 
          y: 30, 
          width: 70, 
          height: 70 
        });
      } catch (err) {
        console.log('QR Error:', err);
      }
    }

    const certificatesFolder = path.join(PDF_FOLDER, "certificates");
    if (!fs.existsSync(certificatesFolder)) fs.mkdirSync(certificatesFolder, { recursive: true });

    const outputFilename = certificateNumber ? `${certificateNumber}_certificate.pdf` : `${data.uniqueId || data.unique_id || 'certificate'}_certificate.pdf`;
    const outputPath = path.join(certificatesFolder, outputFilename);
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);

    return outputPath;
  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    return null;
  }
}


module.exports = {
  generateOfferLetterPDF,
  generateCertificatePDF
};