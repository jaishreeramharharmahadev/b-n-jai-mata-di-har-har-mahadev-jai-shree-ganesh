const express = require("express");
const router = express.Router();
const shortid = require("shortid");
const razorpay = require("../utils/razorpay");

router.post("/order", async (req, res) => {
  try {
    const { amount } = req.body; // amount in rupees

    const options = {
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: shortid.generate(),
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ order });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to create Razorpay order" });
  }
});

const crypto = require("crypto");
const Applicant = require("../models/Applicant"); // adjust path
const { registerApplicantAfterPayment } = require("../controllers/applicantController");

router.post("/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, applicantData } = req.body;

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // ✅ Payment verified, now register applicant
    const applicant = await registerApplicantAfterPayment(applicantData);

    res.status(201).json({ success: true, applicant });
  } catch (error) {
    console.error("Payment verification failed:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;