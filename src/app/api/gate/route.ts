import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { gateConfig } from '@/lib/gate';

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

  const res = NextResponse.json({ allowed: true, remaining: 0, reason: 'subscribed' });
  res.cookies.set('vw', viewerId, { httpOnly: true, sameSite: 'lax', path: '/' });

  if ((subs?.length || 0) > 0) return res;

  const { FREE_VIEWS, cooldownMs } = gateConfig();
  const now = new Date();

  const { data: access } = await sb
    .from('viewer_access')
    .select('*')
    .eq('tenant_id', tenantRow.id)
    .eq('viewer_id', viewerId)
    .maybeSingle();

  if (!access) {
    await sb.from('viewer_access').insert({
      tenant_id: tenantRow.id,
      viewer_id: viewerId,
      views: 1,
      first_view_at: now.toISOString(),
      last_view_at: now.toISOString(),
    });
    res.headers.set('x-gate', 'new');
    return NextResponse.json({ allowed: true, remaining: FREE_VIEWS - 1 }, { headers: res.headers });
  }

  const last = access.last_view_at ? new Date(access.last_view_at) : null;
  const cooledDown = !last || now.getTime() - last.getTime() > cooldownMs;
  let views = access.views ?? 0;
  if (cooledDown) views = 0;

  if (views < FREE_VIEWS) {
    const nextViews = views + 1;
    await sb
      .from('viewer_access')
      .update({ views: nextViews, last_view_at: now.toISOString(), updated_at: now.toISOString() })
      .eq('id', access.id);
    return NextResponse.json({ allowed: true, remaining: Math.max(0, FREE_VIEWS - nextViews) }, { headers: res.headers });
  }

  return NextResponse.json({ allowed: false, remaining: 0 }, { headers: res.headers });
}
