

// src/controllers/certificateController.js

const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const cron = require("node-cron");

const Applicant = require("../models/Applicant");
const Certificate = require("../models/Certificate");
const { sendEmail } = require("../utils/sendEmail");
const { generateCertificatePDF } = require("../services/pdfService");

const PDF_ROOT = path.join(__dirname, "..", "..", "generated_pdfs");
const CERT_DIR = path.join(PDF_ROOT, "certificates");
fs.mkdirSync(CERT_DIR, { recursive: true });

function toIST(date) {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}
function toISTMidnight(date) {
  const d = toIST(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Certificate number generator
function generateCertificateNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CERT-${date}-${rand}`;
}

async function generateForApplicantService(uniqueId) {
  const applicant = await Applicant.findOne({ uniqueId });
  if (!applicant) return null;

  if (applicant.certificateGenerated) {
    const existing = await Certificate.findOne({ applicant: applicant._id });
    if (existing) return existing;
  }

  const certificateNumber = generateCertificateNumber();

  // Issue date: 10AM IST on end date
  let issueDate = toIST(new Date(applicant.endDate));
  issueDate.setHours(10, 0, 0, 0);

  const payload = {
    fullName: applicant.fullName,
    certificateNumber,
    domain: applicant.domain || "",
    startDate: applicant.startDate,
    endDate: applicant.endDate,
    durationText: applicant.duration || "",
    issueDate,
    directorName: process.env.CERT_DIRECTOR_NAME || "Priyanshu Tiwari",
    verifyUrl:
      (process.env.CLIENT_URL || "").replace(/\/$/, "") +
      `/verify/${certificateNumber}`,
  };

  let returned = await generateCertificatePDF(payload);
  const filename = `${certificateNumber}_certificate.pdf`;
  let savePath;

  if (Buffer.isBuffer(returned)) {
    savePath = path.join(CERT_DIR, filename);
    fs.writeFileSync(savePath, returned);
  } else if (typeof returned === "string") {
    savePath = path.join(CERT_DIR, filename);
    fs.copyFileSync(returned, savePath);
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
    issueDate,
  });

  const pdfBase64 = fs.readFileSync(savePath).toString("base64");

  await sendEmail({
    to: applicant.email,
    subject: `🎓 Your Internship Certificate — ${applicant.domain || ""}`,
    html: `
    <p>Dear ${applicant.fullName},</p>
    <p>Congratulations on completing your internship at <strong>GT Technovation</strong>.</p>
    <p>Your certificate has been attached below.</p>
    <p><strong>Certificate Number:</strong> ${certificateNumber}</p>
    `,
    attachments: [
      { filename, content: pdfBase64, contentType: "application/pdf" },
    ],
  });

  certDoc.sentAt = new Date();
  await certDoc.save();

  applicant.certificateGenerated = true;
  applicant.certificateSentAt = new Date();
  await applicant.save();

  return certDoc;
}

// ➤ Auto Scheduler - runs every day at 10:00 AM IST
cron.schedule("0 10 * * *", async () => {
  try {
    const nowDateIST = toISTMidnight(new Date());

    const dueApplicants = await Applicant.find({
      certificateGenerated: { $ne: true },
    });

    for (let app of dueApplicants) {
      if (!app.endDate) continue;

      const endIST = toISTMidnight(app.endDate);

      if (endIST.getTime() === nowDateIST.getTime()) {
        console.log("🎯 Generating Auto Certificate For:", app.uniqueId);
        await generateForApplicantService(app.uniqueId);
      }
    }
  } catch (err) {
    console.warn("Auto-certificate scheduler error:", err.message);
  }
});

// Manual Generation Route
async function generateForApplicantRoute(req, res) {
  const cert = await generateForApplicantService(req.params.uniqueId);
  if (!cert)
    return res.json({ message: "Applicant not found", ok: false });
  return res.json({
    message: "Certificate generated & emailed",
    certificateNumber: cert.certificateNumber,
    ok: true,
  });
}

// Certificate Download API
async function downloadByUniqueId(req, res) {
  try {
    const applicant = await Applicant.findOne({ uniqueId: req.params.uniqueId });
    if (!applicant) {
      return res.status(404).json({ message: "Applicant not found" });
    }

    let cert = await Certificate.findOne({ applicant: applicant._id });

    if (!cert) {
      return res.status(404).json({ message: "Certificate not generated yet" });
    }

    // If PDF file missing → regenerate using SAME certificate data
    if (!cert.filePath || !fs.existsSync(cert.filePath)) {
      console.log("PDF missing, regenerating...");

      const payload = {
        fullName: cert.fullName,
        certificateNumber: cert.certificateNumber, // SAME NUMBER
        domain: cert.domain,
        startDate: cert.startDate,
        endDate: cert.endDate,
        durationText: cert.durationText,
        issueDate: cert.issueDate,
        directorName: process.env.CERT_DIRECTOR_NAME || "Priyanshu Tiwari",
        verifyUrl:
          (process.env.CLIENT_URL || "").replace(/\/$/, "") +
          `/verify/${cert.certificateNumber}`,
      };

      const returned = await generateCertificatePDF(payload);

      const filename = `${cert.certificateNumber}_certificate.pdf`;
      const savePath = path.join(CERT_DIR, filename);

      if (Buffer.isBuffer(returned)) {
        fs.writeFileSync(savePath, returned);
      } else {
        fs.copyFileSync(returned, savePath);
      }

      cert.filePath = savePath;
      await cert.save();
    }

    return res.download(cert.filePath, path.basename(cert.filePath));

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}
// Secure Verify API ✔ SAFE NO BACKEND ERROR LEAKS
async function verify(req, res) {
  try {
    const cert = await Certificate.findOne({
      certificateNumber: req.params.certificateNumber.trim(),
    }).populate("applicant", "uniqueId fullName");

    if (!cert) {
      return res.json({
        valid: false,
        message: "Certificate not found",
      });
    }

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
  } catch {
    return res.json({
      valid: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

module.exports = {
  generateForApplicantService,
  generateForApplicantRoute,
  downloadByUniqueId,
  verify,
};
