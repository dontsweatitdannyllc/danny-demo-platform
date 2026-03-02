import { NextRequest, NextResponse } from 'next/server';
import { stripeClient } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { tenant, priceId, returnUrl } = await req.json();
  if (!tenant || !priceId || !returnUrl) {
    return NextResponse.json({ error: 'tenant, priceId, returnUrl required' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: tenantRow, error: tErr } = await sb.from('tenants').select('*').eq('slug', tenant).single();
  if (tErr) return NextResponse.json({ error: 'tenant not found' }, { status: 404 });

  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?success=1`,
    cancel_url: `${returnUrl}?canceled=1`,
    metadata: { tenant_id: tenantRow.id, tenant_slug: tenantRow.slug },
  });

  return NextResponse.json({ url: session.url });
}
