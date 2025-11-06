// routes/zohoAuth.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * One-time OAuth callback for Zoho.
 * After you get refresh_token, copy it and add to Render env variables,
 * then REMOVE or protect this route.
 *
 * Required env:
 *  - ZOHO_CLIENT_ID
 *  - ZOHO_CLIENT_SECRET
 *  - ZOHO_OAUTH_REGION (https://accounts.zoho.com OR https://accounts.zoho.in)
 */

const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const OAUTH_REGION = process.env.ZOHO_OAUTH_REGION || 'https://accounts.zoho.com';

// Optional simple protection: require a one-time secret you set as env
// (prevents anyone from exchanging codes on your public endpoint).
// Set ZOHO_ONE_TIME_SECRET in env and pass ?secret=thatvalue when calling the auth URL.
// Remove or change to stronger protection in production.
const ONE_TIME_SECRET = process.env.ZOHO_ONE_TIME_SECRET || null;

router.get('/api/auth/zoho/callback', async (req, res) => {
  try {
    // optional one-time secret check
    if (ONE_TIME_SECRET) {
      const supplied = req.query.secret;
      if (!supplied || supplied !== ONE_TIME_SECRET) {
        return res.status(403).send('Forbidden: missing or invalid secret query param.');
      }
    }

    const code = req.query.code;
    if (!code) return res.status(400).send('Missing "code" in query string.');

    const tokenUrl = `${OAUTH_REGION}/oauth/v2/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    // redirect_uri must exactly match the one registered in Zoho
    params.append('redirect_uri', 'https://b-n-jai-mata-di-har-har-mahadev-jai.onrender.com/api/auth/zoho/callback');
    params.append('code', code);

    const tokenResp = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 20000,
    });

    // tokenResp.data contains access_token, refresh_token, expires_in...
    // Show JSON in the browser so you can copy refresh_token
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send({
      message: 'Tokens retrieved. COPY "refresh_token" immediately and store as Render secret ZOHO_REFRESH_TOKEN.',
      tokens: tokenResp.data,
      note: 'After copying the refresh_token to Render env, REMOVE or disable this route for safety.',
    });
  } catch (err) {
    console.error('Zoho callback error:', err && err.response && err.response.data ? err.response.data : err.message || err);
    const body = err && err.response && err.response.data ? err.response.data : { error: err.message || String(err) };
    return res.status(500).json({ error: 'Token exchange failed', details: body });
  }
});

module.exports = router;