// routes/zohoAuth.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

/**
 * One-time OAuth callback for Zoho (no one-time secret).
 * Use this only to obtain the refresh_token, then REMOVE or disable this route.
 *
 * Required ENV:
 *  - ZOHO_CLIENT_ID
 *  - ZOHO_CLIENT_SECRET
 *  - ZOHO_OAUTH_REGION  (https://accounts.zoho.com OR https://accounts.zoho.in)
 */

const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const OAUTH_REGION = process.env.ZOHO_OAUTH_REGION || "https://accounts.zoho.com";

// This must exactly match the redirect URI registered in Zoho console:
const REDIRECT_URI = "https://b-n-jai-mata-di-har-har-mahadev-jai.onrender.com/api/auth/zoho/callback";

router.get("/api/auth/zoho/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing "code" parameter.');

    const tokenUrl = `${OAUTH_REGION}/oauth/v2/token`;
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    });

    const tokenResp = await axios.post(tokenUrl, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000,
    });

    // Response contains access_token, refresh_token, expires_in, etc.
    console.log("✅ Zoho token response:", tokenResp.data);

    return res.status(200).json({
      message:
        "✅ Authorization successful. COPY the 'refresh_token' from 'tokens.refresh_token' and save it as ZOHO_REFRESH_TOKEN in Render environment. Then REMOVE or disable this route.",
      tokens: tokenResp.data,
    });
  } catch (err) {
    console.error("Zoho callback error:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Token exchange failed",
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;