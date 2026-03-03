# danny-demo-platform

MVP paywalled demo platform:
- Wildcard subdomains: `*.dontsweatitdanny.com`
- 2 free views per viewer (cookie-based) then paywall
- Stripe subscription checkout: $20/mo or $200/yr
- Demo content served via iframe from Cloudflare R2 CDN URL
- Data stored in Supabase (Postgres)

## Setup

1) Create tables in Supabase by running `supabase.sql` in the SQL editor.

2) Configure env vars in Vercel (and locally if running `npm run dev`):

**Required (runtime):**
- `NEXT_PUBLIC_APP_DOMAIN=dontsweatitdanny.com`
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

**Stripe:**
- `STRIPE_SECRET_KEY=...`
- `STRIPE_WEBHOOK_SECRET=...` (can add after you create the webhook endpoint)
- `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_...`
- `NEXT_PUBLIC_STRIPE_PRICE_YEARLY=price_...`

**Paywall behavior:**
- `PAYWALL_FREE_VIEWS=2`
- `PAYWALL_COOLDOWN_HOURS=24`

**Admin (optional):**
- `ADMIN_SECRET=...` (protects `/api/admin/create-demo`)

3) Seed a demo:
- Insert into `tenants` (slug = subdomain)
- Insert into `content_items` with `slug='main'` and `r2_url='https://cdn.../<tenant>/index.html'`

Then visit:
- `https://<tenant>.dontsweatitdanny.com/c/main`

## Notes
- This MVP uses a lightweight cookie gate. It’s not meant to stop a determined attacker.
- Webhook is the source of truth for subscription status.
