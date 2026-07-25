# Atelier Dawat — Luxury Wedding Invitation Creator + Chargily Pay

## What's in this folder
- `index.html` — the whole app (builder, live preview, invitation pages).
- `api/create-checkout.js` — creates a 500 DZD Chargily checkout. Reads the secret key from an environment variable — **no key is written in the file itself.**
- `api/verify-checkout.js` — confirms with Chargily that a checkout was really paid before the invitation unlocks. Same rule: env var only.
- `.env.example` — shows which variable to set. Copy it to `.env` for local testing only.
- `.gitignore` — makes sure your real `.env` (with the real key) never gets committed by accident.

## 🔒 Is it safe to publish / push these files?
**Yes, exactly because of how they're written now.** Neither `api/create-checkout.js` nor `api/verify-checkout.js` contains the secret key as text anymore — they only read it from `process.env.CHARGILY_SECRET_KEY`, which lives in your hosting provider's settings, not in the code. So:
- Pushing this folder to a **public GitHub repo** is fine — there's nothing secret inside it to leak.
- The only thing you must never commit is a real `.env` file containing the actual key. The included `.gitignore` already blocks that automatically.
- `index.html` never touches the secret key at all — it only calls your two `/api/...` endpoints, same as before.

If you ever paste the key directly into a file again (instead of an env var) and push that file publicly, *that* would expose it — but as delivered now, that risk is removed.

## Deploy safely (Vercel, free, ~2 minutes)
1. Install the CLI once: `npm i -g vercel`
2. From this folder, run: `vercel`
3. Vercel auto-detects the `api/` folder as serverless functions and serves `index.html` as the static site.
4. Set the secret key **in Vercel, not in the code**:
   - Dashboard: Project → Settings → Environment Variables → add `CHARGILY_SECRET_KEY` with your key → redeploy.
   - Or via CLI: `vercel env add CHARGILY_SECRET_KEY` (paste the key when prompted), then `vercel --prod`.

Any other Node-friendly host (Netlify Functions, Cloudflare Pages Functions, etc.) works the same way: keep the two functions server-side, set the same environment variable there, and point the two `fetch('/api/...')` calls in `index.html` at wherever you host them.

## Test mode notes
- These are **test** Chargily keys — no real money moves. Chargily's sandbox checkout page lets you simulate a successful or failed EDAHABIA/CIB payment.
- Base URL used: `https://pay.chargily.net/test/api/v2/`. Switch to `https://pay.chargily.net/api/v2/` and your **live** keys (same env-var approach) when you're ready for real payments.
- Amount is fixed at 500 DZD per invitation link, set in `index.html` (`PAY_AMOUNT_DZD`).

## If the payment button shows an error
- `missing_secret_key` → you deployed without setting `CHARGILY_SECRET_KEY` in your host's environment variables. Add it and redeploy.
- Any other error → the two `/api` functions aren't reachable yet (e.g. you opened `index.html` locally as a plain file, or haven't deployed). The builder and live preview still work fully offline either way; only the paid checkout step needs the two server functions live.
