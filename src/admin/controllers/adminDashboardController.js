const Applicant = require("../../models/Applicant");
const Internship = require("../../models/Internship");
const Certificate = require("../../models/Certificate");
const Payment = require("../../models/Payment");

exports.getDashboardStats = async (req, res) => {
  try {
    const totalApplicants = await Applicant.countDocuments();
    const totalInternships = await Internship.countDocuments();
    const totalCertificates = await Certificate.countDocuments();
    const totalRevenueData = await Payment.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
    ]);

    const totalRevenue = totalRevenueData.length > 0 ? totalRevenueData[0].totalRevenue : 0;

    const activeInternships = await Internship.countDocuments({ status: "active" });
    const completedInternships = await Internship.countDocuments({ status: "completed" });

    // Convert server time to IST
    const istTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    return res.status(200).json({
      status: "success",
      data: {
        overview: {
          totalApplicants,
          totalInternships,
          totalCertificates,
          totalRevenue,
          activeInternships,
          completedInternships,
        },
        istTime,
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return res.status(500).json({ message: error.message });
  }
};