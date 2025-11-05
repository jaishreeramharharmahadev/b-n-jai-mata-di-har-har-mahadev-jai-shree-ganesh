const mongoose = require("mongoose");
const InternshipFee = require("../models/InternshipFee");
const data = require("../data/InternshipFeeData");

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://gttechnovation_db_user:princeGTTechnovatin26@cluster0.745r1wo.mongodb.net/?appName=Cluster0";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB:", MONGO_URI);

    // Option A: Insert only if collection is empty
    const count = await InternshipFee.countDocuments();
    if (count === 0) {
      const created = await InternshipFee.insertMany(data);
      console.log(`Inserted ${created.length} internship fee documents.`);
    } else {
      // Option B: If you want to replace existing data, uncomment the lines below
      // await InternshipFee.deleteMany({});
      // const created = await InternshipFee.insertMany(data);
      // console.log(`Replaced collection with ${created.length} documents.`);

      console.log(
        `Collection already has ${count} documents. No changes made.`
      );
    }

    await mongoose.disconnect();
    console.log("Disconnected. Seed complete.");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();