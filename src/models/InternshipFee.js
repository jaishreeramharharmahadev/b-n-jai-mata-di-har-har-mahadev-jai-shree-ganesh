// models/InternshipFee.js
const mongoose = require("mongoose");

const InternshipFeeSchema = new mongoose.Schema(
  {
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    // store price as a number (rupees)
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    popular: {
      type: Boolean,
      default: false,
    },
    rawPriceString: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InternshipFee", InternshipFeeSchema);
