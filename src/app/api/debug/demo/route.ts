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
  if (!tenantRow) return NextResponse.json({ found: false, slug: tenant }, { status: 404 });

  const { data: content, error: cErr } = await sb
    .from('content_items')
    .select('id,slug,title,site_url')
    .eq('tenant_id', tenantRow.id)
    .eq('slug', 'main')
    .maybeSingle();

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  return NextResponse.json({
    found: true,
    tenant: tenantRow,
    content: content ?? null,
    has_site_url: !!content?.site_url,
  });
}
