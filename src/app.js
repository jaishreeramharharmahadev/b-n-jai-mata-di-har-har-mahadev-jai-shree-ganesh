const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");

const applicantsRouter = require("./routes/applicants");
const authRouter = require("./routes/auth");
const errorHandler = require("./middlewares/errorHandler");
const rateLimiter = require("./middlewares/rateLimiter");

const internshipRoutes = require("./routes/internshipRoutes");
const certificateRoutes = require("./routes/certificates");
const feedbackRoutes = require("./routes/feedbackRoutes");
const { startScheduler } = require("./jobs/scheduler");
const internshipFeeRoutes = require("./routes/internshipFeeRoutes");
const whyChooseUsRoutes = require("./routes/whyChooseUsRoutes");
const testinomialRoutes = require("./routes/testimonialRoutes");
const zohoAuthRouter = require('./routes/zohoAuth');
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(rateLimiter);

// Routes
app.use("/api/applicants", applicantsRouter);
app.use("/api/auth", authRouter);

// Internshi Route
app.use("/api/internships", internshipRoutes);

// Certificate Route
app.use("/api/certificates", certificateRoutes);
app.use("/api/uploads", require("./routes/downloads"));

// Feedback Route
app.use("/api/feedback", feedbackRoutes);

// Payment
app.use("/api", paymentRoutes);

// Fee
app.use("/api/internship-fees", internshipFeeRoutes);
app.use("/api/whychooseus", whyChooseUsRoutes);
app.use("/api/testimonials", testinomialRoutes);

app.use("/", zohoAuthRouter);

app.get("/", (req, res) =>
  res.send({ ok: true, message: "Internship backend up" })
);

if (process.env.SCHEDULER === "true") {
  const { startCertificateScheduler } = require("./jobs/certificateScheduler");
  startCertificateScheduler();
}

// Central error handler
app.use(errorHandler);

module.exports = app;
