Hello

## API rate limiting

The backend applies a Cloudflare Workers rate limit to all API requests: 300 requests per client IP per 60 seconds. Requests above the limit receive HTTP `429` with a `Retry-After: 60` header. Cloudflare's rate limit counters are approximate and tracked separately by Cloudflare location. The `RATE_LIMITER` binding is configured in `backend/wrangler.toml` and is also used by local Wrangler development.

## Cloudflare Turnstile

Contact inquiries, quote requests, and admin logins require a valid Cloudflare Turnstile response. Create a Turnstile widget for the public site and admin site hostnames (including localhost for development), then configure its site key in both frontend builds and its secret key in the backend. The secret key is only used by the backend and must never be added to a frontend environment variable.

- Frontend build: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (see `frontend/.env.example`)
- Admin build: `VITE_TURNSTILE_SITE_KEY` (see `admin/.env.example`)
- Backend: `TURNSTILE_SECRET_KEY` as a Worker secret; for local Wrangler development, copy `backend/.dev.vars.example` to `backend/.dev.vars` and set the key there

Set the backend secret with `npx wrangler secret put TURNSTILE_SECRET_KEY` from `backend/`. The API fails closed when the secret is missing, so set it before deploying the frontend or submissions and logins will be rejected.
