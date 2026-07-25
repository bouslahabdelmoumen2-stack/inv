// api/create-checkout.js
//
// Runs on the server (Vercel serverless function) — never in the browser.
// The secret key is read ONLY from an environment variable, never hardcoded here,
// so this file is safe to keep even if it ends up in a public place (e.g. a public
// GitHub repo). Set CHARGILY_SECRET_KEY in your hosting provider's dashboard —
// see README.md for the exact steps.
//
// Uses Node's built-in "https" module instead of fetch(), since fetch is only
// global on newer Node runtimes — https works on every Node version Vercel offers,
// which removes an entire class of "works on my machine" failures.

const https = require('https');

const CHARGILY_SECRET_KEY = process.env.CHARGILY_SECRET_KEY;
const CHARGILY_HOST = 'pay.chargily.net';
const CHARGILY_PATH = '/test/api/v2/checkouts';

function callChargily(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: CHARGILY_HOST,
      path: CHARGILY_PATH,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHARGILY_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (e) { /* leave parsed as null */ }
        resolve({ status: res.statusCode, data: parsed, raw });
      });
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  if (!CHARGILY_SECRET_KEY) {
    res.status(500).json({
      error: 'missing_secret_key',
      message: 'CHARGILY_SECRET_KEY environment variable is not set on the server.'
    });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      amount = 500,
      currency = 'dzd',
      success_url,
      failure_url,
      locale = 'ar',
      description = 'Atelier Dawat invitation'
    } = body;

    if (!success_url) {
      res.status(400).json({ error: 'missing_success_url' });
      return;
    }

    const result = await callChargily({
      amount,
      currency,
      payment_method: 'edahabia',
      success_url,
      failure_url,
      locale,
      description
    });

    if (result.status < 200 || result.status >= 300) {
      res.status(result.status || 502).json({
        error: 'chargily_error',
        message: (result.data && (result.data.message || JSON.stringify(result.data))) || result.raw || 'Unknown Chargily error',
        details: result.data
      });
      return;
    }

    if (!result.data || !result.data.id || !result.data.checkout_url) {
      res.status(502).json({ error: 'unexpected_chargily_response', raw: result.raw });
      return;
    }

    // Only forward what the browser actually needs — never the full checkout object.
    res.status(200).json({ id: result.data.id, checkout_url: result.data.checkout_url });
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: err.message, stack: err.stack });
  }
};
