// models/Testimonial.js
const mongoose = require('mongoose');

const TestimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, default: '' },
    feedback: { type: String, required: true },
    avatar: { type: String, default: '' },
    company: { type: String, default: '' },
    role: { type: String, default: '' },
    location: { type: String, default: '' },
    duration: { type: String, default: '' },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    order: { type: Number, default: 0 } // for ordering on frontend
  },
  { timestamps: true }
);

module.exports = mongoose.model('Testimonial', TestimonialSchema);