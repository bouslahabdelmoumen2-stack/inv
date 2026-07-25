// api/verify-checkout.js
//
// Runs on the server only. Confirms with Chargily directly that a checkout was
// actually paid before the browser is allowed to reveal the invitation page —
// this is what stops someone from simply typing ?paid=1 in the address bar.
//
// The secret key is read ONLY from an environment variable — never hardcoded —
// so this file is safe even if it ends up somewhere public. Set
// CHARGILY_SECRET_KEY in your hosting provider's dashboard (see README.md).
//
// Uses Node's built-in "https" module instead of fetch(), for the same reason
// as create-checkout.js: it works on every Node runtime version, no exceptions.

const https = require('https');

const CHARGILY_SECRET_KEY = process.env.CHARGILY_SECRET_KEY;
const CHARGILY_HOST = 'pay.chargily.net';

function getChargilyCheckout(id) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CHARGILY_HOST,
      path: `/test/api/v2/checkouts/${encodeURIComponent(id)}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CHARGILY_SECRET_KEY}`
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
    req.end();
  });
}

module.exports = async (req, res) => {
  const id = req.query && req.query.id;
  if (!id) {
    res.status(400).json({ error: 'missing_id' });
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
    const result = await getChargilyCheckout(id);

    if (result.status < 200 || result.status >= 300) {
      res.status(result.status || 502).json({
        error: 'chargily_error',
        message: (result.data && (result.data.message || JSON.stringify(result.data))) || result.raw || 'Unknown Chargily error'
      });
      return;
    }

    // "status" is one of: pending | paid | failed | expired | canceled
    res.status(200).json({ status: result.data.status, id: result.data.id, amount: result.data.amount });
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: err.message, stack: err.stack });
  }
};
