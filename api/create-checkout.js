// api/create-checkout.js
//
// Runs on the server (Vercel serverless function) — never in the browser.
// The secret key is read ONLY from an environment variable, never hardcoded here,
// so this file is safe to keep even if it ends up in a public place (e.g. a public
// GitHub repo). Set CHARGILY_SECRET_KEY in your hosting provider's dashboard —
// see README.md for the exact steps.

const CHARGILY_SECRET_KEY = process.env.CHARGILY_SECRET_KEY;
const CHARGILY_BASE_URL = 'https://pay.chargily.net/test/api/v2';

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

    const chargilyRes = await fetch(`${CHARGILY_BASE_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHARGILY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        currency,
        payment_method: 'edahabia',
        success_url,
        failure_url,
        locale,
        description
      })
    });

    const data = await chargilyRes.json();

    if (!chargilyRes.ok) {
      res.status(chargilyRes.status).json({ error: 'chargily_error', details: data });
      return;
    }

    // Only forward what the browser actually needs — never the full checkout object.
    res.status(200).json({ id: data.id, checkout_url: data.checkout_url });
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
};
