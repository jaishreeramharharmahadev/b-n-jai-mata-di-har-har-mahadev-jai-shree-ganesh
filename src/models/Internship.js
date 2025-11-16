// models/Internship.js
const mongoose = require("mongoose");

const WeekSchema = new mongoose.Schema({
  weekNumber: { type: Number, required: true },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  tasks: { type: [String], default: [] },
  resources: { type: [String], default: [] },
  assignmentRequired: { type: Boolean, default: false }
});

const ProjectRoadmapStepSchema = new mongoose.Schema({
  stepNumber: { type: Number },
  title: { type: String },
  description: { type: String },
});

const AdditionalInfoSchema = new mongoose.Schema({
  whatYouGet: { type: [String], default: [] },
  prerequisites: { type: [String], default: [] },
  toolsYouWillUse: { type: [String], default: [] }
});

const InternshipSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  domain: { type: String, required: true },
  subDomain: { type: String, required: true },
  stipend: { type: String },
  spots: { type: String },
  location: { type: String },
  image: { type: String },
  image2: { type: String },
  rating: { type: String }, // New field for ratings
  description: { type: String },
  skills: { type: [String], default: [] },
  
  // Enhanced learning path with tasks and resources
  learningPath: { type: [WeekSchema], default: [] },
  
  // New project roadmap for enhanced internships
  projectRoadmap: { type: [ProjectRoadmapStepSchema], default: [] },
  
  // Additional information section
  additionalInfo: { type: AdditionalInfoSchema, default: null },
  
  createdAt: { type: Date, default: Date.now },
});

// Compound index to ensure domain uniqueness per id
InternshipSchema.index({ id: 1, domain: 1 }, { unique: true });

module.exports = mongoose.model("Internship", InternshipSchema);