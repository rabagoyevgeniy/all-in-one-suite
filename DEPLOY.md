# All-In-One Suite — Deployment Guide

## Prerequisites

- [Vercel](https://vercel.com) account (free tier is sufficient for beta)
- [Supabase](https://supabase.com) project (already configured)
- [Stripe](https://stripe.com) account with API keys
- GitHub repository connected to Vercel

---

## Step 1: Supabase Production Checklist

### 1.1 Verify RLS (Row Level Security)

All tables must have RLS enabled. Run this query in Supabase SQL Editor to check:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Every table should show `rowsecurity = true`. If any table shows `false`, enable it:

```sql
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
```

### 1.2 Set Edge Function Secrets

Run these commands via Supabase CLI (install: `npm i -g supabase`):

```bash
# Link to your project
supabase link --project-ref vkmbtsfxblulzojgtfbq

# Set secrets for edge functions
supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_KEY
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase secrets set OPENAI_API_KEY=sk-YOUR_KEY
supabase secrets set PERPLEXITY_API_KEY=pplx-YOUR_KEY
```

### 1.3 Deploy Edge Functions

```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy ai-chat
supabase functions deploy perplexity-research
supabase functions deploy notify-lesson-reminders
supabase functions deploy seed-data
```

### 1.4 Configure Stripe Webhook

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://vkmbtsfxblulzojgtfbq.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the webhook signing secret and set it via `supabase secrets set`

### 1.5 Supabase Auth Settings

In Supabase Dashboard > Authentication > URL Configuration:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: Add `https://your-app.vercel.app/auth/reset-password`

In Authentication > Email Templates:
- Update the "Reset Password" template link to point to your production URL

---

## Step 2: Deploy to Vercel

### 2.1 Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository: `rabagoyevgeniy/all-in-one-suite`
3. Vercel will auto-detect the Vite framework

### 2.2 Set Environment Variables

In Vercel Project Settings > Environment Variables, add:

| Variable | Value | Environment |
|---|---|---|
| `VITE_SUPABASE_PROJECT_ID` | `vkmbtsfxblulzojgtfbq` | Production, Preview |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your anon key | Production, Preview |
| `VITE_SUPABASE_URL` | `https://vkmbtsfxblulzojgtfbq.supabase.co` | Production, Preview |

### 2.3 Deploy

Click "Deploy". Vercel will:
1. Run `pnpm install`
2. Run `pnpm build`
3. Deploy the `dist/` folder to CDN

### 2.4 Custom Domain (Optional)

1. Go to Project Settings > Domains
2. Add your domain (e.g., `app.swimacademy.com`)
3. Follow DNS instructions

---

## Step 3: Post-Deploy Verification

### 3.1 Smoke Test Checklist

- [ ] Landing page loads correctly
- [ ] Login/registration works
- [ ] Password reset email sends and link works
- [ ] Parent dashboard loads with pricing plans
- [ ] Booking flow works end-to-end
- [ ] Payment via Stripe processes correctly
- [ ] Coach dashboard shows schedule
- [ ] Student dashboard shows gamification
- [ ] Chat messaging works
- [ ] Push notifications (PWA install prompt appears)
- [ ] All role dashboards accessible (admin, coach, parent, student, pro, PM)

### 3.2 Performance Check

- [ ] Lighthouse score > 80 on mobile
- [ ] First Contentful Paint < 2s
- [ ] No console errors in production

---

## Step 4: Seed Test Data (Optional)

If you need demo data for testing, invoke the seed-data edge function:

```bash
curl -X POST https://vkmbtsfxblulzojgtfbq.supabase.co/functions/v1/seed-data \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| White screen after deploy | Check browser console; likely missing env vars |
| 404 on page refresh | Verify `vercel.json` rewrites are deployed |
| Stripe payments fail | Check edge function secrets and webhook URL |
| Auth redirect fails | Update Site URL in Supabase Auth settings |
| Edge functions timeout | Check Supabase function logs in dashboard |
