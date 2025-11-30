const express = require("express");
const router = express.Router();

const authRoutes = require("./routes/authAdminRoutes");
const dashboardRoutes = require("./routes/dashboardAdminRoutes");
const applicantRoutes = require("./routes/applicantAdminRoutes");
const internshipRoutes = require("./routes/internshipAdminRoutes");
const certificateRoutes = require("./routes/certificateAdminRoutes");
const feedbackRoutes = require("./routes/feedbackAdminRoutes");
const paymentRoutes = require("./routes/paymentAdminRoutes");
const testimonialRoutes = require("./routes/testimonialAdminRoutes");
const whyChooseUsRoutes = require("./routes/whyChooseUsAdminRoutes");
const projectSubmissionRoutes = require("./routes/projectAdminRoutes");
const analyticsRoutes = require("./routes/analyticsAdminRoutes");


router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/applicants", applicantRoutes);
router.use("/internships", internshipRoutes);
router.use("/certificates", certificateRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/payments", paymentRoutes);
router.use("/testimonials", testimonialRoutes);
router.use("/whychooseus", whyChooseUsRoutes);
router.use("/projects", projectSubmissionRoutes);
router.use("/analytics", analyticsRoutes);


module.exports = router;
