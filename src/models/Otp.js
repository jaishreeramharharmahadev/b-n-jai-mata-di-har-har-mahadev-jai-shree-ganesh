const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String },
    expiresAt: { type: Number },
    resendCount: {
      type: Number,
      default: 0,
    },
    lastSentAt: { type: Number, default: 0 },
    cooldownUntil: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Otp", OtpSchema);