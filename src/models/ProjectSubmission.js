// models/ProjectSubmission.js
const mongoose = require("mongoose");

const ProjectSubmissionSchema = new mongoose.Schema({
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: "Applicant", required: true },
  applicantUniqueId: { type: String, required: true },
  projectName: { type: String, required: true },
  projectDescription: { type: String },
  liveLink: { type: String },
  githubLink: { type: String },
  linkedinLink: { type: String },
  submissionDate: { type: Date, default: Date.now }, // auto-generated
  reportPdf: { type: String }, // stored file path or filename
  reportPpt: { type: String }, // stored file path or filename
  consent: {
    accuracy: { type: Boolean, default: false }, // "information accurate"
    terms: { type: Boolean, default: false },    // "agree to terms"
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProjectSubmission", ProjectSubmissionSchema);