// jobs/certificateScheduler.js
require("dotenv").config();
const cron = require("node-cron");
const Applicant = require("../models/Applicant");
const { generateForApplicantService } = require("../controllers/certificateController");

// run daily at 00:10
function startCertificateScheduler() {
  cron.schedule("10 0 * * *", async () => {
    console.log("[certificateScheduler] running at", new Date().toISOString());
    try {
      // find applicants whose endDate <= today AND certificateGenerated is false
      const today = new Date();
      // zero times to compare dates ignoring time part
      today.setHours(23,59,59,999);
      const applicants = await Applicant.find({
        endDate: { $lte: today },
        certificateGenerated: { $ne: true },
      });

      console.log(`[certificateScheduler] found ${applicants.length} applicants to process`);

      for (const a of applicants) {
        try {
          console.log(`[certificateScheduler] generating certificate for ${a.uniqueId} (${a.email})`);
          await generateForApplicantService(a.uniqueId);
          console.log(`[certificateScheduler] done for ${a.uniqueId}`);
        } catch (err) {
          // do not crash the loop on a single failure
          console.error(`[certificateScheduler] failed for ${a.uniqueId}:`, err.message || err);
        }
      }
    } catch (err) {
      console.error("[certificateScheduler] error:", err);
    }
  }, {
    scheduled: true,
    timezone: process.env.SCHEDULER_TZ || "UTC",
  });

  console.log("[certificateScheduler] scheduled (daily at 00:10)");
}

module.exports = { startCertificateScheduler };