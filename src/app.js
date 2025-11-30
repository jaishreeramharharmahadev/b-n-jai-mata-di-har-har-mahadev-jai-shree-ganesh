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
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./admin");

const app = express();

app.use(helmet());
const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ CORS BLOCKED:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(rateLimiter);

app.use("/api/applicants", applicantsRouter);
app.use("/api/auth", authRouter);

app.use("/api/internships", internshipRoutes);

app.use("/api/certificates", certificateRoutes);
app.use("/api/uploads", require("./routes/downloads"));

app.use("/api/feedback", feedbackRoutes);

app.use("/api", paymentRoutes);

app.use("/api/internship-fees", internshipFeeRoutes);
app.use("/api/whychooseus", whyChooseUsRoutes);
app.use("/api/testimonials", testinomialRoutes);

app.get("/", (req, res) =>
  res.send({ ok: true, message: "Internship backend up" })
);

app.use("/admin", adminRoutes);

if (process.env.SCHEDULER === "true") {
  const { startCertificateScheduler } = require("./jobs/certificateScheduler");
  startCertificateScheduler();
}

app.use(errorHandler);

module.exports = app;