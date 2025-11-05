// routes/internshipFeeRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/internshipFeeController");

// GET /api/internship-fees
router.get("/", controller.getAllFees);

module.exports = router;