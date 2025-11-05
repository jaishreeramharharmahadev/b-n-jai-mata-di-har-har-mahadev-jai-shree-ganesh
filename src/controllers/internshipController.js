const Internship = require("../models/Internship");

// Get all internships
exports.getAllInternships = async (req, res) => {
  try {
    const internships = await Internship.find();
    res.status(200).json({
      success: true,
      count: internships.length,
      data: internships
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInternshipBySubDomain = async (req, res) => {
  try {
    const { subDomain } = req.params;
    const internship = await Internship.findOne({ subDomain });

    if (!internship) {
      return res
        .status(404)
        .json({ success: false, message: "Internship not found" });
    }

    res.json({ success: true, data: internship });
  } catch (err) {
    console.error("Error fetching internship:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};