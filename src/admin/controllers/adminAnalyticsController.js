// controllers/admin/adminAnalyticsController.js (example path)
// adjust the path according to your structure

const Applicant = require("../../models/Applicant");
const Internship = require("../../models/Internship");
const Certificate = require("../../models/Certificate");
const Payment = require("../../models/Payment");

/**
 * Helper: build JS Date from Mongo $group parts
 */
function buildDateFromGroup(groupId) {
  const { year, month, day } = groupId;
  if (year && month && day) {
    return new Date(year, month - 1, day);
  }
  if (year && month) {
    return new Date(year, month - 1, 1);
  }
  if (year) {
    return new Date(year, 0, 1);
  }
  return new Date();
}

/**
 * Helper: group fields for aggregation based on granularity
 */
function getGroupIdPipeline(granularity) {
  if (granularity === "yearly") {
    return {
      year: { $year: "$createdAt" },
    };
  }

  if (granularity === "monthly") {
    return {
      year: { $year: "$createdAt" },
      month: { $month: "$createdAt" },
    };
  }

  // default daily
  return {
    year: { $year: "$createdAt" },
    month: { $month: "$createdAt" },
    day: { $dayOfMonth: "$createdAt" },
  };
}

/**
 * Helper: build label string for chart x-axis
 */
function buildLabelFromGroup(granularity, groupId) {
  const { year, month, day } = groupId;
  if (granularity === "yearly") {
    return `${year}`;
  }
  if (granularity === "monthly") {
    // e.g. 2025-03
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  // daily
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

/**
 * GET /admin/analytics/overview
 * High-level numbers for cards on dashboard
 */
exports.getOverviewAnalytics = async (req, res) => {
  try {
    const [
      totalApplicants,
      totalInternships,
      totalCertificates,
      totalPaymentsAgg,
      totalPaymentsCount,
      capturedPaymentsCount,
    ] = await Promise.all([
      Applicant.countDocuments(),
      Internship.countDocuments(),
      Certificate.countDocuments(),
      Payment.aggregate([
        {
          $match: {
            status: { $in: ["captured", "captured_applicant_failed", "refunded"] },
          },
        },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
      ]),
      Payment.countDocuments(), // all payment docs
      Payment.countDocuments({ status: "captured" }), // successful captures
    ]);

    const totalRevenue =
      totalPaymentsAgg.length > 0 ? totalPaymentsAgg[0].totalAmount : 0;

    const istNow = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    res.status(200).json({
      status: "success",
      data: {
        overviewCards: {
          totalApplicants,
          totalInternships,
          totalCertificates,
          totalRevenue,
        },
        paymentsSummary: {
          totalPayments: totalPaymentsCount,
          capturedPayments: capturedPaymentsCount,
          nonCapturedPayments: totalPaymentsCount - capturedPaymentsCount,
        },
        serverTimeIST: istNow,
      },
    });
  } catch (error) {
    console.error("Overview Analytics Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /admin/analytics/timeseries
 * Query:
 *   granularity=daily|monthly|yearly (default daily)
 *   days=number (for daily)
 *   months=number (for monthly)
 *   years=number (for yearly)
 *
 * Returns time-series for:
 *   - applicants registrations
 *   - certificates generated
 *   - payments (captured revenue over time)
 */
exports.getTimeSeriesAnalytics = async (req, res) => {
  try {
    const granularity = (req.query.granularity || "daily").toLowerCase();

    let fromDate = new Date();
    let toDate = new Date();
    toDate.setHours(23, 59, 59, 999);

    if (granularity === "yearly") {
      const years = Number(req.query.years) || 5;
      fromDate = new Date();
      fromDate.setFullYear(fromDate.getFullYear() - years + 1);
      fromDate.setMonth(0, 1);
      fromDate.setHours(0, 0, 0, 0);
    } else if (granularity === "monthly") {
      const months = Number(req.query.months) || 12;
      fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - months + 1);
      fromDate.setDate(1);
      fromDate.setHours(0, 0, 0, 0);
    } else {
      // daily
      const days = Number(req.query.days) || 30;
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days + 1);
      fromDate.setHours(0, 0, 0, 0);
    }

    const groupId = getGroupIdPipeline(granularity);

    // Applicants time-series
    const applicantsAgg = await Applicant.aggregate([
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      {
        $group: {
          _id: groupId,
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Certificates time-series
    const certificatesAgg = await Certificate.aggregate([
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      {
        $group: {
          _id: groupId,
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Payments (captured / refunded / captured_applicant_failed) for revenue over time
    const paymentsAgg = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: fromDate, $lte: toDate },
          status: { $in: ["captured", "captured_applicant_failed", "refunded"] },
        },
      },
      {
        $group: {
          _id: groupId,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const applicantsSeries = applicantsAgg.map((item) => {
      const date = buildDateFromGroup(item._id);
      return {
        label: buildLabelFromGroup(granularity, item._id),
        dateISO: date.toISOString(),
        count: item.count,
      };
    });

    const certificatesSeries = certificatesAgg.map((item) => {
      const date = buildDateFromGroup(item._id);
      return {
        label: buildLabelFromGroup(granularity, item._id),
        dateISO: date.toISOString(),
        count: item.count,
      };
    });

    const paymentsSeries = paymentsAgg.map((item) => {
      const date = buildDateFromGroup(item._id);
      return {
        label: buildLabelFromGroup(granularity, item._id),
        dateISO: date.toISOString(),
        totalAmount: item.totalAmount,
        count: item.count,
      };
    });

    res.status(200).json({
      status: "success",
      data: {
        fromDate,
        toDate,
        granularity,
        applicantsSeries,
        certificatesSeries,
        paymentsSeries,
      },
    });
  } catch (error) {
    console.error("TimeSeries Analytics Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /admin/analytics/domains
 * Domain-wise & duration-wise distribution of applicants
 */
exports.getDomainAnalytics = async (req, res) => {
  try {
    const [byDomainAgg, byDurationAgg] = await Promise.all([
      Applicant.aggregate([
        {
          $group: {
            _id: "$domain",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Applicant.aggregate([
        {
          $group: {
            _id: "$duration",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const domains = byDomainAgg.map((item) => ({
      domain: item._id || "Unknown",
      count: item.count,
    }));

    const durations = byDurationAgg.map((item) => ({
      duration: item._id || "Unknown",
      count: item.count,
    }));

    res.status(200).json({
      status: "success",
      data: { domains, durations },
    });
  } catch (error) {
    console.error("Domain Analytics Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /admin/analytics/payments
 * Payment status stats & captured vs others
 */
exports.getPaymentAnalytics = async (req, res) => {
  try {
    const [totalPayments, capturedPayments, paymentsByStatusAgg] =
      await Promise.all([
        Payment.countDocuments(),
        Payment.countDocuments({ status: "captured" }),
        Payment.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),
      ]);

    const paymentsByStatus = paymentsByStatusAgg.map((item) => ({
      status: item._id || "unknown",
      count: item.count,
    }));

    res.status(200).json({
      status: "success",
      data: {
        summary: {
          totalPayments,
          capturedPayments,
          nonCapturedPayments: totalPayments - capturedPayments,
        },
        byStatus: paymentsByStatus,
      },
    });
  } catch (error) {
    console.error("Payment Analytics Error:", error);
    res.status(500).json({ message: error.message });
  }
};