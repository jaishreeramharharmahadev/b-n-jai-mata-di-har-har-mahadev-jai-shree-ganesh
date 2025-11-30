const express = require("express");
const verifyAdminJWT = require("../middlewares/verifyAdminJWT");
const { getPayments } = require("../controllers/adminPaymentController");

const router = express.Router();

router.get("/", verifyAdminJWT, getPayments);

module.exports = router;