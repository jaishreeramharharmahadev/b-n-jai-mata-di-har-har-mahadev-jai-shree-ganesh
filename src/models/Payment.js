const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    applicantEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    applicantName: { type: String, required: true },
    duration: { type: String, required: true },
    domain: { type: String },

    internshipFee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternshipFee",
    },

    // amount in rupees (for your reference)
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    // Razorpay identifiers
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },

    status: {
      type: String,
      enum: [
        "created",
        "authorized",
        "captured",
        "failed",
        "refunded",
        "captured_applicant_failed",
      ],
      default: "created",
      index: true,
    },

    method: { type: String },      // card / upi / netbanking / wallet
    capturedAt: { type: Date },

    // For reconciliation if needed
    error: { type: String },

    // Snapshot of applicant data at the time of payment init
    applicantData: {
      duration: String,
      fullName: String,
      email: String,
      phone: String,
      dob: Date,
      college: String,
      address: String,
      domain: String,
      linkedin: String,
      github: String,
      passwordHash: String, // already hashed
      agree: Boolean,
    },

    // Once applicant is created after payment success
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "Applicant" },

    // raw data from Razorpay (optional but very useful)
    rawOrder: mongoose.Schema.Types.Mixed,
    rawPayment: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);