// routes/feedbackRoutes.js
const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");

// now :applicantIdentifier can be either Mongo _id or your uniqueId
router.get("/available/:applicantIdentifier", feedbackController.checkAvailability);
router.post("/:applicantIdentifier", feedbackController.submitFeedback);

module.exports = router;