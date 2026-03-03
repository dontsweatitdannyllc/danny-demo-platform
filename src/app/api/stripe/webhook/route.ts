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
    if (tenantId && customerId) {
      await sb.from('stripe_customers').upsert(
        { tenant_id: tenantId, stripe_customer_id: customerId },
        { onConflict: 'stripe_customer_id' },
      );
    }
  }

  // Mark subscription paid/active on invoice.paid (best signal that money actually moved)
  if (event.type === 'invoice.paid') {
    const inv = event.data.object as Stripe.Invoice;
    const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
    const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;

    if (subId && customerId) {
      // Find tenant via stripe_customers
      const { data: customerRow } = await sb
        .from('stripe_customers')
        .select('tenant_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

      if (customerRow?.tenant_id) {
        await sb.from('subscriptions').upsert({
          tenant_id: customerRow.tenant_id,
          stripe_subscription_id: subId,
          stripe_customer_id: customerId,
          status: 'active',
          updated_at: new Date().toISOString(),
        });
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
    const subId = invoice.subscription as string | null;
    const customerId = invoice.customer as string;
    console.log('[stripe-webhook]', event.type, { subId, customerId });

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
