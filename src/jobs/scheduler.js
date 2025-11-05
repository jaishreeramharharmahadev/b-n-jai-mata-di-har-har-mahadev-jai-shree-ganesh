// jobs/scheduler.js
require("dotenv").config();
const cron = require("node-cron");
const Applicant = require("../models/Applicant");
const { ensureLearningPathState } = require("../helpers/learningPathHelpers");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const sendEmail = require("../utils/sendEmail");

async function runDailyTasks() {
  console.log("Scheduler: running daily tasks -", new Date().toISOString());
  const now = new Date();
  const applicants = await Applicant.find({});

  for (const a of applicants) {
    let changed = false;

    // 1) Ensure learning path state (time-based unlocking)
    const unlocked = ensureLearningPathState(a, { weekDurationDays: 7 });
    if (unlocked) {
      changed = true;
    }

    // 2) Certificate generation at endDate
    if (a.endDate && !a.certificateGenerated) {
      const endDate = new Date(a.endDate);
      // If endDate is today or in the past, generate certificate
      if (now >= new Date(endDate.setHours(0,0,0,0))) {
        try {
          console.log(`Generating certificate for ${a.email} (applicant ${a.uniqueId})`);

          // Call Python API - expects binary PDF response
          const pythonApiUrl = process.env.CERT_PY_API_URL || "http://127.0.0.1:7000/generate-certificate";
          const resp = await axios.post(
            pythonApiUrl,
            {
              fullName: a.fullName,
              uniqueId: a.uniqueId,
              domain: a.domain,
              startDate: a.startDate,
              endDate: a.endDate,
            },
            { responseType: "arraybuffer", timeout: 120000 }
          );

          // Save temp file
          const tmpPath = path.join(__dirname, `../tmp/${a.uniqueId}_certificate.pdf`);
          fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
          fs.writeFileSync(tmpPath, Buffer.from(resp.data));

          // Convert to base64 for email attachment
          const pdfBase64 = fs.readFileSync(tmpPath).toString("base64");

          // Send email with attachment
          await sendEmail({
            to: a.email,
            subject: `Your Internship Certificate - ${a.domain}`,
            html: `<p>Hi ${a.fullName},</p><p>Congratulations on completing the internship. Your certificate is attached.</p>`,
            attachments: [
              {
                filename: `${a.uniqueId}_certificate.pdf`,
                content: pdfBase64,
                contentType: "application/pdf",
              },
            ],
          });

          // mark as generated and sent
          a.certificateGenerated = true;
          a.certificateSentAt = new Date();
          changed = true;

          // remove temp
          fs.unlinkSync(tmpPath);
          console.log(`Certificate sent to ${a.email}`);
        } catch (err) {
          // log error but continue - don't mark generated
          console.error(`Certificate generation/sending failed for ${a.email}:`, err.message);
        }
      }
    }

    if (changed) {
      try {
        await a.save();
      } catch (err) {
        console.error("Failed saving applicant after scheduler changes for", a.email, err.message);
      }
    }
  }

  console.log("Scheduler: daily tasks completed.");
}

// start cron scheduler (call this from your server entry, e.g., server.js or app.js, only on one instance)
function startScheduler() {
  // run every day at 00:05 (adjust timezone according to server)
  cron.schedule("5 0 * * *", async () => {
    try {
      await runDailyTasks();
    } catch (err) {
      console.error("Scheduler run failed:", err);
    }
  });

  console.log("Scheduler started (daily tasks scheduled).");
}

module.exports = { startScheduler, runDailyTasks };