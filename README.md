# paul-nextjs-real-estate-platform

## Vercel deployment

This project is set up to deploy the Vite frontend and the Hono API together on Vercel.

Before deploying, make sure the project is linked:

```bash
vercel link
```
 
Then sync the required local env vars from `.env.local` into the linked Vercel project:

```bash
npm run vercel:env:sync
```

That script pushes these values to both `production` and `preview` when they exist locally:

- `DATABASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_JWT_SECRET`
- `VITE_API_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_PAYPAL_CLIENT_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME`

`VITE_API_URL` is optional when the frontend and API are deployed together on Vercel, because the client can call the same-origin `/api` routes directly.

Booking confirmations are now sent from the API after a successful Stripe or PayPal payment. The server uses Resend for transactional email delivery and includes the admin contact email from Settings as the internal confirmation recipient.

After the env vars are synced, deploy with:

```bash
vercel deploy --prod
```

## Development

```bash
npm install
npm run dev
```

The local dev server starts the Vite app and the API server together.
