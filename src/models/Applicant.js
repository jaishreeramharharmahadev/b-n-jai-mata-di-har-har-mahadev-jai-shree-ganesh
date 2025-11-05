const mongoose = require("mongoose");

const AssignmentSubmissionSchema = new mongoose.Schema({
  weekNumber: { type: Number, required: true },
  filename: { type: String },
  originalName: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  remarks: { type: String },
  consent: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
});

const WeekProgressSchema = new mongoose.Schema({
  weekNumber: { type: Number, required: true },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  tasks: { type: [String], default: [] },
  resources: { type: [String], default: [] },
  assignmentRequired: { type: Boolean, default: true },
  assignmentSubmissions: { type: [AssignmentSubmissionSchema], default: [] },
  locked: { type: Boolean, default: true },
  unlockDate: { type: Date },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
});

const EmailLogSchema = new mongoose.Schema({
  type: { type: String },            // e.g. "thank-you", "offer", "certificate"
  from: { type: String },            // sender used
  to: { type: String },
  subject: { type: String },
  messageId: { type: String },       // transport message-id (optional)
  status: { type: String },          // "sent" / "failed"
  error: { type: String },           // error message if failed
  createdAt: { type: Date, default: Date.now },
});

const ApplicantSchema = new mongoose.Schema({
  uniqueId: { type: String, required: true, unique: true },
  duration: { type: String, required: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  dob: { type: Date, required: true },
  college: { type: String, required: true },
  address: { type: String, required: true },
  domain: { type: String },
  linkedin: { type: String },
  github: { type: String },
  passwordHash: { type: String, required: true },
  agree: { type: Boolean, default: false },
  paymentChecked: { type: Boolean, default: false },
  emailConfirmed: { type: Boolean, default: false },
  emailToken: { type: String },
  createdAt: { type: Date, default: Date.now },

  startDate: { type: Date },
  endDate: { type: Date },
  internshipRef: { type: mongoose.Schema.Types.ObjectId, ref: "Internship" },
  learningPath: { type: [WeekProgressSchema], default: [] },

  // email flags & logs (ADDED)
  offerSent: { type: Boolean, default: false },       // <-- added
  offerSentAt: { type: Date },
  certificateGenerated: { type: Boolean, default: false }, // you already had
  certificateSent: { type: Boolean, default: false }, // <-- added
  certificateSentAt: { type: Date },

  // email audit trail
  emailLog: { type: [EmailLogSchema], default: [] },  // <-- optional but useful

  // projects
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProjectSubmission" }],

  // Feedback form
  feedbackSubmitted: { type: Boolean, default: false }
});

// optional: index to quickly find due certificates
ApplicantSchema.index({ endDate: 1, certificateSent: 1 });

module.exports = mongoose.model("Applicant", ApplicantSchema);