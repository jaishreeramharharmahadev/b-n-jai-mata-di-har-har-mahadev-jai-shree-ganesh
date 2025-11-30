const Payment = require("../../models/Payment");
const Applicant = require("../../models/Applicant");

exports.getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = {
      $or: [
        { paymentId: { $regex: search, $options: "i" } },
        { uniqueId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { domain: { $regex: search, $options: "i" } },
      ],
    };

    const skip = (page - 1) * limit;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Payment.countDocuments(query);

    // IST Time Conversion + attach Applicant info
    const enrichedPayments = await Promise.all(
      payments.map(async (pay) => {
        const applicant = await Applicant.findOne({ uniqueId: pay.uniqueId });

        return {
          ...pay.toObject(),
          applicantInfo: applicant
            ? { name: applicant.name, email: applicant.email, phone: applicant.phone }
            : null,
          createdAtIST: new Date(pay.createdAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
        };
      })
    );

    res.status(200).json({
      status: "success",
      data: enrichedPayments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("Payment Fetch Error:", error);
    res.status(500).json({ message: error.message });
  }
};