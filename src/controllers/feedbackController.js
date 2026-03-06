
// controllers/feedbackController.js
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const Applicant = require("../models/Applicant");
const Feedback = require("../models/Feedback");

// Convert any date to IST midnight (00:00)
function toISTMidnight(date) {
  const d = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  d.setHours(0, 0, 0, 0);
  return d;
}

// --- multer setup ---
const RESUME_DIR = path.join(__dirname, "..", "uploads", "resumes");
const VIDEO_DIR = path.join(__dirname, "..", "uploads", "videos");
fs.mkdirSync(RESUME_DIR, { recursive: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "resume") cb(null, RESUME_DIR);
    else if (file.fieldname === "videoFeedback") cb(null, VIDEO_DIR);
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
  } else if (file.fieldname === "videoFeedback") {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Video feedback must be a video file."));
  } else cb(new Error("Unexpected file field."));
}

const upload = require("multer")({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const uploadFields = upload.fields([
  { name: "resume", maxCount: 1 },
  { name: "videoFeedback", maxCount: 1 },
]);

// Helper: find applicant by either ObjectId or uniqueId
async function findApplicantByIdentifier(identifier) {
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Applicant.findById(identifier);
    if (byId) return byId;
  }
  return await Applicant.findOne({ uniqueId: identifier });
}

// GET — check availability
async function checkAvailability(req, res) {
  try {
    const { applicantIdentifier } = req.params;
    const applicant = await findApplicantByIdentifier(applicantIdentifier);
    if (!applicant)
      return res.status(404).json({ ok: false, message: "Applicant not found" });

    if (!applicant.endDate)
      return res.status(400).json({ ok: false, message: "Applicant endDate not set" });

    const nowIST = toISTMidnight(new Date());
    const endIST = toISTMidnight(new Date(applicant.endDate));

    const startFeedbackIST = new Date(endIST);
    startFeedbackIST.setDate(endIST.getDate() - 10);

    let available = false;

    if (applicant.startDate && !applicant.feedbackSubmitted) {
      available = true;
    }

    return res.json({
      ok: true,
      available,
      nowIST,
      startFeedbackIST,
      endDateIST: endIST,
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

// POST — Submit feedback
async function submitFeedback(req, res) {
  uploadFields(req, res, async function (uploadErr) {
    try {
      if (uploadErr)
        return res.status(400).json({ ok: false, message: uploadErr.message });

      const { applicantIdentifier } = req.params;
      const applicant = await findApplicantByIdentifier(applicantIdentifier);
      if (!applicant)
        return res.status(404).json({ ok: false, message: "Applicant not found" });

      if (!applicant.endDate)
        return res.status(400).json({ ok: false, message: "Applicant endDate missing" });

      const nowIST = toISTMidnight(new Date());
      const endIST = toISTMidnight(new Date(applicant.endDate));

      const startFeedbackIST = new Date(endIST);
      startFeedbackIST.setDate(endIST.getDate() - 10);

      if (
        !(nowIST >= startFeedbackIST && nowIST <= endIST) ||
        applicant.feedbackSubmitted
      ) {
        return res
          .status(403)
          .json({ ok: false, message: "Feedback not available at this time." });
      }

      // Parse fields
      const { internshipRating, generalRemarks } = req.body;
      let fieldReviews = [];

      if (!internshipRating)
        return res.status(400).json({ ok: false, message: "Rating is required" });

      const ratingNumber = Number(internshipRating);
      if (!Number.isFinite(ratingNumber) || ratingNumber < 1 || ratingNumber > 5)
        return res.status(400).json({
          ok: false,
          message: "Rating must be a number between 1 and 5.",
        });

      if (req.body.fieldReviews) {
        try {
          fieldReviews = JSON.parse(req.body.fieldReviews);
        } catch {
          return res
            .status(400)
            .json({ ok: false, message: "fieldReviews must be valid JSON." });
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
          message: "Max 3 field reviews allowed.",
        });

      const resumeFile =
        req.files && req.files.resume ? req.files.resume[0] : null;
      const videoFile =
        req.files && req.files.videoFeedback
          ? req.files.videoFeedback[0]
          : null;

      const feedbackDoc = new Feedback({
        applicant: applicant._id,
        internshipRating: ratingNumber,
        generalRemarks: generalRemarks || "",
        fieldReviews,
        submittedAt: new Date(),
      });

      if (resumeFile) feedbackDoc.resume = resumeFile;
      if (videoFile) feedbackDoc.videoFeedback = videoFile;

      await feedbackDoc.save();
      applicant.feedbackSubmitted = true;
      await applicant.save();

      return res
        .status(201)
        .json({ ok: true, message: "Feedback submitted successfully.", feedbackId: feedbackDoc._id });
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
