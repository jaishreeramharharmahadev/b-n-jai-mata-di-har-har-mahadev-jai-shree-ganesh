const path = require("path");
const fs = require("fs");
const axios = require("axios");

const Applicant = require("../models/Applicant");
const Certificate = require("../models/Certificate");
const { sendEmail } = require("../utils/sendEmail");

const PDF_ROOT = path.join(__dirname, "../generated_pdfs");
const CERT_DIR = path.join(PDF_ROOT, "certificates");
fs.mkdirSync(CERT_DIR, { recursive: true });

function generateCertificateNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CERT-${date}-${rand}`;
}

async function generateForApplicantService(uniqueId) {
  // find applicant
  const applicant = await Applicant.findOne({ uniqueId });
  if (!applicant) throw new Error("Applicant not found: " + uniqueId);

  // Prevent double-generation
  if (applicant.certificateGenerated) {
    // return existing certificate if present
    const existing = await Certificate.findOne({ applicant: applicant._id });
    if (existing) return existing;
    // else continue to create, but still set unique sane behaviour
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
    verifyUrl:
      (process.env.CLIENT_URL) +
      `/verify/${certificateNumber}`,
  };

  // Call Flask microservice to generate PDF
  const pyUrl =
    `${process.env.FLASK_API_URL}/generate-certificate`;
  const resp = await axios.post(pyUrl, payload, {
    responseType: "arraybuffer",
    timeout: 120000,
  });

  // Save PDF
  const filename = `${certificateNumber}_certificate.pdf`;
  const savePath = path.join(CERT_DIR, filename);
  fs.writeFileSync(savePath, Buffer.from(resp.data));

  // Create certificate DB record
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

  // Email the PDF
  const pdfBase64 = fs.readFileSync(savePath).toString("base64");
  await sendEmail({
    to: applicant.email,
    subject: `🎓 Your Internship Certificate — ${applicant.domain || ""}`,
    html: `<p>Hi ${applicant.fullName},</p><p>Congratulations — your internship certificate is attached. Certificate No: <strong>${certificateNumber}</strong>.</p><p>— Team TechnoPhile</p>`,
    attachments: [
      { filename, content: pdfBase64, contentType: "application/pdf" },
    ],
  });

  // update certificate sentAt and applicant flags
  certDoc.sentAt = new Date();
  await certDoc.save();

  applicant.certificateGenerated = true;
  applicant.certificateSentAt = new Date();
  await applicant.save();

  return certDoc;
}

// Controller wrapper for route: POST /api/certificates/generate/:uniqueId
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

// Controller wrapper for download and verify (you likely already have these)
async function downloadByUniqueId(req, res) {
  try {
    const uniqueId = req.params.uniqueId;
    if (!uniqueId) {
      return res.status(400).json({ message: "uniqueId param missing" });
    }

    // Find applicant by uniqueId
    const applicant = await Applicant.findOne({ uniqueId });
    if (!applicant) {
      console.warn(`[download] Applicant not found for uniqueId=${uniqueId}`);
      return res.status(404).json({ message: "Applicant not found" });
    }

    // Find certificate document
    const cert = await Certificate.findOne({ applicant: applicant._id });
    if (!cert || !cert.filePath) {
      console.warn(
        `[download] Certificate doc not found for applicant=${uniqueId}`
      );
      return res.status(404).json({ message: "Certificate not available" });
    }

    // Resolve absolute path
    const filePath = path.isAbsolute(cert.filePath)
      ? cert.filePath
      : path.join(__dirname, "..", cert.filePath);
    if (!fs.existsSync(filePath)) {
      console.warn(
        `[download] Certificate file missing on disk. expected=${filePath}`
      );
      return res
        .status(404)
        .json({ message: "Certificate file missing on server" });
    }

    // Stream file with explicit headers (content-disposition)
    const stat = fs.statSync(filePath);
    const filename = `${cert.certificateNumber}_certificate.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", stat.size);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
        filename
      )}`
    );

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("[download] stream error:", err);
      if (!res.headersSent)
        return res.status(500).json({ message: "Error streaming file" });
      // if headers already sent, just destroy
      res.destroy();
    });
  } catch (err) {
    console.error("downloadByUniqueId error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}

async function verify(req, res) {
  try {
    let certificateNumber = req.params.certificateNumber;
    if (!certificateNumber)
      return res
        .status(400)
        .json({ valid: false, message: "certificateNumber required" });
    certificateNumber = certificateNumber.toString().trim();
    const cert = await Certificate.findOne({
      certificateNumber: { $regex: `^${certificateNumber}$`, $options: "i" },
    }).populate("applicant", "uniqueId fullName email");
    if (!cert)
      return res
        .status(404)
        .json({ valid: false, message: "Certificate not found" });
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
