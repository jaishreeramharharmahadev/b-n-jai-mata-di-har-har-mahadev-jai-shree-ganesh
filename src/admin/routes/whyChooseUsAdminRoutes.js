const express = require("express");
const verifyAdminJWT = require("../middlewares/verifyAdminJWT");
const {
  getWhyChooseUs,
  createWhyChooseUs,
  updateWhyChooseUs,
  deleteWhyChooseUs
} = require("../controllers/adminWhyChooseUsController");

const router = express.Router();

router.get("/", verifyAdminJWT, getWhyChooseUs);
router.post("/", verifyAdminJWT, createWhyChooseUs);
router.put("/:id", verifyAdminJWT, updateWhyChooseUs);
router.delete("/:id", verifyAdminJWT, deleteWhyChooseUs);

module.exports = router;