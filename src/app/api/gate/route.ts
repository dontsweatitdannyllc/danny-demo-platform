import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
// gate config is inline in this route (time-based free preview)

export async function POST(req: NextRequest) {
  const { tenant } = await req.json();
  if (!tenant) return NextResponse.json({ error: 'tenant required' }, { status: 400 });

  const sb = supabaseAdmin();
  const jar = await cookies();
  let viewerId = jar.get('vw')?.value;
  if (!viewerId) viewerId = randomUUID();

  const { data: tenantRow, error: tErr } = await sb.from('tenants').select('*').eq('slug', tenant).single();
  if (tErr) return NextResponse.json({ error: 'tenant not found' }, { status: 404 });

  // active subscription?
  const { data: subs } = await sb
    .from('subscriptions')
    .select('id,status')
    .eq('tenant_id', tenantRow.id)
    .in('status', ['active', 'trialing'])
    .limit(1);

  const res = NextResponse.json({ allowed: true, remaining: 0, reason: 'subscribed', expiresAt: null });
  res.cookies.set('vw', viewerId, { httpOnly: true, sameSite: 'lax', path: '/' });

  if ((subs?.length || 0) > 0) return res;

  // Time-based free preview: once a viewer starts a preview, they get N hours access.
  const now = new Date();
  const FREE_PREVIEW_HOURS = parseInt(process.env.PAYWALL_FREE_PREVIEW_HOURS || '24', 10);
  const freePreviewMs = FREE_PREVIEW_HOURS * 60 * 60 * 1000;

  const { data: access } = await sb
    .from('viewer_access')
    .select('*')
    .eq('tenant_id', tenantRow.id)
    .eq('viewer_id', viewerId)
    .maybeSingle();

  // If no access row, start the preview window now.
  if (!access) {
    await sb.from('viewer_access').insert({
      tenant_id: tenantRow.id,
      viewer_id: viewerId,
      views: 1,
      first_view_at: now.toISOString(),
      last_view_at: now.toISOString(),
    });
    const expiresAt = new Date(now.getTime() + freePreviewMs).toISOString();
    return NextResponse.json({ allowed: true, remaining: 1, expiresAt }, { headers: res.headers });
  }

  const first = access.first_view_at ? new Date(access.first_view_at) : null;
  const startedAt = first || now;
  const stillInWindow = now.getTime() - startedAt.getTime() < freePreviewMs;

  if (stillInWindow) {
    await sb
      .from('viewer_access')
      .update({ last_view_at: now.toISOString(), updated_at: now.toISOString() })
      .eq('id', access.id);
    const expiresAt = new Date(startedAt.getTime() + freePreviewMs).toISOString();
    return NextResponse.json({ allowed: true, remaining: 1, expiresAt }, { headers: res.headers });
  }

  return NextResponse.json({ allowed: false, remaining: 0 }, { headers: res.headers });
}
