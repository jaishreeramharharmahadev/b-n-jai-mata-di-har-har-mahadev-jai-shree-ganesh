// utils/sendEmail.js
require("dotenv").config();
const nodemailer = require("nodemailer");

const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_API_DOMAIN,
  ZOHO_EMAIL
} = process.env;

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 465,
  secure: true,
  auth: {
    type: "OAuth2",
    user: process.env.ZOHO_EMAIL,
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
  },
});

async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: ZOHO_EMAIL,
      to,
      subject,
      html,
      text,
    });
    console.log("✅ Email sent:", info.response);
    return { success: true };
  } catch (error) {
    console.error("❌ Email error:", error);
    return { success: false, error };
  }
}

module.exports = { sendEmail };