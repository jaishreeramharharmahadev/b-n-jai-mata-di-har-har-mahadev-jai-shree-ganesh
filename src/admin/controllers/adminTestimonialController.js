const Testimonial = require("../../models/Testimonial");

exports.getTestimonials = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", approved } = req.query;

    let query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { review: { $regex: search, $options: "i" } },
        { uniqueId: { $regex: search, $options: "i" } },
      ],
    };

    if (approved !== undefined) {
      query.isApproved = approved === "true";
    }

    const skip = (page - 1) * limit;

    const data = await Testimonial.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Testimonial.countDocuments(query);

    const formatted = data.map((t) => ({
      ...t.toObject(),
      createdAtIST: new Date(t.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    }));

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
    console.error("Fetch Testimonials Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    const updated = await Testimonial.findByIdAndUpdate(
      id,
      { isApproved },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Testimonial not found" });

    return res.status(200).json({
      message: "Approval status updated",
      data: updated,
    });

  } catch (error) {
    console.error("Testimonial Approval Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await Testimonial.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({ message: "Testimonial not found" });

    res.status(200).json({ message: "Testimonial deleted" });

  } catch (error) {
    console.error("Delete Testimonial Error:", error);
    res.status(500).json({ message: error.message });
  }
};