// const Applicant = require("../../models/Applicant");

// exports.getApplicants = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search = "" } = req.query;

//     const query = {
//       $or: [
//         { fullName: { $regex: search, $options: "i" } },
//         { email: { $regex: search, $options: "i" } },
//         { uniqueId: { $regex: search, $options: "i" } },
//         { domain: { $regex: search, $options: "i" } },
//       ],
//     };

//     const skip = (page - 1) * limit;

//     const applicants = await Applicant.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit));

//     const total = await Applicant.countDocuments(query);

//     res.status(200).json({
//       status: "success",
//       data: applicants,
//       pagination: {
//         total,
//         page: Number(page),
//         limit: Number(limit),
//         totalPages: Math.ceil(total / limit),
//       },
//     });

//   } catch (error) {
//     console.error("Error Fetching Applicants:", error);
//     res.status(500).json({ message: error.message });
//   }
// };


// exports.deleteApplicant = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deleted = await Applicant.findByIdAndDelete(id);

//     if (!deleted) {
//       return res.status(404).json({ message: "Applicant Not Found" });
//     }

//     res.status(200).json({
//       message: "Applicant Deleted Successfully",
//       deletedApplicant: deleted,
//     });

//   } catch (error) {
//     console.error("Applicant Delete Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };




const Applicant = require("../../models/Applicant");

// Fixed domain list from your message
const DOMAIN_LIST = [
  "Blockchain and Crypto",
  "Backend Development",
  "Cyber Security",
  "Prompt Engineering",
  "UI-UX Design",
  "AI & Neural Networks",
  "Full Stack Web Development",
  "Cloud Computing",
  "DevOps Engineering",
  "Data Science and Analytics",
  "Machine Learning",
];

exports.getApplicants = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = {
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { uniqueId: { $regex: search, $options: "i" } },
        { domain: { $regex: search, $options: "i" } },
      ],
    };

    const skip = (page - 1) * limit;

    // Paginated data
    const applicantsPromise = Applicant.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalPromise = Applicant.countDocuments(query);

    // Analytics source (no pagination, minimal fields)
    const analyticsSourcePromise = Applicant.find(query)
      .select("createdAt domain duration")
      .lean();

    const [applicants, total, analyticsSource] = await Promise.all([
      applicantsPromise,
      totalPromise,
      analyticsSourcePromise,
    ]);

    // ---- Analytics: Daily Registrations ----
    const dailyMap = {};
    analyticsSource.forEach((a) => {
      if (!a.createdAt) return;
      const date = a.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!dailyMap[date]) {
        dailyMap[date] = { date, count: 0 };
      }
      dailyMap[date].count += 1;
    });
    const dailyRegistrations = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // ---- Analytics: Domain Stats ----
    const domainMap = {};

    // Initialize all configured domains to 0
    DOMAIN_LIST.forEach((d) => {
      domainMap[d] = 0;
    });

    analyticsSource.forEach((a) => {
      const dom = a.domain || "Others";
      if (DOMAIN_LIST.includes(dom)) {
        domainMap[dom] += 1;
      } else {
        domainMap["Others"] = (domainMap["Others"] || 0) + 1;
      }
    });

    const domainStats = Object.entries(domainMap).map(([domain, count]) => ({
      domain,
      count,
    }));

    // ---- Analytics: Duration Stats (Dynamic) ----
    const durationMap = {};
    analyticsSource.forEach((a) => {
      const dur = a.duration || "NA";
      durationMap[dur] = (durationMap[dur] || 0) + 1;
    });

    const durationStats = Object.entries(durationMap).map(
      ([duration, count]) => ({
        duration,
        count,
      })
    );

    res.status(200).json({
      status: "success",
      data: applicants,
      analytics: {
        dailyRegistrations,
        domainStats,
        durationStats,
      },
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error Fetching Applicants:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteApplicant = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Applicant.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Applicant Not Found" });
    }

    res.status(200).json({
      message: "Applicant Deleted Successfully",
      deletedApplicant: deleted,
    });
  } catch (error) {
    console.error("Applicant Delete Error:", error);
    res.status(500).json({ message: error.message });
  }
};