const express = require("express");
const verifyAdminJWT = require("../middlewares/verifyAdminJWT");
const { getDashboardStats } = require("../controllers/adminDashboardController");

const router = express.Router();

// Protected Route
router.get("/stats", verifyAdminJWT, getDashboardStats);

module.exports = router;