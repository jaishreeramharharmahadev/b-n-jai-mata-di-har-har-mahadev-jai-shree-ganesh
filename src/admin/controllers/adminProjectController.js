const ProjectSubmission = require("../../models/ProjectSubmission");

exports.getProjectSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = {
      $or: [
        { uniqueId: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { projectTitle: { $regex: search, $options: "i" } },
      ],
    };

    const skip = (page - 1) * limit;

    const submissions = await ProjectSubmission.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await ProjectSubmission.countDocuments(query);

    const formatted = submissions.map((p) => ({
      ...p.toObject(),
      submittedAtIST: new Date(p.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
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
    console.error("Project Fetch Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProjectSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    const removed = await ProjectSubmission.findByIdAndDelete(id);

    if (!removed) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ message: "Project removed successfully" });
  } catch (error) {
    console.error("Project Delete Error:", error);
    res.status(500).json({ message: error.message });
  }
};