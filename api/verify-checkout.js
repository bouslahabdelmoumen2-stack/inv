// api/verify-checkout.js
//
// Runs on the server only. Confirms with Chargily directly that a checkout was
// actually paid before the browser is allowed to reveal the invitation page —
// this is what stops someone from simply typing ?paid=1 in the address bar.
//
// The secret key is read ONLY from an environment variable — never hardcoded —
// so this file is safe even if it ends up somewhere public. Set
// CHARGILY_SECRET_KEY in your hosting provider's dashboard (see README.md).

const CHARGILY_SECRET_KEY = process.env.CHARGILY_SECRET_KEY;
const CHARGILY_BASE_URL = 'https://pay.chargily.net/test/api/v2';

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
    const chargilyRes = await fetch(`${CHARGILY_BASE_URL}/checkouts/${encodeURIComponent(id)}`, {
      headers: { 'Authorization': `Bearer ${CHARGILY_SECRET_KEY}` }
    });
    const data = await chargilyRes.json();

    if (!chargilyRes.ok) {
      res.status(chargilyRes.status).json({ error: 'chargily_error', details: data });
      return;
    }

    // "status" is one of: pending | paid | failed | expired | canceled
    res.status(200).json({ status: data.status, id: data.id, amount: data.amount });
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
};
