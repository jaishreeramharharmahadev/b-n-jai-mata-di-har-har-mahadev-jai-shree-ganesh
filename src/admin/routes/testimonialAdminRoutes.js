const express = require("express");
const verifyAdminJWT = require("../middlewares/verifyAdminJWT");
const {
  getTestimonials,
  updateApproval,
  deleteTestimonial
} = require("../controllers/adminTestimonialController");

const router = express.Router();

router.get("/", verifyAdminJWT, getTestimonials);
router.put("/:id", verifyAdminJWT, updateApproval);
router.delete("/:id", verifyAdminJWT, deleteTestimonial);

module.exports = router;