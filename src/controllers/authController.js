const Applicant = require('../models/Applicant');
const Otp = require('../models/Otp');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/sendEmail');

const createToken = (applicant) => {
  return jwt.sign(
    { id: applicant._id, email: applicant.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, remember } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    const user = await Applicant.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = createToken(user);

    const maxAge = remember
      ? 30 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
    });

    const safeUser = await Applicant.findById(user._id).select("-passwordHash");

    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "Email required" });

    const emailLower = email.toLowerCase();
    const user = await Applicant.findOne({ email: emailLower });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const now = Date.now();
    let record = await Otp.findOne({ email: emailLower });

    if (record) {
      if (record.cooldownUntil && record.cooldownUntil > now) {
        const waitSec = Math.ceil((record.cooldownUntil - now) / 1000);
        return res.status(429).json({
          message: `Please wait ${waitSec} seconds before requesting again`,
        });
      }

      if (record && record.resendCount >= 1) {
  return res.status(429).json({ message: "You can resend OTP only once" });
}

      if (now - record.lastSentAt < 60 * 1000)
        return res
          .status(429)
          .json({ message: "Wait 1 minute before resend OTP" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    const expiresAt = now + 10 * 60 * 1000;

    await Otp.findOneAndUpdate(
  { email },
  {
    otp: hashedOtp,
    expiresAt,
    resendCount: record?.resendCount ? record.resendCount + 1 : 0,
  },
  { upsert: true }
);

    await sendEmail({
      to: emailLower,
      subject: "Reset Password OTP - GT Technovation",
      html: `
        <p>Your OTP to reset your password:</p>
        <h2>${otp}</h2>
        <p>OTP valid for only 10 minutes</p>
      `,
      preferAuth: "support",
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "OTP sending failed" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email & OTP required" });

    const emailLower = email.toLowerCase();
    const record = await Otp.findOne({ email: emailLower });

    if (!record) return res.status(400).json({ message: "Invalid OTP request" });

    if (record.expiresAt < Date.now()) {
      await Otp.deleteOne({ email: emailLower });
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedOtp !== record.otp)
      return res.status(400).json({ message: "Incorrect OTP" });

    await Otp.findOneAndUpdate(
      { email: emailLower },
      { otp: null, expiresAt: null }
    );

    res.json({ message: "OTP Verified" });
  } catch (err) {
    res.status(500).json({ message: "OTP verification failed" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res.status(400).json({ message: "Missing fields" });

    const emailLower = email.toLowerCase();
    const otpExists = await Otp.findOne({ email: emailLower, otp: { $ne: null } });

    if (otpExists) {
      return res.status(403).json({ message: "OTP not verified" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Applicant.findOneAndUpdate(
      { email: emailLower },
      { passwordHash: hashedPassword }
    );

    await Otp.findOneAndUpdate(
      { email: emailLower },
      {
        resendCount: 0,
        lastSentAt: null,
        otp: null,
        expiresAt: null,
        cooldownUntil: Date.now() + 5 * 60 * 1000,
      },
      { upsert: true }
    );

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Password reset failed" });
  }
};