# SlideCrux Operations Manual

## Credentials & Services
| Service | URL | Login | Notes |
|---|---|---|---|
| Supabase | app.supabase.com | [email] | Project: slidecrux |
| Vercel | vercel.com | [email] | Team: personal |
| Lemon Squeezy | lemonsqueezy.com | [email] | Store: SlideCrux |
| OpenRouter | openrouter.ai | [email] | API key in Supabase secrets |
| Umami | cloud.umami.is | [email] | Website: slidecrux.com |
| Porkbun | porkbun.com | [email] | Domain: slidecrux.com |
| GitHub | github.com | [user] | Repo: slidecrux |

## Environment Variables
### Vercel (Frontend)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_LEMON_STORE_ID
- VITE_LEMON_PRO_VARIANT_ID
- VITE_LEMON_TEAM_VARIANT_ID
- VITE_GOOGLE_CLIENT_ID

### Supabase Edge Functions (Secrets)
- OPENROUTER_API_KEY
- LEMON_SQUEEZY_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY

## Cron Jobs
- Monthly quota reset: `reset-quotas` via pg_cron, daily at 00:10 UTC

## Monthly Maintenance Tasks
1. Check OpenRouter balance (should auto-top-up)
2. Review Umami analytics dashboard
3. Monitor Supabase usage (DB size, Edge Function invocations)
4. Review Lemon Squeezy failed payments → retry or cancel
