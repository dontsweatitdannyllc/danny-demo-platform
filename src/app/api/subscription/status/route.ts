import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const tenant = req.nextUrl.searchParams.get('tenant');
  if (!tenant) return NextResponse.json({ error: 'tenant required' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: tenantRow, error: tErr } = await sb.from('tenants').select('id,slug').eq('slug', tenant).single();
  if (tErr) return NextResponse.json({ error: 'tenant not found' }, { status: 404 });

  const { data: subs, error: sErr } = await sb
    .from('subscriptions')
    .select('status,current_period_end,cancel_at_period_end,price_id,updated_at')
    .eq('tenant_id', tenantRow.id)
    .in('status', ['active', 'trialing'])
    .order('updated_at', { ascending: false })
    .limit(1);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const active = (subs?.length || 0) > 0;
  return NextResponse.json({ tenant: tenantRow.slug, active, subscription: subs?.[0] || null });
}
