// routes/zohoAuth.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const OAUTH_REGION = process.env.ZOHO_OAUTH_REGION || 'https://accounts.zoho.in';
const ONE_TIME_SECRET = process.env.ZOHO_ONE_TIME_SECRET || null;

// ✅ This callback URL must match the one added in Zoho Console
const REDIRECT_URI = 'https://b-n-jai-mata-di-har-har-mahadev-jai.onrender.com/api/auth/zoho/callback';

router.get('/api/auth/zoho/callback', async (req, res) => {
  try {
    if (ONE_TIME_SECRET) {
      const supplied = req.query.secret;
      if (!supplied || supplied !== ONE_TIME_SECRET) {
        return res.status(403).send('Forbidden: invalid secret');
      }
    }

    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code parameter');

    const tokenUrl = `${OAUTH_REGION}/oauth/v2/token`;
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    });

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    res.json({
      message: '✅ Copy the "refresh_token" below and save it in your Render environment.',
      tokens: response.data,
      note: 'After saving the refresh token, you can delete this route for security.',
    });
  } catch (error) {
    console.error('Zoho OAuth error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Token exchange failed',
      details: error.response?.data || error.message,
    });
  }
});

module.exports = router;