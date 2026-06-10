import { loadStripe } from '@stripe/stripe-js'

// Using Stripe test publishable key placeholder - replace with real key
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string || 'pk_test_placeholder'

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)

export const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string || 'demo_paypal_client_id'
