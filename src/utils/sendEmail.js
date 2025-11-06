// utils/sendEmail.js
require('dotenv').config();
const axios = require('axios');

const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_OAUTH_REGION = 'https://accounts.zoho.in', // you used .in
  ZOHO_MAIL_API_BASE = '', // optional fallback
  ZOHO_FROM_SUPPORT,
  ZOHO_FROM_HR,
  ZOHO_FROM_DEFAULT,
} = process.env;

if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
  console.warn('Zoho credentials missing: set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN');
}

// Exchange refresh token for access token (returns accessToken and apiDomain)
async function getAccessTokenAndApiDomain() {
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
    throw new Error('Failed to get Zoho access token: ' + JSON.stringify(resp.data));
  }

  const accessToken = resp.data.access_token;
  // Zoho sometimes returns api_domain in token response (your Postman response had api_domain)
  const apiDomain = resp.data.api_domain || ZOHO_MAIL_API_BASE || 'https://mail.zoho.in';
  return { accessToken, apiDomain };
}

// Get the first accountId for the authenticated user
async function getAccountId(accessToken, apiDomain) {
  const url = `${apiDomain}/api/accounts`;
  const resp = await axios.get(url, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }, timeout: 15000 });
  if (!Array.isArray(resp.data) || resp.data.length === 0) throw new Error('No Zoho accounts returned');
  // pick first
  const account = resp.data[0];
  // account may have accountId or id fields
  const accountId = account.accountId || account.id || account.account_id;
  if (!accountId) throw new Error('Unable to read accountId from Zoho accounts API response');
  return accountId;
}

// Upload a single attachment (buffer/base64) to Zoho and return upload metadata
async function uploadAttachment(accessToken, apiDomain, accountId, { filename, base64 }) {
  const url = `${apiDomain}/api/accounts/${accountId}/messages/attachments`;
  // Convert base64 string to binary Buffer
  const buffer = Buffer.from(base64, 'base64');

  // Use multipart/form-data via axios
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', buffer, { filename });

  const headers = Object.assign({ Authorization: `Zoho-oauthtoken ${accessToken}` }, form.getHeaders());
  const resp = await axios.post(url, form, { headers, timeout: 60000, maxContentLength: 50 * 1024 * 1024 });
  // Response shape may be object or array; return resp.data as-is
  return resp.data;
}

// Send message using Zoho Mail API
async function sendEmail({ to, subject, html, text, attachments = [], from }) {
  if (!to || !subject) throw new Error("Missing required 'to' or 'subject'");

  const { accessToken, apiDomain } = await getAccessTokenAndApiDomain();
  const accountId = await getAccountId(accessToken, apiDomain);

  // Prepare payload for send API
  const payload = {
    fromAddress: from || ZOHO_FROM_DEFAULT || ZOHO_FROM_SUPPORT || ZOHO_FROM_HR,
    toAddress: Array.isArray(to) ? to.join(',') : to,
    subject,
    content: html || text || '',
    mailFormat: html ? 'html' : 'plaintext',
  };

  // If attachments provided (expect base64 strings), upload them and attach
  if (attachments && attachments.length > 0) {
    payload.attachments = [];
    for (const att of attachments) {
      // Att can be { filename, content } where content may be base64 or Buffer
      if (!att.filename) throw new Error('Attachment objects must include filename');
      let base64;
      if (att.content && typeof att.content === 'string') {
        // assume base64 string
        base64 = att.content;
      } else if (att.content && Buffer.isBuffer(att.content)) {
        base64 = att.content.toString('base64');
      } else {
        throw new Error('Attachment content must be base64 string or Buffer');
      }
      const uploadResp = await uploadAttachment(accessToken, apiDomain, accountId, { filename: att.filename, base64 });
      // Normalise upload response to extract storeName/attachmentName/attachmentPath if present
      const arr = Array.isArray(uploadResp) ? uploadResp : [uploadResp];
      for (const u of arr) {
        const storeName = u.storeName || u.store_name;
        const attachmentName = u.attachmentName || u.attachment_name || u.name;
        const attachmentPath = u.attachmentPath || u.attachment_path || u.path;
        if (storeName && attachmentName && attachmentPath) {
          payload.attachments.push({ storeName, attachmentName, attachmentPath });
        } else {
          // If the response format is unexpected, include the whole object as-is
          payload.attachments.push(u);
        }
      }
    }
  }

  const sendUrl = `${apiDomain}/api/accounts/${accountId}/messages`;
  const resp = await axios.post(sendUrl, payload, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, 'Content-Type': 'application/json' },
    timeout: 20000,
  });

  return resp.data;
}

module.exports = { sendEmail };