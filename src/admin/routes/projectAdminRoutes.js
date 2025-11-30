const express = require("express");
const verifyAdminJWT = require("../middlewares/verifyAdminJWT");
const {
  getProjectSubmissions,
  deleteProjectSubmission
} = require("../controllers/adminProjectController");

const router = express.Router();

// Secure Admin Routes
router.get("/", verifyAdminJWT, getProjectSubmissions);
router.delete("/:id", verifyAdminJWT, deleteProjectSubmission);

module.exports = router;