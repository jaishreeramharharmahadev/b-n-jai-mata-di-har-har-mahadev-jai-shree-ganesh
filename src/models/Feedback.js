const mongoose = require("mongoose");

const FieldReviewSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 }, // 1 - 5
  remark: { type: String, default: "" },
});

const FeedbackSchema = new mongoose.Schema({
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: "Applicant", required: true },

  // Overall internship rating
  internshipRating: { type: Number, required: true, min: 1, max: 5 },

  // Specific field reviews (max 3)
  fieldReviews: {
    type: [FieldReviewSchema],
    validate: {
      validator: function (arr) {
        return arr.length <= 3;
      },
      message: "You can provide up to 3 field reviews.",
    },
    default: [],
  },

  // Optional text feedback
  generalRemarks: { type: String, default: "" },

  // Updated resume (pdf)
  resume: {
    filename: String,      // stored filename on disk / path
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedAt: Date,
  },

  // Video feedback (optional)
  videoFeedback: {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedAt: Date,
    durationSeconds: Number, // optional if you compute later
  },

  submittedAt: { type: Date, default: Date.now },

  // small admin fields
  reviewedByAdmin: { type: Boolean, default: false },
  adminNotes: { type: String, default: "" },
});

module.exports = mongoose.model("Feedback", FeedbackSchema);