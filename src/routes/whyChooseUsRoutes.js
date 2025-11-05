// File: routes/whyChooseUsRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/whyChooseUsController");

// GET /api/whychooseus
router.get("/", controller.getAllReasons);

module.exports = router;