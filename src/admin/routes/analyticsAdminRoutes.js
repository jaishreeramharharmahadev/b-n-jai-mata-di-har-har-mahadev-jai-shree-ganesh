// const express = require("express");
// const verifyAdminJWT = require("../middlewares/verifyAdminJWT");
// const {
//   getOverviewAnalytics,
//   getTimeSeriesAnalytics,
//   getDomainAnalytics,
// } = require("../controllers/adminAnalyticsController");

// const router = express.Router();

// // All routes are protected
// router.get("/overview", verifyAdminJWT, getOverviewAnalytics);
// router.get("/timeseries", verifyAdminJWT, getTimeSeriesAnalytics);
// router.get("/domains", verifyAdminJWT, getDomainAnalytics);

// module.exports = router;


// routes/adminAnalyticsRoutes.js
const express = require("express");
const router = express.Router();
const {
  getOverviewAnalytics,
  getTimeSeriesAnalytics,
  getDomainAnalytics,
  getPaymentAnalytics,
} = require("../controllers/adminAnalyticsController");
const verifyAdminJWT = require("../middlewares/verifyAdminJWT");

router.get("/overview", verifyAdminJWT, getOverviewAnalytics);
router.get("/timeseries", verifyAdminJWT, getTimeSeriesAnalytics);
router.get("/domains", verifyAdminJWT, getDomainAnalytics);
router.get("/payments", verifyAdminJWT, getPaymentAnalytics);

module.exports = router;