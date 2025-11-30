const express = require("express");
const verifyAdminJWT = require("../middlewares/verifyAdminJWT");
const {
  getApplicants,
  deleteApplicant,
} = require("../controllers/adminApplicantController");

const router = express.Router();

// GET applicants list with search + pagination
router.get("/", verifyAdminJWT, getApplicants);

// DELETE applicant by ID
router.delete("/:id", verifyAdminJWT, deleteApplicant);

module.exports = router;