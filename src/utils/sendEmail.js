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
  host: "smtppro.zoho.in",
  port: 587,
  secure: true,
  auth: {
    type: "OAuth2",
    user: ZOHO_EMAIL,
    clientId: ZOHO_CLIENT_ID,
    clientSecret: ZOHO_CLIENT_SECRET,
    refreshToken: ZOHO_REFRESH_TOKEN,
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