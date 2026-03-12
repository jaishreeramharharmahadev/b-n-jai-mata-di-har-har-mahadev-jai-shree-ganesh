
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const Applicant = require("../models/Applicant");
const Feedback = require("../models/Feedback");


function toISTMidnight(date) {
  const d = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  d.setHours(0, 0, 0, 0);
  return d;
}

const RESUME_DIR = path.join(__dirname, "..", "uploads", "resumes");
fs.mkdirSync(RESUME_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "resume") cb(null, RESUME_DIR);
    else cb(new Error("Unexpected field"));
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

function fileFilter(req, file, cb) {
  if (file.fieldname === "resume") {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Resume must be a PDF."));
  } else {
    cb(new Error("Unexpected field."));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadFields = upload.fields([
  { name: "resume", maxCount: 1 },
]);

async function findApplicantByIdentifier(identifier) {
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Applicant.findById(identifier);
    if (byId) return byId;
  }
  return await Applicant.findOne({ uniqueId: identifier });
}

// ---------- CHECK AVAILABILITY ----------

async function checkAvailability(req, res) {
  try {
    const { applicantIdentifier } = req.params;

    const applicant = await findApplicantByIdentifier(applicantIdentifier);

    if (!applicant)
      return res.status(404).json({ ok: false, message: "Applicant not found" });

    if (!applicant.startDate)
      return res.status(400).json({ ok: false, message: "Applicant startDate not set" });

    const nowIST = toISTMidnight(new Date());
    const startIST = toISTMidnight(new Date(applicant.startDate));

    let available = false;

    if (nowIST >= startIST && !applicant.feedbackSubmitted) {
      available = true;
    }

    return res.json({
      ok: true,
      available,
      nowIST,
      startDateIST: startIST,
      uniqueId: applicant.uniqueId,
      feedbackSubmitted: applicant.feedbackSubmitted,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message,
    });

  }
}

async function submitFeedback(req, res) {

  uploadFields(req, res, async function (uploadErr) {

    try {

      if (uploadErr)
        return res.status(400).json({ ok: false, message: uploadErr.message });

      const { applicantIdentifier } = req.params;

      const applicant = await findApplicantByIdentifier(applicantIdentifier);

      if (!applicant)
        return res.status(404).json({ ok: false, message: "Applicant not found" });

      if (!applicant.startDate)
        return res.status(400).json({ ok: false, message: "Applicant startDate missing" });

      const nowIST = toISTMidnight(new Date());
      const startIST = toISTMidnight(new Date(applicant.startDate));

      if (nowIST < startIST)
        return res.status(403).json({
          ok: false,
          message: "Feedback allowed only after internship start.",
        });

      if (applicant.feedbackSubmitted)
        return res.status(403).json({
          ok: false,
          message: "Feedback already submitted.",
        });

      const { internshipRating, generalRemarks } = req.body;

      let fieldReviews = [];

      if (!internshipRating)
        return res.status(400).json({
          ok: false,
          message: "Rating is required",
        });

      const ratingNumber = Number(internshipRating);

      if (!Number.isFinite(ratingNumber) || ratingNumber < 1 || ratingNumber > 5)
        return res.status(400).json({
          ok: false,
          message: "Rating must be between 1 and 5.",
        });

      if (req.body.fieldReviews) {
        try {
          fieldReviews = JSON.parse(req.body.fieldReviews);
        } catch {
          return res.status(400).json({
            ok: false,
            message: "fieldReviews must be valid JSON.",
          });
        }
      }

      if (!Array.isArray(fieldReviews))
        return res.status(400).json({
          ok: false,
          message: "fieldReviews must be an array.",
        });

      if (fieldReviews.length > 3)
        return res.status(400).json({
          ok: false,
          message: "Maximum 3 field reviews allowed.",
        });

      const resumeFile =
        req.files && req.files.resume ? req.files.resume[0] : null;

      const feedbackDoc = new Feedback({
        applicant: applicant._id,
        internshipRating: ratingNumber,
        generalRemarks: generalRemarks || "",
        fieldReviews,
        submittedAt: new Date(),
      });

      if (resumeFile) feedbackDoc.resume = resumeFile;

      await feedbackDoc.save();

      applicant.feedbackSubmitted = true;
      await applicant.save();

      return res.status(201).json({
        ok: true,
        message: "Feedback submitted successfully.",
        feedbackId: feedbackDoc._id,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        ok: false,
        message: "Server error",
        error: err.message,
      });

    }

  });

}

module.exports = {
  checkAvailability,
  submitFeedback,
};
