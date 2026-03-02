import Stripe from 'stripe';

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}
