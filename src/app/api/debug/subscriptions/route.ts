import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const secret = process.env.DEBUG_SECRET;
  if (!secret || req.nextUrl.searchParams.get('secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tenant = req.nextUrl.searchParams.get('tenant');
  if (!tenant) return NextResponse.json({ error: 'tenant param required' }, { status: 400 });

  const sb = supabaseAdmin();

  const { data: tenantRow, error: tErr } = await sb
    .from('tenants')
    .select('id,slug,name')
    .eq('slug', tenant)
    .maybeSingle();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!tenantRow) return NextResponse.json({ error: 'tenant not found', slug: tenant }, { status: 404 });

  const { data: customers } = await sb
    .from('stripe_customers')
    .select('*')
    .eq('tenant_id', tenantRow.id);

  const { data: subs } = await sb
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantRow.id)
    .order('updated_at', { ascending: false });

  return NextResponse.json({ tenant: tenantRow, stripe_customers: customers, subscriptions: subs });
}
