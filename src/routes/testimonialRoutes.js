// routes/testimonialRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/testimonialController');

// GET /api/testimonials
router.get('/', controller.getAllTestimonials);

module.exports = router;