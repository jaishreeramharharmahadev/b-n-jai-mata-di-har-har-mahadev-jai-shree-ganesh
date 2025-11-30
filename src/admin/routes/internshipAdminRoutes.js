const express = require("express");
const verifyAdminJWT = require("../middlewares/verifyAdminJWT");
const {
  getInternships,
  createInternship,
  updateInternship,
  deleteInternship,
} = require("../controllers/adminInternshipController");

const router = express.Router();

// All Secured Routes
router.get("/", verifyAdminJWT, getInternships);
router.post("/", verifyAdminJWT, createInternship);
router.put("/:id", verifyAdminJWT, updateInternship);
router.delete("/:id", verifyAdminJWT, deleteInternship);

module.exports = router;