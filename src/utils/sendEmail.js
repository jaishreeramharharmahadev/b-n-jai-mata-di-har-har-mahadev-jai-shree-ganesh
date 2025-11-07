import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

/**
 * Send email using Brevo
 * Supports both simple emails and emails with attachments (like PDF offer letter)
 */
export const sendEmail = async ({ to, subject, html, attachments, from, preferAuth }) => {
  try {
    const senderEmail =
      from ||
      (preferAuth === "hr" ? process.env.BREVO_FROM_HR : process.env.BREVO_FROM_SUPPORT);

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: process.env.BREVO_FROM_NAME,
          email: senderEmail,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        attachments: attachments
          ? attachments.map((file) => ({
              name: file.filename,
              content: file.content, // base64 encoded
            }))
          : undefined,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
        },
      }
    );

    console.log("✅ Email sent successfully via Brevo:", response.data);
  } catch (error) {
    console.error("❌ Brevo email failed:", error.response?.data || error.message);
    throw new Error("Email sending failed: " + (error.response?.data?.message || error.message));
  }
};