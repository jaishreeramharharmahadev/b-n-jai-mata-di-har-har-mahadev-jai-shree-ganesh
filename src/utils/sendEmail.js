// utils/sendEmail.js
const nodemailer = require("nodemailer");

/**
 * Sends an email via Zoho SMTP. Works for both Support and HR accounts.
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body content
 * @param {Array} [options.attachments] - Optional attachments
 * @param {string} [options.from] - Custom sender name/email
 * @param {"hr"|"support"} [options.preferAuth] - Which account to send from
 */
async function sendEmail(options) {
  try {
    // Select sender credentials
    const preferAuth = options.preferAuth === "hr" ? "hr" : "support";

    const user =
      preferAuth === "hr"
        ? process.env.ZOHO_USER_HR
        : process.env.ZOHO_USER_SUPPORT;

    const pass =
      preferAuth === "hr"
        ? process.env.ZOHO_PASS_HR
        : process.env.ZOHO_PASS_SUPPORT;

    const from =
      options.from ||
      (preferAuth === "hr"
        ? process.env.ZOHO_FROM_HR
        : process.env.ZOHO_FROM_SUPPORT);

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.ZOHO_HOST,
      port: Number(process.env.ZOHO_PORT) || 465,
      secure: process.env.ZOHO_SECURE === "true", // SSL
      auth: { user, pass },
      connectionTimeout: 20000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });

    // Mail options
    const mailOptions = {
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments || [],
    };

    // Send
    const info = await transporter.sendMail(mailOptions);
    console.log(`📨 Email sent successfully to ${options.to}: ${info.messageId}`);

    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message || error);
    throw new Error("Email sending failed: " + error.message);
  }
}

module.exports = { sendEmail };