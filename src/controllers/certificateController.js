const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const Applicant = require("../models/Applicant");
const Certificate = require("../models/Certificate");
const { sendEmail } = require("../utils/sendEmail");

const { generateCertificatePDF } = require("../services/pdfService");

const PDF_ROOT = path.join(__dirname, "..", "..", "generated_pdfs");
const CERT_DIR = path.join(PDF_ROOT, "certificates");
fs.mkdirSync(CERT_DIR, { recursive: true });

function generateCertificateNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CERT-${date}-${rand}`;
}

async function generateForApplicantService(uniqueId) {
  const applicant = await Applicant.findOne({ uniqueId });
  if (!applicant) throw new Error("Applicant not found: " + uniqueId);

  if (applicant.certificateGenerated) {
    const existing = await Certificate.findOne({ applicant: applicant._id });
    if (existing) return existing;
  }

  const certificateNumber = generateCertificateNumber();

  const payload = {
    fullName: applicant.fullName,
    certificateNumber,
    domain: applicant.domain || "",
    startDate: applicant.startDate
      ? new Date(applicant.startDate).toLocaleDateString()
      : "",
    endDate: applicant.endDate
      ? new Date(applicant.endDate).toLocaleDateString()
      : "",
    durationText: applicant.duration || "",
    issueDate: new Date().toLocaleDateString(),
    directorName: process.env.CERT_DIRECTOR_NAME || "Priyanshu Tiwari",
    verifyUrl: (process.env.CLIENT_URL || "").replace(/\/$/, "") + `/verify/${certificateNumber}`,
  };

  let returned = await generateCertificatePDF(payload);

  const filename = `${certificateNumber}_certificate.pdf`;
  let savePath;
  if (Buffer.isBuffer(returned)) {
    savePath = path.join(CERT_DIR, filename);
    fs.writeFileSync(savePath, returned);
  } else if (typeof returned === "string") {
    savePath = returned;
    if (!path.isAbsolute(savePath)) {
      savePath = path.join(__dirname, "..", returned);
    }
    const destFilename = `${certificateNumber}_certificate.pdf`;
    const destPath = path.join(CERT_DIR, destFilename);
    if (path.resolve(savePath) !== path.resolve(destPath)) {
      try {
        fs.copyFileSync(savePath, destPath);
        savePath = destPath;
      } catch (e) {
        console.warn("Could not copy generated PDF to certificates folder:", e.message);
      }
    }
  } else {
    throw new Error("generateCertificatePDF returned unsupported type");
  }

  if (!fs.existsSync(savePath)) {
    throw new Error("Certificate PDF missing after generation: " + savePath);
  }

  const certDoc = await Certificate.create({
    certificateNumber,
    applicant: applicant._id,
    applicantUniqueId: applicant.uniqueId,
    fullName: applicant.fullName,
    domain: applicant.domain,
    startDate: applicant.startDate,
    endDate: applicant.endDate,
    durationText: applicant.duration,
    filePath: savePath,
    generatedAt: new Date(),
  });

  const pdfBuffer = fs.readFileSync(savePath);
  const pdfBase64 = pdfBuffer.toString("base64");

  await sendEmail({
    to: applicant.email,
    subject: `🎓 Your Internship Certificate — ${applicant.domain || ""}`,
    html: `
    <div style="font-family:Arial, sans-serif; line-height:1.6; color:#333;">
      <p style="font-size:16px;">Dear ${applicant.fullName},</p>

      <p>We are pleased to inform you that you have successfully completed your internship at <strong>GT Technovation</strong>. Your official internship completion certificate has been attached with this email.</p>

      <p>
        <strong>Certificate Number:</strong> ${certificateNumber}<br/>
        <strong>Domain:</strong> ${applicant.domain}
      </p>

      <p>We appreciate your dedication, hard work, and commitment throughout the internship period. We hope the experience gained during this program helps you in your future academic and professional journey.</p>

      <br/>

      <p>Wishing you continued success ahead.</p>

      <p>Warm regards,<br/>
      <strong>GT Technovation HR Team</strong></p>
    </div>
  `,
    attachments: [
      {
        filename: filename,
        content: pdfBase64,
        contentType: "application/pdf",
      },
    ],
  });

  certDoc.sentAt = new Date();
  await certDoc.save();

  applicant.certificateGenerated = true;
  applicant.certificateSentAt = new Date();
  await applicant.save();

  return certDoc;
}

async function generateForApplicantRoute(req, res) {
  try {
    const uniqueId = req.params.uniqueId;
    const cert = await generateForApplicantService(uniqueId);
    res.json({
      message: "Certificate generated & emailed",
      certificateNumber: cert.certificateNumber,
    });
  } catch (err) {
    console.error("generateForApplicantRoute error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

async function downloadByUniqueId(req, res) {
  try {
    const uniqueId = req.params.uniqueId;
    if (!uniqueId) {
      return res.status(400).json({ message: "uniqueId param missing" });
    }

    const applicant = await Applicant.findOne({ uniqueId });
    if (!applicant) {
      console.warn(`[download] Applicant not found for uniqueId=${uniqueId}`);
      return res.status(404).json({ message: "Applicant not found" });
    }

    const cert = await Certificate.findOne({ applicant: applicant._id });
    if (!cert || !cert.filePath) {
      console.warn(`[download] Certificate doc not found for applicant=${uniqueId}`);
      return res.status(404).json({ message: "Certificate not available" });
    }

    // Resolve absolute path
    const filePath = path.isAbsolute(cert.filePath) ? cert.filePath : path.join(__dirname, "..", cert.filePath);
    if (!fs.existsSync(filePath)) {
      console.warn(`[download] Certificate file missing on disk. expected=${filePath}`);
      return res.status(404).json({ message: "Certificate file missing on server" });
    }

    const stat = fs.statSync(filePath);
    const filename = `${cert.certificateNumber}_certificate.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", stat.size);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("[download] stream error:", err);
      if (!res.headersSent) return res.status(500).json({ message: "Error streaming file" });
      res.destroy();
    });
  } catch (err) {
    console.error("downloadByUniqueId error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}

async function verify(req, res) {
  try {
    let certificateNumber = req.params.certificateNumber;
    if (!certificateNumber)
      return res.status(400).json({ valid: false, message: "certificateNumber required" });
    certificateNumber = certificateNumber.toString().trim();
    const cert = await Certificate.findOne({
      certificateNumber: { $regex: `^${certificateNumber}$`, $options: "i" },
    }).populate("applicant", "uniqueId fullName email");
    if (!cert) return res.status(404).json({ valid: false, message: "Certificate not found" });
    return res.json({
      valid: true,
      certificateNumber: cert.certificateNumber,
      fullName: cert.fullName,
      domain: cert.domain,
      startDate: cert.startDate,
      endDate: cert.endDate,
      issueDate: cert.issueDate,
      applicantUniqueId: cert.applicantUniqueId,
    });
  } catch (err) {
    console.error("verify error:", err);
    return res.status(500).json({ valid: false, message: "Server error" });
  }
}

module.exports = {
  generateForApplicantService,
  generateForApplicantRoute,
  downloadByUniqueId,
  verify,
};