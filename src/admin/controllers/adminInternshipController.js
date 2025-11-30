// const Internship = require("../../models/Internship");

// exports.getInternships = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search = "", status = "" } = req.query;

//     const query = {
//       $or: [
//         { domain: { $regex: search, $options: "i" } },
//         { subDomain: { $regex: search, $options: "i" } },
//       ],
//     };

//     if (status) query.status = status;

//     const skip = (page - 1) * limit;

//     const data = await Internship.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit));

//     const total = await Internship.countDocuments(query);

//     return res.status(200).json({
//       status: "success",
//       data,
//       pagination: {
//         total,
//         page: Number(page),
//         limit: Number(limit),
//         totalPages: Math.ceil(total / limit),
//       },
//     });

//   } catch (error) {
//     console.error("Get Internship Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.createInternship = async (req, res) => {
//   try {
//     const internship = await Internship.create(req.body);
//     res.status(201).json({
//       message: "Internship Created Successfully",
//       data: internship,
//     });
//   } catch (error) {
//     console.error("Create Internship Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.updateInternship = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const updated = await Internship.findByIdAndUpdate(id, req.body, {
//       new: true,
//     });

//     if (!updated) {
//       return res.status(404).json({ message: "Internship Not Found" });
//     }

//     res.status(200).json({
//       message: "Internship Updated Successfully",
//       data: updated,
//     });

//   } catch (error) {
//     console.error("Update Internship Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.deleteInternship = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deleted = await Internship.findByIdAndDelete(id);

//     if (!deleted) {
//       return res.status(404).json({ message: "Internship Not Found" });
//     }

//     res.status(200).json({
//       message: "Internship Deleted Successfully",
//       data: deleted,
//     });

//   } catch (error) {
//     console.error("Delete Internship Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };



const Internship = require("../../models/Internship");

exports.getInternships = async (req, res) => {
  try {
    const { page = 1, limit = 12, search = "", status = "" } = req.query;

    const query = {
      $or: [
        { domain: { $regex: search, $options: "i" } },
        { subDomain: { $regex: search, $options: "i" } },
      ],
    };

    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const data = await Internship.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Internship.countDocuments(query);

    return res.status(200).json({
      status: "success",
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("Get Internship Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createInternship = async (req, res) => {
  try {
    const internship = await Internship.create(req.body);
    res.status(201).json({
      message: "Internship Created Successfully",
      data: internship,
    });
  } catch (error) {
    console.error("Create Internship Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateInternship = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Internship.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Internship Not Found" });
    }

    res.status(200).json({
      message: "Internship Updated Successfully",
      data: updated,
    });

  } catch (error) {
    console.error("Update Internship Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteInternship = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Internship.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Internship Not Found" });
    }

    res.status(200).json({
      message: "Internship Deleted Successfully",
      data: deleted,
    });

  } catch (error) {
    console.error("Delete Internship Error:", error);
    res.status(500).json({ message: error.message });
  }
};