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
    
    // Ensure directories exist
    [TEMPLATE_FOLDER, PDF_FOLDER].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const templatePath = path.join(TEMPLATE_FOLDER, "certificate_template.pdf");
    
    if (!fs.existsSync(templatePath)) {
      throw new Error('Certificate template not found');
    }

    // Load template PDF
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Embed fonts for certificate
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Certificate number top-right
    const certificateNumber = data.certificateNumber || '';
    if (certificateNumber) {
      firstPage.drawText(certificateNumber, {
        x: width - 120,
        y: height - 15,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }

    // Name centered prominently
    const fullName = data.fullName || '';
    if (fullName) {
      firstPage.drawText(fullName, {
        x: width / 2 - 100,
        y: height / 2,
        size: 36,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
    }

    // Domain/Title
    const domain = data.domain || '';
    if (domain) {
      firstPage.drawText(domain, {
        x: width / 2 + 73,
        y: height / 2 - 54,
        size: 15,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }

    // Duration text
    const durationText = data.durationText || '';
    if (durationText) {
      firstPage.drawText(durationText, {
        x: width / 2 - 100,
        y: height / 2 - 54,
        size: 16,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }

    // Date range
    const startDate = data.startDate || '';
    const endDate = data.endDate || '';
    if (startDate && endDate) {
      firstPage.drawText(`${startDate}      ${endDate}`, {
        x: width / 2 + 25,
        y: height / 2 - 76,
        size: 13,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }

    // Issue date bottom-left
    const issueDate = data.issueDate || '';
    if (issueDate) {
      firstPage.drawText(issueDate, {
        x: 80,
        y: 20,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }

    // QR Code
    const verifyUrl = data.verifyUrl;
    if (verifyUrl) {
      try {
        const qrPng = qr.imageSync(verifyUrl, { type: 'png', size: 6 });
        const qrImage = await pdfDoc.embedPng(qrPng);
        
        firstPage.drawImage(qrImage, {
          x: width - 110,
          y: 40,
          width: 70,
          height: 70,
        });
      } catch (qrError) {
        console.log('Error generating QR code:', qrError);
      }
    }

    // Save the certificate
    const certificatesFolder = path.join(PDF_FOLDER, "certificates");
    if (!fs.existsSync(certificatesFolder)) {
      fs.mkdirSync(certificatesFolder, { recursive: true });
    }

    const outputFilename = certificateNumber ? 
      `${certificateNumber}_certificate.pdf` : 
      `${data.uniqueId || 'certificate'}_certificate.pdf`;
    
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