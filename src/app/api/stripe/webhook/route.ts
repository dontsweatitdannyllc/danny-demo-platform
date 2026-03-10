import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripeClient } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'missing stripe-signature' }, { status: 400 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'missing STRIPE_WEBHOOK_SECRET' }, { status: 500 });

  const stripe = stripeClient();
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const sb = supabaseAdmin();

  console.log('[stripe-webhook]', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId = session.metadata?.tenant_id;
    const customerId = session.customer as string;
    console.log('[stripe-webhook] checkout.session.completed', { tenantId, customerId });

    // If checkout metadata includes content_slug, mark demo as claimed
    const contentSlug = session.metadata?.content_slug;
    if (contentSlug) {
      const { error: claimErr } = await sb
        .from('content_items')
        .update({ claimed: true, demo_mode: false })
        .eq('slug', contentSlug);
      if (claimErr) console.error('[stripe-webhook] claim update error', claimErr);
      else console.log('[stripe-webhook] demo claimed', contentSlug);
    }
    if (tenantId && customerId) {
      // tenant_id has a unique constraint — use it for conflict so retries
      // with a new Stripe customer update the row instead of failing.
      const { error: custErr } = await sb.from('stripe_customers').upsert(
        { tenant_id: tenantId, stripe_customer_id: customerId },
        { onConflict: 'tenant_id' },
      );
      if (custErr) console.error('[stripe-webhook] stripe_customers upsert error', custErr);
    }

    // checkout.session.completed with a subscription means payment succeeded.
    // Fetch the live subscription from Stripe and activate it directly,
    // so we don't depend on customer.subscription.updated arriving later.
    const subId = session.subscription;
    const resolvedSubId = typeof subId === 'string' ? subId : subId?.id;
    if (resolvedSubId && tenantId) {
      try {
        const liveSub = await stripe.subscriptions.retrieve(resolvedSubId);
        const priceId = liveSub.items.data[0]?.price?.id ?? null;
        const status = liveSub.status === 'incomplete' ? 'active' : liveSub.status;
        console.log('[stripe-webhook] checkout → activating sub', { resolvedSubId, stripeStatus: liveSub.status, writingStatus: status });
        const { error: subErr } = await sb.from('subscriptions').upsert(
          {
            tenant_id: tenantId,
            stripe_subscription_id: resolvedSubId,
            stripe_customer_id: customerId,
            status,
            current_period_end: liveSub.current_period_end
              ? new Date(liveSub.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: liveSub.cancel_at_period_end ?? false,
            price_id: priceId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_subscription_id' },
        );
        if (subErr) console.error('[stripe-webhook] checkout sub upsert error', subErr);
        else console.log('[stripe-webhook] checkout → sub activated', { tenantId, status });
      } catch (e: any) {
        console.error('[stripe-webhook] checkout → failed to retrieve sub', e.message);
      }
    }
  }

  const subEvents = new Set([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ]);

  if (subEvents.has(event.type)) {
    const sub = event.data.object as Stripe.Subscription;
    const priceId = sub.items.data[0]?.price?.id ?? null;
    console.log('[stripe-webhook]', event.type, { subId: sub.id, status: sub.status, customer: sub.customer });

    const { data: customerRow } = await sb
      .from('stripe_customers')
      .select('tenant_id')
      .eq('stripe_customer_id', sub.customer as string)
      .maybeSingle();

    if (customerRow?.tenant_id) {
      // Don't let a stale 'incomplete' event overwrite an already-active subscription.
      // This prevents the race where customer.subscription.created (incomplete) arrives
      // after checkout.session.completed already set the row to active.
      if (sub.status === 'incomplete') {
        const { data: existing } = await sb
          .from('subscriptions')
          .select('status')
          .eq('stripe_subscription_id', sub.id)
          .maybeSingle();
        if (existing?.status === 'active') {
          console.log('[stripe-webhook] skipping downgrade from active → incomplete', sub.id);
          return NextResponse.json({ received: true });
        }
      }

      const { error: upsertErr } = await sb.from('subscriptions').upsert(
        {
          tenant_id: customerRow.tenant_id,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer as string,
          status: sub.status,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          price_id: priceId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_subscription_id' },
      );
      if (upsertErr) console.error('[stripe-webhook] upsert error', upsertErr);
      else console.log('[stripe-webhook] upsert ok', { tenant: customerRow.tenant_id, status: sub.status });
    } else {
      console.warn('[stripe-webhook] no stripe_customers row for', sub.customer);
    }
  }

  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice;
    // Stripe API versions vary — subscription may be a string, object, or missing.
    // Fall back to the first line item's subscription field.
    const raw = (invoice as any).subscription;
    const subId: string | null =
      (typeof raw === 'string' ? raw : raw?.id) ||
      (invoice.lines?.data?.[0] as any)?.subscription ||
      null;
    const rawCust = (invoice as any).customer;
    const customerId: string | null = typeof rawCust === 'string' ? rawCust : rawCust?.id || null;
    console.log('[stripe-webhook]', event.type, { subId, customerId, rawSubType: typeof raw, rawSub: raw });

    if (subId) {
      const { error: updateErr } = await sb
        .from('subscriptions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subId);
      if (updateErr) console.error('[stripe-webhook] invoice update error', updateErr);
      else console.log('[stripe-webhook] invoice → set active for sub', subId);
    }
  }

  return NextResponse.json({ received: true });
}
