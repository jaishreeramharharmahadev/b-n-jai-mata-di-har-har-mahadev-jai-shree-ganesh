const mongoose = require("mongoose");
const WhyChooseUs = require("../models/WhyChooseUs");
const data = require("../data/WhyChooseUsData");

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://gttechnovation_db_user:princeGTTechnovatin26@cluster0.745r1wo.mongodb.net/?appName=Cluster0";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB:", MONGO_URI);

    const count = await WhyChooseUs.countDocuments();
    if (count === 0) {
      const created = await WhyChooseUs.insertMany(data);
      console.log(`Inserted ${created.length} WhyChooseUs documents.`);
    } else {
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