// File: controllers/whyChooseUsController.js
const WhyChooseUs = require("../models/WhyChooseUs");

exports.getAllReasons = async (req, res, next) => {
  try {
    // allow optional query to filter or sort in future; now just return all sorted by order
    const reasons = await WhyChooseUs.find()
      .select("title desc features stat gradient delay iconName order -_id")
      .sort({ order: 1 })
      .exec();

    res.json(reasons);
  } catch (err) {
    next(err);
  }
};