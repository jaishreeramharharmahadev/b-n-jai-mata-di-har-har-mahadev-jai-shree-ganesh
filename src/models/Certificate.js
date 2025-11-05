// models/Certificate.js
const mongoose = require("mongoose");

const CertificateSchema = new mongoose.Schema({
  certificateNumber: { type: String, required: true, unique: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: "Applicant", required: true },
  applicantUniqueId: { type: String, required: true },
  fullName: { type: String, required: true },
  domain: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  durationText: { type: String },
  issueDate: { type: Date, default: Date.now },
  filePath: { type: String },
  generatedAt: { type: Date },
  sentAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Certificate", CertificateSchema);