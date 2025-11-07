const Applicant = require("../models/Applicant");
const Internship = require("../models/Internship");
const bcrypt = require("bcryptjs");
const {sendEmail} = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const { addDays, parseDurationToDays } = require("../helpers/dateHelpers");
const { ensureLearningPathState } = require("../helpers/learningPathHelpers");

const ProjectSubmission = require("../models/ProjectSubmission");
const { ensureTimeBasedUnlocks } = require("../helpers/timeUnlockHelpers");
const { upload, ASSIGNMENT_DIR, PROJECT_DIR } = require("../utils/multer");


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
exports.registerApplicant = async (req, res) => {
  try {
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
      password,
      agree,
    } = req.body;

    // validation
    if (!duration || !fullName || !email || !phone || !dob || !college || !address || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await Applicant.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const createdAt = new Date();
    const startDate = addDays(createdAt, 2);
    const days = parseDurationToDays(duration);
    const endDate = days > 0 ? addDays(startDate, days) : null;

    // optional internship lookup
    let internship = null;
    try {
      internship = await Internship.findOne({ domain: domain });
    } catch (e) {
      console.warn("No internship template found for domain:", domain);
    }

    const learningPath = internship
      ? buildApplicantLearningPath(internship.learningPath)
      : [
          { weekNumber: 1, title: "Week 1", content: "", locked: true, completed: false },
          { weekNumber: 2, title: "Week 2", content: "", locked: true, completed: false },
          { weekNumber: 3, title: "Week 3", content: "", locked: true, completed: false },
          { weekNumber: 4, title: "Week 4", content: "", locked: true, completed: false },
        ];

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
    });

    // 1️⃣ Thank-you email from SUPPORT
    const subject1 = `Internship Application - ${domain}`;
    const html1 = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;">
        <h2>Hello ${fullName},</h2>
        <p><strong>Thanks for applying to our ${domain} internship.</strong></p>
        <p>Your unique ID: <strong>${uniqueId}</strong></p>
        <p>Start date: <strong>${startDate.toDateString()}</strong></p>
        <p>— Team TechnoPhile (Support)</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: subject1,
      html: html1,
      from: process.env.BREVO_FROM_SUPPORT,
    });

    console.log("✅ Support (thank-you) email sent");

    // 2️⃣ Generate Offer letter (Flask) and send from HR
    (async () => {
      try {
        console.log("⏳ Generating offer letter ");

        const response = await axios.post(
          `${process.env.FLASK_API_URL}/generate-offer-letter`,
          { fullName, domain, uniqueId },
          { responseType: "arraybuffer" }
        );

        // write temp file, convert to base64 (or pass buffer)
        const pdfBuffer = Buffer.from(response.data);
        const pdfBase64 = pdfBuffer.toString("base64");

        const subject2 = `Your Internship Offer Letter - ${domain}`;
        const html2 = `
          <div style="font-family:Arial,sans-serif;">
            <h2>Congratulations ${fullName} 🎉</h2>
            <p>Your offer letter for the internship in <b>${domain}</b> is attached.</p>
            <p>— Team TechnoPhile (HR)</p>
          </div>
        `;

        await sendEmail({
          to: email,
          subject: subject2,
          html: html2,
          attachments: [
            {
              filename: `${uniqueId}_offer_letter.pdf`,
              content: pdfBase64,
              contentType: "application/pdf",
            },
          ],
          from: process.env.BREVO_FROM_HR,
          preferAuth: "hr",
        });

        applicant.offerSent = true;
        await applicant.save();
        console.log("📩 Offer letter sent from HR");
      } catch (err) {
        console.error("❌ Error generating/sending offer letter:", err && err.message ? err.message : err);
      }
    })();

    // Response to client
    res.status(201).json({
      message: "Application submitted successfully. Thank-you email sent; offer letter will follow from HR.",
      applicant,
      uniqueId,
    });
  } catch (error) {
    console.error("Error registering applicant:", error);
    res.status(500).json({ message: "Server Error", error: error.message || error });
  }
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
      const { projectName, projectDescription, liveLink, githubLink, linkedinLink } =
        req.body;
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
        select: "projectName projectDescription liveLink githubLink linkedinLink submissionDate",
        options: { sort: { submissionDate: -1 } }
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