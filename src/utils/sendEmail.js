// src/utils/sendEmail.js
const axios = require("axios");

/**
 * Send email via Brevo API (works on Render)
 */
async function sendEmail({ to, subject, html, attachments, from }) {
  try {
    const payload = {
      sender: { name: "GT Technovation", email: from },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };

    if (attachments && attachments.length > 0) {
      payload.attachment = attachments.map((a) => ({
        name: a.filename,
        content: a.content, // must be base64
      }));
    }

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Brevo email sent to ${to}`);
    return response.data;
  } catch (err) {
    console.error("❌ Brevo email failed:", err.response?.data || err.message);
    throw new Error(err.message || "Email send failed");
  }
}

module.exports = { sendEmail };
