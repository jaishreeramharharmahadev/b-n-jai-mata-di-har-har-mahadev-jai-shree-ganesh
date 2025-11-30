const Feedback = require("../../models/Feedback");

exports.getFeedbacks = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = {
      $or: [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { uniqueId: { $regex: search, $options: "i" } },
        { domain: { $regex: search, $options: "i" } },
      ],
    };

    const skip = (page - 1) * limit;

    const feedback = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const formatted = feedback.map((f) => ({
      ...f.toObject(),
      createdAtIST: new Date(f.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    }));

    const total = await Feedback.countDocuments(query);

    res.status(200).json({
      status: "success",
      data: formatted,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error("Feedback Fetch Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const removed = await Feedback.findByIdAndDelete(id);

    if (!removed) return res.status(404).json({ message: "Feedback Not Found" });

    res.status(200).json({
      message: "Feedback Deleted Successfully",
    });

  } catch (error) {
    console.error("Feedback Delete Error:", error);
    res.status(500).json({ message: error.message });
  }
};