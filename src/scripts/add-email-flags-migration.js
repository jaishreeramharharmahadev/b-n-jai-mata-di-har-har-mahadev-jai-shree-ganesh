// scripts/add-email-flags-migration.js
const mongoose = require("mongoose");
const Applicant = require("../models/Applicant"); // adjust path
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/internshipDB";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to DB");

  const cursor = Applicant.find({}).cursor();
  let count = 0;
  for await (const doc of cursor) {
    let changed = false;
    if (typeof doc.offerSent === "undefined") { doc.offerSent = false; changed = true; }
    if (!doc.offerSentAt) { doc.offerSentAt = null; changed = true; }
    if (typeof doc.certificateSent === "undefined") { doc.certificateSent = false; changed = true; }
    if (!doc.certificateSentAt) { doc.certificateSentAt = null; changed = true; }
    if (!Array.isArray(doc.emailLog)) { doc.emailLog = []; changed = true; }
    if (changed) {
      await doc.save();
      count++;
    }
  }

  console.log(`Migration done. Updated ${count} documents.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });