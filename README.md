Hello

## API rate limiting

The backend applies a Cloudflare Workers rate limit to all API requests: 300 requests per client IP per 60 seconds. Requests above the limit receive HTTP `429` with a `Retry-After: 60` header. Cloudflare's rate limit counters are approximate and tracked separately by Cloudflare location. The `RATE_LIMITER` binding is configured in `backend/wrangler.toml` and is also used by local Wrangler development.

## Cloudflare Turnstile

Contact inquiries, quote requests, and admin logins require a valid Cloudflare Turnstile response. Create a Turnstile widget for the public site and admin site hostnames (including localhost for development), then configure its site key in both frontend builds and its secret key in the backend. The secret key is only used by the backend and must never be added to a frontend environment variable.

- Frontend build: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (see `frontend/.env.example`)
- Admin build: `VITE_TURNSTILE_SITE_KEY` (see `admin/.env.example`)
- Backend: `TURNSTILE_SECRET_KEY` as a Worker secret; for local Wrangler development, copy `backend/.dev.vars.example` to `backend/.dev.vars` and set the key there

Set the backend secret with `npx wrangler secret put TURNSTILE_SECRET_KEY` from `backend/`. The API fails closed when the secret is missing, so set it before deploying the frontend or submissions and logins will be rejected.

## Customer quotation emails

Configure both Resend values as Worker secrets from `backend/`: `npx wrangler secret put RESEND_API_KEY` (paste your Resend API key when prompted) and `npx wrangler secret put RESEND_FROM_EMAIL` (enter a sender address on a domain verified in Resend, such as `Nilla Garden <quotes@your-verified-domain.com>`). The `onboarding@resend.dev` fallback is only suitable for Resend's restricted test sending and cannot deliver to arbitrary customer addresses. Deploy the backend after setting the secrets. Customer quotations are emailed with a PDF attachment; send errors are surfaced in the admin panel, and quotes are only marked sent after Resend confirms acceptance.
