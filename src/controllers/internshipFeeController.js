// controllers/internshipFeeController.js
const InternshipFee = require("../models/InternshipFee");

// Only exposing getAllFees as requested
exports.getAllFees = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.popular === "true") filter.popular = true;

    let query = InternshipFee.find(filter)
      // send only required fields
      .select("duration price currency popular");

    if (req.query.sort === "price_desc") query = query.sort({ price: -1 });
    else query = query.sort({ price: 1 });

    const fees = await query.exec();
    res.json(fees);
  } catch (err) {
    next(err);
  }
};