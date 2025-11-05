// scripts/seedTestimonials.js
"use strict";

/**
 * Usage:
 *  MONGO_URI="mongodb://localhost:27017/your-db" node scripts/seedTestimonials.js
 *
 * The script will insert the sample testimonials only if the collection is empty.
 * To force-replace, uncomment the deleteMany block in the code below.
 */

const mongoose = require('mongoose');
const Testimonial = require('../models/Testimonial');
const data = require('../data/TestimonialData');

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://gttechnovation_db_user:princeGTTechnovatin26@cluster0.745r1wo.mongodb.net/?appName=Cluster0";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB:', MONGO_URI);

    const count = await Testimonial.countDocuments();
    if (count === 0) {
      const created = await Testimonial.insertMany(data);
      console.log(`Inserted ${created.length} testimonial documents.`);
    } else {
      // If you want to replace existing data, uncomment below:
      // await Testimonial.deleteMany({});
      // const created = await Testimonial.insertMany(data);
      // console.log(`Replaced collection with ${created.length} documents.`);
      console.log(`Collection already has ${count} documents. No changes made.`);
    }

    await mongoose.disconnect();
    console.log('Disconnected. Seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();