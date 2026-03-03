import { NextRequest, NextResponse } from 'next/server';
import { stripeClient } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { tenant, priceId, returnUrl } = await req.json();
    if (!tenant || !priceId || !returnUrl) {
      return NextResponse.json({ error: 'tenant, priceId, returnUrl required' }, { status: 400 });
    }

    const missing: string[] = [];
    if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (missing.length) {
      return NextResponse.json({ error: 'missing env vars', missing }, { status: 500 });
    }

    const sb = supabaseAdmin();
    const { data: tenantRow, error: tErr } = await sb.from('tenants').select('*').eq('slug', tenant).single();
    if (tErr) return NextResponse.json({ error: 'tenant not found' }, { status: 404 });

    const stripe = stripeClient();
    const platformOrigin = process.env.NEXT_PUBLIC_PLATFORM_ORIGIN || 'https://platform.dontsweatitdanny.com';
    const success_url = `${platformOrigin}/success?tenant=${encodeURIComponent(tenantRow.slug)}&return=${encodeURIComponent(returnUrl)}`;
    const cancel_url = `${returnUrl}?canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      metadata: { tenant_id: tenantRow.id, tenant_slug: tenantRow.slug },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'checkout_failed',
        message: e?.message || String(e),
      },
      { status: 500 },
    );
  }
}
