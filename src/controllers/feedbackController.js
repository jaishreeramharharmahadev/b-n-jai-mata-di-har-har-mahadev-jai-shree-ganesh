// controllers/feedbackController.js
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const Applicant = require("../models/Applicant");
const Feedback = require("../models/Feedback");

// --- multer setup (same as before) ---
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
  limits: { fileSize: 25 * 1024 * 1024 }, // global cap 25MB
});

const uploadFields = upload.fields([
  { name: "resume", maxCount: 1 },
  { name: "videoFeedback", maxCount: 1 },
]);

// --- helper: find applicant by either ObjectId or uniqueId ---
async function findApplicantByIdentifier(identifier) {
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    // try by _id first
    const byId = await Applicant.findById(identifier);
    if (byId) return byId;
    // fallthrough to try uniqueId if not found by _id
  }
  // otherwise treat as uniqueId
  return await Applicant.findOne({ uniqueId: identifier });
}

// GET /api/feedback/available/:applicantIdentifier
async function checkAvailability(req, res) {
  try {
    const { applicantIdentifier } = req.params;
    const applicant = await findApplicantByIdentifier(applicantIdentifier);
    if (!applicant) return res.status(404).json({ ok: false, message: "Applicant not found" });

    if (!applicant.endDate) return res.status(400).json({ ok: false, message: "Applicant endDate not set" });

    const now = new Date();
    const tenDaysBefore = new Date(applicant.endDate);
    tenDaysBefore.setDate(tenDaysBefore.getDate() - 10);

    const available = now >= tenDaysBefore && now <= applicant.endDate && !applicant.feedbackSubmitted;

    return res.json({
      ok: true,
      available,
      now,
      tenDaysBefore,
      endDate: applicant.endDate,
      feedbackSubmitted: applicant.feedbackSubmitted,
      applicantIdUsed: applicant._id, // handy for debugging
      uniqueId: applicant.uniqueId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
}

// POST /api/feedback/:applicantIdentifier
async function submitFeedback(req, res) {
  uploadFields(req, res, async function (uploadErr) {
    try {
      if (uploadErr) return res.status(400).json({ ok: false, message: uploadErr.message });

      const { applicantIdentifier } = req.params;
      const applicant = await findApplicantByIdentifier(applicantIdentifier);
      if (!applicant) return res.status(404).json({ ok: false, message: "Applicant not found" });

      // prevent bypass: re-check availability
      if (!applicant.endDate) return res.status(400).json({ ok: false, message: "Applicant endDate missing" });
      const now = new Date();
      const tenDaysBefore = new Date(applicant.endDate); tenDaysBefore.setDate(tenDaysBefore.getDate() - 10);
      if (!(now >= tenDaysBefore && now <= applicant.endDate)) {
        return res.status(403).json({ ok: false, message: "Feedback not available at this time." });
      }
      if (applicant.feedbackSubmitted) return res.status(400).json({ ok: false, message: "Feedback already submitted." });

      // parse fields
      const { internshipRating, generalRemarks } = req.body;
      let fieldReviews = [];
      if (req.body.fieldReviews) {
        if (typeof req.body.fieldReviews === "string") {
          try { fieldReviews = JSON.parse(req.body.fieldReviews); }
          catch (e) { return res.status(400).json({ ok: false, message: "fieldReviews must be valid JSON." }); }
        } else fieldReviews = req.body.fieldReviews;
      }

      if (!internshipRating) return res.status(400).json({ ok: false, message: "internshipRating is required" });
      const ratingNumber = Number(internshipRating);
      if (!Number.isFinite(ratingNumber) || ratingNumber < 1 || ratingNumber > 5)
        return res.status(400).json({ ok: false, message: "internshipRating must be a number between 1 and 5." });

      if (!Array.isArray(fieldReviews)) return res.status(400).json({ ok: false, message: "fieldReviews must be an array." });
      if (fieldReviews.length > 3) return res.status(400).json({ ok: false, message: "You can provide up to 3 field reviews." });

      for (const fr of fieldReviews) {
        if (!fr.fieldName || fr.rating === undefined) return res.status(400).json({ ok: false, message: "Each field review requires fieldName and rating." });
        const r = Number(fr.rating);
        if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ ok: false, message: "Field review ratings must be 1-5." });
      }

      const resumeFile = req.files && req.files.resume ? req.files.resume[0] : null;
      const videoFile = req.files && req.files.videoFeedback ? req.files.videoFeedback[0] : null;

      if (resumeFile) {
        const maxResumeSize = 2 * 1024 * 1024; // 2 MB
        if (resumeFile.size > maxResumeSize) {
          fs.unlinkSync(resumeFile.path);
          return res.status(400).json({ ok: false, message: "Resume PDF must be <= 2 MB." });
        }
      }

      if (videoFile) {
        const maxVideoSize = 10 * 1024 * 1024; // 10 MB
        if (videoFile.size > maxVideoSize) {
          fs.unlinkSync(videoFile.path);
          return res.status(400).json({ ok: false, message: "Video must be <= 10 MB." });
        }
      }

      const feedbackDoc = new Feedback({
        applicant: applicant._id,
        internshipRating: ratingNumber,
        generalRemarks: generalRemarks || "",
        fieldReviews,
      });

      if (resumeFile) {
        feedbackDoc.resume = {
          filename: resumeFile.filename,
          originalName: resumeFile.originalname,
          mimeType: resumeFile.mimetype,
          size: resumeFile.size,
          uploadedAt: new Date(),
        };
      }

      if (videoFile) {
        feedbackDoc.videoFeedback = {
          filename: videoFile.filename,
          originalName: videoFile.originalname,
          mimeType: videoFile.mimetype,
          size: videoFile.size,
          uploadedAt: new Date(),
        };
      }

      await feedbackDoc.save();
      applicant.feedbackSubmitted = true;
      await applicant.save();

      return res.status(201).json({ ok: true, message: "Feedback submitted successfully.", feedbackId: feedbackDoc._id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok: false, message: "Server error", error: err.message });
    }
  });
}

module.exports = {
  checkAvailability,
  submitFeedback,
};