const Applicant = require("../models/Applicant");
const Internship = require("../models/Internship");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const { addDays, parseDurationToDays } = require("../helpers/dateHelpers");
const { ensureLearningPathState } = require("../helpers/learningPathHelpers");

const ProjectSubmission = require("../models/ProjectSubmission");
const { ensureTimeBasedUnlocks } = require("../helpers/timeUnlockHelpers");
const { upload, ASSIGNMENT_DIR, PROJECT_DIR } = require("../utils/multer");

const { generateOfferLetterPDF } = require("../services/pdfService"); // adjust path if needed

const buildApplicantLearningPath = (masterPath) => {
  if (!Array.isArray(masterPath) || masterPath.length === 0) {
    // fallback to 4 empty weeks if master not provided
    return [
      {
        weekNumber: 1,
        title: "Week 1",
        content: "",
        tasks: [],
        resources: [],
        assignmentRequired: false,
        assignmentSubmissions: [],
        locked: true,
        unlockDate: null,
        completed: false,
      },
      {
        weekNumber: 2,
        title: "Week 2",
        content: "",
        tasks: [],
        resources: [],
        assignmentRequired: false,
        assignmentSubmissions: [],
        locked: true,
        unlockDate: null,
        completed: false,
      },
      {
        weekNumber: 3,
        title: "Week 3",
        content: "",
        tasks: [],
        resources: [],
        assignmentRequired: false,
        assignmentSubmissions: [],
        locked: true,
        unlockDate: null,
        completed: false,
      },
      {
        weekNumber: 4,
        title: "Week 4",
        content: "",
        tasks: [],
        resources: [],
        assignmentRequired: false,
        assignmentSubmissions: [],
        locked: true,
        unlockDate: null,
        completed: false,
      },
    ];
  }

  return masterPath.map((w, idx) => ({
    weekNumber: w.weekNumber ?? idx + 1,
    title: w.title ?? `Week ${idx + 1}`,
    content: w.content ?? "",
    tasks: Array.isArray(w.tasks) ? w.tasks : [],
    resources: Array.isArray(w.resources) ? w.resources : [],
    assignmentRequired: !!w.assignmentRequired,
    assignmentSubmissions: [], // empty initially
    locked: true, // unlocked by time helper (startDate + (i)*7 days)
    unlockDate: null, // will be set by ensureTimeBasedUnlocks
    completed: false,
    completedAt: null,
  }));
};

// Register applicant when clicking "Pay" button
const UID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomUID(length = 6) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += UID_CHARS.charAt(Math.floor(Math.random() * UID_CHARS.length));
  }
  return result;
}

// Generate Unique ID with DB uniqueness check
async function generateUniqueId() {
  let uid, exists;
  do {
    uid = "GT" + randomUID(6);
    exists = await Applicant.findOne({ uniqueId: uid });
  } while (exists);

  return uid;
}

// ▶ FINAL Improved Core Applicant Creation
exports.registerApplicantCore = async (applicantData) => {
  const {
    duration,
    fullName,
    email,
    phone,
    dob,
    college,
    address,
    domain,
    linkedin,
    github,
    passwordHash,
    agree,
  } = applicantData;

  let existing = await Applicant.findOne({ email: email.toLowerCase() });
  if (existing) return existing;

  const uniqueId = await generateUniqueId();
  const createdAt = new Date();
  const startDate = addDays(createdAt, 2);
  const days = parseDurationToDays(duration);
  const endDate = days > 0 ? addDays(startDate, days) : null;

  // Fetch Internship Learning Path (if exists)
  let internship = await Internship.findOne({ domain });
  const learningPath = internship
    ? buildApplicantLearningPath(internship.learningPath)
    : buildApplicantLearningPath([]);

  const applicant = await Applicant.create({
    duration,
    fullName,
    email: email.toLowerCase(),
    phone,
    dob,
    college,
    address,
    domain,
    linkedin,
    github,
    passwordHash,
    agree: !!agree,
    uniqueId,
    startDate,
    endDate,
    internshipRef: internship ? internship._id : undefined,
    learningPath,
    paymentChecked: true,
  });

  return applicant;
};

