import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function corsHeaders(origin: string): Record<string, string> {
  if (origin !== 'https://demos.dontsweatitdanny.com') return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://demos.dontsweatitdanny.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(req: NextRequest) {
  const { tenant } = await req.json();
  if (!tenant) return NextResponse.json({ error: 'tenant required' }, { status: 400 });

  const origin = req.headers.get('origin') || '';
  const cors = corsHeaders(origin);
  const sb = supabaseAdmin();

  const { data: tenantRow, error: tErr } = await sb.from('tenants').select('id').eq('slug', tenant).single();
  if (tErr) return NextResponse.json({ error: 'tenant not found' }, { status: 404, headers: cors });

  const { data: subs } = await sb
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantRow.id)
    .in('status', ['active', 'trialing'])
    .limit(1);

  const subscribed = (subs?.length || 0) > 0;

  return NextResponse.json(
    { allowed: subscribed, reason: subscribed ? 'subscribed' : 'no_subscription' },
    { headers: cors },
  );
}
