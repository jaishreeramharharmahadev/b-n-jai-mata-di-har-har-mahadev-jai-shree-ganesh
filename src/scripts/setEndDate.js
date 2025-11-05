const mongoose = require('mongoose');
const Applicant = require('../models/Applicant'); // adjust path
const MONGOURI = process.env.MONGO_URI || "mongodb+srv://gttechnovation_db_user:princeGTTechnovatin26@cluster0.745r1wo.mongodb.net/?appName=Cluster0";

async function run(){
  await mongoose.connect(MONGOURI);
  const id = '69047042e77c6e2bf826f929';
  const newDate = new Date('2025-11-09T00:00:00Z');
  const result = await Applicant.findByIdAndUpdate(id, { endDate: newDate, feedbackSubmitted: false }, { new: true });
  console.log('Updated:', result);
  await mongoose.disconnect();
}
run().catch(err => { console.error(err); process.exit(1); });