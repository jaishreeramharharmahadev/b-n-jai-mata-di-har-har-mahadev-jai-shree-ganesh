// utils/sendEmail.js
require('dotenv').config();
const axios = require('axios');

const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_OAUTH_REGION = 'https://accounts.zoho.in',
  ZOHO_MAIL_API_BASE = 'https://mail.zoho.in',
  ZOHO_FROM_SUPPORT,
  ZOHO_FROM_HR,
  ZOHO_FROM_DEFAULT,
} = process.env;

if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
  console.warn('Zoho credentials missing: set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN');
}

// Exchange refresh token for access token and return access token
async function getAccessToken() {
  const tokenUrl = `${ZOHO_OAUTH_REGION}/oauth/v2/token`;
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    refresh_token: ZOHO_REFRESH_TOKEN,
  });

  const resp = await axios.post(tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
  });

  if (!resp.data || !resp.data.access_token) {
    throw new Error('Failed to obtain Zoho access_token: ' + JSON.stringify(resp.data));
  }

  return resp.data.access_token;
}

// Always use ZOHO_MAIL_API_BASE for Mail API calls (more reliable than token.api_domain)
function mailBase() {
  return ZOHO_MAIL_API_BASE; // e.g. https://mail.zoho.in or https://mail.zoho.com
}

// Get accountId for the authenticated user
async function getAccountId(accessToken) {
  const url = `${mailBase()}/api/accounts`;
  try {
    const resp = await axios.get(url, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }, timeout: 15000 });
    if (!Array.isArray(resp.data) || resp.data.length === 0) throw new Error('No Zoho accounts returned');
    const account = resp.data[0];
    const accountId = account.accountId || account.id || account.account_id;
    if (!accountId) throw new Error('Unable to read accountId from Zoho accounts API response');
    return accountId;
  } catch (err) {
    // Show helpful debug info
    const body = err.response?.data || err.message;
    console.error('Error calling Zoho /api/accounts:', body);
    throw new Error('Zoho /api/accounts failed: ' + (typeof body === 'string' ? body : JSON.stringify(body)));
  }
}

// Upload an attachment (base64 string) to Zoho and return metadata
async function uploadAttachment(accessToken, accountId, { filename, base64 }) {
  const url = `${mailBase()}/api/accounts/${accountId}/messages/attachments`;
  const FormData = require('form-data');
  const form = new FormData();
  const buffer = Buffer.from(base64, 'base64');
  form.append('file', buffer, { filename });

  const headers = Object.assign({ Authorization: `Zoho-oauthtoken ${accessToken}` }, form.getHeaders());
  const resp = await axios.post(url, form, { headers, timeout: 60000, maxContentLength: 50 * 1024 * 1024 });
  return resp.data;
}

// Send message using Zoho Mail API
async function sendEmail({ to, subject, html, text, attachments = [], from }) {
  if (!to || !subject) throw new Error("Missing 'to' or 'subject'");

  const accessToken = await getAccessToken();
  const accountId = await getAccountId(accessToken);

  const payload = {
    fromAddress: from || ZOHO_FROM_DEFAULT || ZOHO_FROM_SUPPORT || ZOHO_FROM_HR,
    toAddress: Array.isArray(to) ? to.join(',') : to,
    subject,
    content: html || text || '',
    mailFormat: html ? 'html' : 'plaintext',
  };

  if (attachments && attachments.length > 0) {
    payload.attachments = [];
    for (const att of attachments) {
      if (!att.filename) throw new Error('Attachment must include filename');
      let base64;
      if (typeof att.content === 'string') base64 = att.content;
      else if (Buffer.isBuffer(att.content)) base64 = att.content.toString('base64');
      else throw new Error('Attachment content must be base64 string or Buffer');

      const uploadResp = await uploadAttachment(accessToken, accountId, { filename: att.filename, base64 });
      // Normalize response
      const arr = Array.isArray(uploadResp) ? uploadResp : [uploadResp];
      for (const u of arr) {
        const storeName = u.storeName || u.store_name;
        const attachmentName = u.attachmentName || u.attachment_name || u.name;
        const attachmentPath = u.attachmentPath || u.attachment_path || u.path;
        if (storeName && attachmentName && attachmentPath) {
          payload.attachments.push({ storeName, attachmentName, attachmentPath });
        } else {
          payload.attachments.push(u);
        }
      }
    }
  }

  const sendUrl = `${mailBase()}/api/accounts/${accountId}/messages`;
  try {
    const resp = await axios.post(sendUrl, payload, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, 'Content-Type': 'application/json' },
      timeout: 20000,
    });
    return resp.data;
  } catch (err) {
    const body = err.response?.data || err.message;
    console.error('Zoho send message error:', body);
    throw new Error('Zoho send failed: ' + (typeof body === 'string' ? body : JSON.stringify(body)));
  }
}

module.exports = { sendEmail };