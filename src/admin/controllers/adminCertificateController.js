const Certificate = require("../../models/Certificate");

exports.getCertificates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = {
      $or: [
        { uniqueId: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { domain: { $regex: search, $options: "i" } },
      ],
    };

    const skip = (page - 1) * limit;

    const certificates = await Certificate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Certificate.countDocuments(query);

    // Convert timestamps to IST timezone
    const formattedCertificates = certificates.map((c) => ({
      ...c.toObject(),
      createdAtIST: new Date(c.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      updatedAtIST: new Date(c.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    }));

    res.status(200).json({
      status: "success",
      data: formattedCertificates,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("Get Certificates Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Delete Certificate
exports.deleteCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Certificate.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Certificate Not Found" });
    }

    res.status(200).json({
      message: "Certificate Deleted Successfully",
      deletedCertificate: deleted,
    });
  } catch (error) {
    console.error("Delete Certificate Error:", error);
    res.status(500).json({ message: error.message });
  }
};