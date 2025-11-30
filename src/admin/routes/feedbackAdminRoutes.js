const express = require("express");
const verifyAdminJWT = require("../middlewares/verifyAdminJWT");
const { getFeedbacks, deleteFeedback } = require("../controllers/adminFeedbackController");

const router = express.Router();

router.get("/", verifyAdminJWT, getFeedbacks);
router.delete("/:id", verifyAdminJWT, deleteFeedback);

module.exports = router;