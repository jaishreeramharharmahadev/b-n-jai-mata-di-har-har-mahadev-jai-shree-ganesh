const express = require("express");
const router = express.Router();

const {
  createOrderWithApplicant,
  verifyPaymentAndRegister,
} = require("../controllers/paymentController");

// Step 1: Create secure payment order & store applicant temp data
router.post("/payments/create-order-with-applicant", createOrderWithApplicant);

// Step 2: Verify payment + Register applicant securely
router.post("/payments/verify", verifyPaymentAndRegister);

module.exports = router;