import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') || '';
  const expected = process.env.ADMIN_SECRET || '';
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const slug = String(body.slug || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const r2_url = String(body.r2_url || '').trim();

  if (!slug || !name || !r2_url) {
    return NextResponse.json({ error: 'slug, name, r2_url required' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Upsert tenant
  const { data: tenantRows, error: tErr } = await sb
    .from('tenants')
    .upsert({ slug, name }, { onConflict: 'slug' })
    .select('id,slug,name');

  if (tErr || !tenantRows?.[0]) {
    return NextResponse.json({ error: 'tenant_upsert_failed', details: tErr?.message }, { status: 500 });
  }

  const tenant = tenantRows[0];

  // Upsert main content item
  const { data: contentRows, error: cErr } = await sb
    .from('content_items')
    .upsert(
      { tenant_id: tenant.id, slug: 'main', title: `${tenant.name} — Demo`, r2_url },
      { onConflict: 'tenant_id,slug' },
    )
    .select('id,slug,title,r2_url');

  if (cErr || !contentRows?.[0]) {
    return NextResponse.json({ error: 'content_upsert_failed', details: cErr?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tenant, content: contentRows[0] });
}
