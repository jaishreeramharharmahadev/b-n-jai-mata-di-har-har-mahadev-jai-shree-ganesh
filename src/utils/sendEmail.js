
// utils/sendEmail.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

/**
 * Send email using Brevo
 * Supports both normal and attachment emails
 */
export const sendEmail = async ({ to, subject, html, attachments, from, preferAuth }) => {
  try {
    const senderEmail =
      from ||
      (preferAuth === "hr" ? process.env.BREVO_FROM_HR : process.env.BREVO_FROM_SUPPORT);

    const payload = {
      sender: {
        name: process.env.BREVO_FROM_NAME,
        email: senderEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };

    if (attachments && attachments.length > 0) {
      payload.attachment = attachments.map((file) => {
        // Convert Buffer → base64 if needed
        const base64Content =
          Buffer.isBuffer(file.content)
            ? file.content.toString("base64")
            : file.content.replace(/^data:.*;base64,/, "");

        return {
          name: file.filename,
          content: base64Content,
        };
      });
    }

    const response = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
    });

    console.log("✅ Email sent successfully via Brevo:", response.data);
  } catch (error) {
    console.error("❌ Brevo email failed:", error.response?.data || error.message);
    throw new Error("Email sending failed: " + (error.response?.data?.message || error.message));
  }
};