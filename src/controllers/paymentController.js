const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");

const razorpay = require("../config/razorpay");
const Applicant = require("../models/Applicant");
const InternshipFee = require("../models/InternshipFee");
const Payment = require("../models/Payment");

const { addDays, parseDurationToDays } = require("../helpers/dateHelpers");

// Import new modular functions
const {
  registerApplicantCore,
  sendAfterRegistrationEmails,
} = require("./applicantController");

// STEP 1: CREATE ORDER + TEMP SAVE USER DATA IN PAYMENT COLLECTION
exports.createOrderWithApplicant = async (req, res) => {
  try {
    const {
      duration,
      fullName,
      email,
      phone,
      dob,
      college,
      address,
      domain,
      linkedin,
      github,
      password,
      agree,
    } = req.body;

    if (!duration || !fullName || !email || !phone || !dob || !college || !address || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const existingPaidApplicant = await Applicant.findOne({
      email: email.toLowerCase(),
      "payment.status": "paid",
    });

    if (existingPaidApplicant) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered & payment done!",
      });
    }

    // Fetch secure amount from backend
    const feeConfig = await InternshipFee.findOne({ duration });
    if (!feeConfig) {
      return res.status(400).json({
        success: false,
        message: "Invalid duration or no fee available for selected duration.",
      });
    }

    const amountPaise = feeConfig.price * 100; // Razorpay needs paise
    const currency = feeConfig.currency || "INR";

    // Hash password now (secure)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create secure payment order on Razorpay
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt: "GTTECH-" + Date.now(),
      notes: { email, fullName, domain, duration },
    });

    // Save as pending payment session
    const payment = await Payment.create({
      applicantEmail: email.toLowerCase(),
      applicantName: fullName,
      duration,
      domain,
      internshipFee: feeConfig._id,
      amount: feeConfig.price,
      currency,
      razorpayOrderId: order.id,
      status: "created",
      rawOrder: order,
      applicantData: {
        duration,
        fullName,
        email: email.toLowerCase(),
        phone,
        dob,
        college,
        address,
        domain,
        linkedin,
        github,
        passwordHash,
        agree: !!agree,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentDbId: payment._id,
    });
  } catch (error) {
    console.error("Order Creation Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};


// STEP 2: VERIFY PAYMENT → CREATE APPLICANT → SEND EMAILS
exports.verifyPaymentAndRegister = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentDbId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentDbId) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields",
      });
    }

    const payment = await Payment.findById(paymentDbId);
    if (!payment) return res.status(404).json({ success: false, message: "Payment record missing" });

    if (payment.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Order ID mismatch!" });
    }

    // Backend computes signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      payment.status = "failed";
      payment.error = "Signature mismatch";
      await payment.save();
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Fetch payment details from Razorpay API (final check)
    const rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);

    if (rzpPayment.status !== "captured") {
      payment.status = "failed";
      payment.error = `Payment not captured: ${rzpPayment.status}`;
      await payment.save();
      return res.status(400).json({ success: false, message: "Payment not completed!" });
    }

    if (rzpPayment.amount !== payment.amount * 100) {
      payment.status = "failed";
      payment.error = "Amount tampering detected!";
      await payment.save();
      return res.status(400).json({
        success: false,
        message: "Payment amount mismatch! Security alert.",
      });
    }

    // Mark payment captured
    payment.razorpayPaymentId = rzpPayment.id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "captured";
    payment.method = rzpPayment.method;
    payment.capturedAt = new Date();
    payment.rawPayment = rzpPayment;
    await payment.save();

    // If user already registered, simply return
    if (payment.applicant) {
      const applicant = await Applicant.findById(payment.applicant);
      return res.status(200).json({
        success: true,
        message: "Payment verified earlier",
        applicantId: applicant._id,
      });
    }

    // Create applicant and send emails
    const applicant = await registerApplicantCore(payment.applicantData);
    payment.applicant = applicant._id;
    await payment.save();

    await sendAfterRegistrationEmails(applicant);

    return res.status(200).json({
      success: true,
      message: "Payment verified & applicant registered successfully!",
      uniqueId: applicant.uniqueId,
      applicantId: applicant._id,
    });

  } catch (error) {
    console.error("Payment Verify Error:", error);

    // Save for support tracking
    await Payment.updateOne({ _id: req.body.paymentDbId }, {
      status: "captured_applicant_failed",
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Payment captured but registration failed! Support will assist.",
    });
  }
};