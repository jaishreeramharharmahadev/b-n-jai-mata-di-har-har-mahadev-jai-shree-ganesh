const mongoose = require('mongoose');
const Internship = require('../models/Internship');
const { internshipsData } = require('../data/internshipsData');

async function seed() {
  await mongoose.connect("mongodb+srv://gttechnovation_db_user:princeGTTechnovatin26@cluster0.745r1wo.mongodb.net/?appName=Cluster0");
  
  for (const it of internshipsData) {
    const existing = await Internship.findOne({ id: it.id });
    if (existing) {
      // Update all fields including the new ones
      existing.domain = it.domain;
      existing.description = it.description;
      existing.skills = it.skills;
      existing.stipend = it.stipend;
      existing.spots = it.spots;
      existing.image = it.image;
      existing.learningPath = it.learningPath;
      
      // Update new enhanced fields if they exist in the data
      if (it.rating) existing.rating = it.rating;
      if (it.location) existing.location = it.location;
      if (it.projectRoadmap) existing.projectRoadmap = it.projectRoadmap;
      if (it.additionalInfo) existing.additionalInfo = it.additionalInfo;
      
      await existing.save();
      console.log('Updated', it.domain);
    } else {
      await Internship.create(it);
      console.log('Inserted', it.domain);
    }
  }
  
  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch(err => { 
  console.error('Seed error:', err); 
  process.exit(1); 
});