// ▶ Emails after successful registration
exports.sendAfterRegistrationEmails = async (applicant) => {
  const { fullName, email, duration, domain, uniqueId, startDate } = applicant;

  // THANK YOU EMAIL
  await sendEmail({
    to: email,
    subject: `Internship Application - ${domain}`,
    html: `
      <div style="font-family:Arial, sans-serif; line-height:1.6; color:#333;">
        <p style="font-size:16px;">Dear ${fullName},</p>

        <p>Thank you for submitting your application for the <strong>${domain}</strong> internship at <strong>GT Technovation</strong>. We appreciate your interest in joining our organization.</p>

        <p>Your application has been successfully received and is currently under review.</p>

        <p>
          <strong>Applicant ID:</strong> ${uniqueId}<br/>
          <strong>Internship Start Date:</strong> ${startDate.toDateString()}
        </p>

        <p>Please keep the above Applicant ID for future reference regarding your internship process and documentation.</p>

        <p>If we require any additional details or clarifications, our team will reach out to you via email.</p>

        <br/>
        <p>Best regards,<br/>
        <strong>GT Technovation</strong></p>
      </div>
    `,
    from: process.env.BREVO_FROM_SUPPORT,
  });

  console.log("📩 Support email sent");

  // OFFER LETTER in Background
  (async () => {
    try {
      const pdfPath = await generateOfferLetterPDF({
        full_name: fullName,
        domain,
        unique_id: uniqueId,
        internship_duration: duration,
        start_date: startDate.toLocaleDateString("en-GB"),
        stipend: "Unpaid",
      });

      const pdfBuffer = fs.readFileSync(pdfPath);

      await sendEmail({
        to: email,
        subject: `Your Internship Offer Letter - ${domain}`,
        html: `
          <div style="font-family:Arial, sans-serif; line-height:1.6; color:#333;">
            <p style="font-size:16px;">Dear ${fullName},</p>

            <p>We are pleased to inform you that you have been selected for the <strong>${domain}</strong> internship position at <strong>GT Technovation</strong>.</p>

            <p>Your internship is scheduled to begin on <strong>${startDate.toDateString()}</strong>. Please ensure that you are available and prepared from this date onward.</p>

            <p>Please find your official offer letter attached to this email. It contains important details regarding your internship role, duration, responsibilities, and guidelines.</p>

            <p>Kindly review the offer letter thoroughly and keep it for future reference.</p>

            <p>Congratulations once again, and welcome to GT Technovation!</p>
            
            <br/>
            <p>Warm regards,<br/>
            <strong>HR</strong><br/>
            <strong>GT Technovation</strong></p>
          </div>
        `,
        attachments: [
          {
            filename: `${uniqueId}_offer_letter.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
        from: process.env.BREVO_FROM_HR,
        preferAuth: "hr",
      });

      applicant.offerSent = true;
      await applicant.save();
      console.log("📄 Offer letter sent");
    } catch (error) {
      console.error("Offer email failed:", error.message);
    }
  })();
};

// ====== GET week content (enforce locking & compute states) ======
exports.getWeekContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const weekNumber = Number(req.params.weekNumber);

    const applicant = await Applicant.findById(userId);
    if (!applicant)
      return res.status(404).json({ message: "Applicant not found" });

    // enforce time-based unlock rules on-access
    const changed = ensureLearningPathState(applicant, { weekDurationDays: 7 });
    if (changed) await applicant.save();

    const week = applicant.learningPath.find(
      (w) => w.weekNumber === weekNumber
    );
    if (!week) return res.status(404).json({ message: "Week not found" });

    if (week.locked) {
      // compute reason: previous incomplete or unlock date not reached
      // compute unlockAt
      const idx = applicant.learningPath.findIndex(
        (w) => w.weekNumber === weekNumber
      );
      let unlockAt = null;
      if (applicant.startDate) {
        unlockAt = new Date(applicant.startDate);
        unlockAt.setDate(unlockAt.getDate() + idx * 7); // idx=0 -> startDate
      }
      return res.status(403).json({
        message:
          "This week is locked. It unlocks when previous week is completed and the calendar unlock date is reached.",
        unlockAt,
      });
    }

    return res.json({ week });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- get week content (time-based unlocking) --------------------
exports.getWeekContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const weekNumber = Number(req.params.weekNumber);
    const applicant = await Applicant.findById(userId).populate("projects");
    if (!applicant)
      return res.status(404).json({ message: "Applicant not found" });

    // compute unlocks based on startDate/time
    const changed = ensureTimeBasedUnlocks(applicant, { weekDurationDays: 7 });
    if (changed) await applicant.save();

    const week = applicant.learningPath.find(
      (w) => w.weekNumber === weekNumber
    );
    if (!week) return res.status(404).json({ message: "Week not found" });

    return res.json({ week, projects: applicant.projects });
  } catch (err) {
    console.error("getWeekContent error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- mark week complete (simple toggle) --------------------
exports.completeWeek = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weekNumber } = req.body;
    const applicant = await Applicant.findById(userId);
    if (!applicant)
      return res.status(404).json({ message: "Applicant not found" });

    const idx = applicant.learningPath.findIndex(
      (w) => w.weekNumber === Number(weekNumber)
    );
    if (idx === -1) return res.status(404).json({ message: "Week not found" });

    const week = applicant.learningPath[idx];
    if (week.locked) return res.status(400).json({ message: "Week is locked" });

    if (!week.completed) {
      week.completed = true;
      week.completedAt = new Date();
      await applicant.save();
    }

    return res.json({ message: "Week marked complete", week });
  } catch (err) {
    console.error("completeWeek error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- submit assignment (multipart/form-data) --------------------
exports.uploadAssignment = [
  // middleware to set upload dir then multer single file handler
  (req, res, next) => {
    req.uploadDir = ASSIGNMENT_DIR;
    next();
  },
  upload.single("file"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const weekNumber = Number(req.params.weekNumber);
      const remarks = req.body.remarks || "";
      const consent = req.body.consent === "true" || req.body.consent === true;

      const applicant = await Applicant.findById(userId);
      if (!applicant) {
        // delete uploaded file if applicant not found
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "Applicant not found" });
      }

      const idx = applicant.learningPath.findIndex(
        (w) => w.weekNumber === weekNumber
      );
      if (idx === -1) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "Week not found" });
      }

      const week = applicant.learningPath[idx];
      if (week.locked) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res
          .status(400)
          .json({ message: "Week is locked; cannot submit assignment yet" });
      }

      // store meta about submission
      const sub = {
        weekNumber,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        remarks,
        consent,
        submittedAt: new Date(),
      };

      week.assignmentSubmissions.push(sub);
      await applicant.save();

      return res.json({ message: "Assignment uploaded", submission: sub });
    } catch (err) {
      console.error("uploadAssignment error:", err);
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  },
];

// -------------------- submit project (multipart/form-data) --------------------
exports.submitProject = [
  (req, res, next) => {
    req.uploadDir = PROJECT_DIR;
    next();
  },
  upload.fields([
    { name: "reportPdf", maxCount: 1 },
    { name: "reportPpt", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        projectName,
        projectDescription,
        liveLink,
        githubLink,
        linkedinLink,
      } = req.body;
      const consentAccuracy =
        req.body.consentAccuracy === "true" ||
        req.body.consentAccuracy === true;
      const consentTerms =
        req.body.consentTerms === "true" || req.body.consentTerms === true;

      if (!projectName) {
        // cleanup files
        if (req.files) {
          Object.values(req.files)
            .flat()
            .forEach((f) => fs.unlinkSync(f.path));
        }
        return res.status(400).json({ message: "projectName is required" });
      }

      const applicant = await Applicant.findById(userId);
      if (!applicant) {
        if (req.files)
          Object.values(req.files)
            .flat()
            .forEach((f) => fs.unlinkSync(f.path));
        return res.status(404).json({ message: "Applicant not found" });
      }

      const pdfFile =
        req.files && req.files.reportPdf && req.files.reportPdf[0];
      const pptFile =
        req.files && req.files.reportPpt && req.files.reportPpt[0];

      const ProjectSubmission = require("../models/ProjectSubmission");
      const projectDoc = await ProjectSubmission.create({
        applicant: applicant._id,
        applicantUniqueId: applicant.uniqueId,
        projectName,
        projectDescription,
        liveLink,
        githubLink,
        linkedinLink,
        reportPdf: pdfFile ? pdfFile.filename : null,
        reportPpt: pptFile ? pptFile.filename : null,
        consent: {
          accuracy: consentAccuracy,
          terms: consentTerms,
        },
        submissionDate: new Date(),
      });

      // link to applicant
      applicant.projects = applicant.projects || [];
      applicant.projects.push(projectDoc._id);
      await applicant.save();

      return res.json({ message: "Project submitted", project: projectDoc });
    } catch (err) {
      console.error("submitProject error:", err);
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  },
];

exports.getMe = async (req, res, next) => {
  try {
    // populate internshipRef and projects
    const applicant = await Applicant.findById(req.user.id)
      .select("-passwordHash -emailToken")
      .populate("internshipRef", "domain skills description")
      .populate({
        path: "projects",
        select:
          "projectName projectDescription liveLink githubLink linkedinLink submissionDate",
        options: { sort: { submissionDate: -1 } },
      });

    if (!applicant) return res.status(404).json({ message: "Not found" });

    // ensure time-based unlocks (optional) - if we use helper ensureTimeBasedUnlocks
    const { ensureTimeBasedUnlocks } = require("../helpers/timeUnlockHelpers");
    const changed = ensureTimeBasedUnlocks(applicant, { weekDurationDays: 7 });
    if (changed) await applicant.save();

    res.json(applicant);
  } catch (err) {
    next(err);
  }
};
