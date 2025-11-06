
// const sgMail = require("@sendgrid/mail");

// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// /**
//  * Sends an email using SendGrid
//  * @param {Object} options
//  * @param {string} options.to - Recipient email
//  * @param {string} options.subject - Subject line
//  * @param {string} [options.html] - HTML body
//  * @param {string} [options.text] - Plain text fallback
//  * @param {Array} [options.attachments] - Optional attachments
//  */
// module.exports = async ({ to, subject, html, text, attachments }) => {
//   if (!to || !subject) throw new Error("Email 'to' and 'subject' are required.");

//   const msg = {
//     to,
//     from: process.env.SENDGRID_FROM || "no-reply@technophile.com",
//     subject,
//     html,
//     text,
//   };

//   if (attachments && attachments.length > 0) {
//     msg.attachments = attachments.map((file) => ({
//       content: file.content, // base64 string
//       filename: file.filename,
//       type: file.contentType || "application/octet-stream",
//       disposition: "attachment",
//     }));
//   }

//   await sgMail.send(msg);
//   console.log(`✅ Email sent to ${to}`);
// };










// utils/sendEmail.js
require("dotenv").config();
const nodemailer = require("nodemailer");

const {
  ZOHO_HOST = "smtp.zoho.com",
  ZOHO_PORT = "587",
  ZOHO_SECURE = "false",

  ZOHO_SUPPORT_USER,
  ZOHO_SUPPORT_PASS,
  ZOHO_HR_USER,
  ZOHO_HR_PASS,

  ZOHO_FROM_SUPPORT,
  ZOHO_FROM_HR,
  ZOHO_FROM_DEFAULT,
} = process.env;

// create transporters (only if credentials provided)
function makeTransport(user, pass) {
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: ZOHO_HOST,
    port: parseInt(ZOHO_PORT, 10),
    secure: String(ZOHO_SECURE) === "true",
    auth: { user, pass },
  });
}

const supportTransporter = makeTransport(ZOHO_SUPPORT_USER, ZOHO_SUPPORT_PASS);
const hrTransporter = makeTransport(ZOHO_HR_USER, ZOHO_HR_PASS);

// choose transporter based on `preferAuth` or `from` address
async function sendEmail({ to, subject, html, text, attachments = [], from, preferAuth /* 'support' | 'hr' */ , envelope }) {
  if (!to || !subject) throw new Error("Email 'to' and 'subject' required");

  // choose transporter
  let transporter;
  if (preferAuth === "hr" && hrTransporter) transporter = hrTransporter;
  else transporter = supportTransporter || hrTransporter; // fallback

  if (!transporter) throw new Error("No SMTP transporter configured. Check ZOHO credentials.");

  const mailOptions = {
    from: from || ZOHO_FROM_DEFAULT || ZOHO_SUPPORT_USER,
    to,
    subject,
    html,
    text,
    attachments: attachments.map(att => ({
      filename: att.filename,
      content: (typeof att.content === "string") ? Buffer.from(att.content, "base64") : att.content,
      contentType: att.contentType || "application/octet-stream"
    })),
  };

  // optional explicit envelope override (mail-from)
  if (envelope) mailOptions.envelope = envelope;

  const info = await transporter.sendMail(mailOptions);
  return info;
}

module.exports = { sendEmail };