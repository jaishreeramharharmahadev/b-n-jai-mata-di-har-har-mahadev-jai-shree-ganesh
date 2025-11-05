// File: models/WhyChooseUs.js
const mongoose = require("mongoose");

const WhyChooseUsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    desc: { type: String, required: true },
    features: { type: [String], default: [] },
    stat: { type: String },
    gradient: { type: String },
    delay: { type: Number, default: 0 },
    // store the icon name (lucide icon) to be rendered on frontend
    iconName: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WhyChooseUs", WhyChooseUsSchema);