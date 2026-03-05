import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

function requireAdmin(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') || '';
  const expected = process.env.ADMIN_SECRET || '';
  if (!expected || secret !== expected) return false;
  return true;
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get('slug') || '').trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb.from('demo_generations').select('*').eq('slug', slug).maybeSingle();
  if (error) return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, generation: data || null });
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return unauthorized();

  const body = await req.json();
  const slug = String(body.slug || '').trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const patch = {
    slug,
    v0_project_id: body.v0_project_id ?? null,
    v0_chat_id: body.v0_chat_id ?? null,
    v0_version_id: body.v0_version_id ?? null,
    prompt_hash: body.prompt_hash ?? null,
    updated_at: new Date().toISOString(),
  };

  const sb = supabaseAdmin();
  const { data, error } = await sb.from('demo_generations').upsert(patch, { onConflict: 'slug' }).select('*');
  if (error || !data?.[0]) {
    return NextResponse.json({ error: 'db_error', details: error?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, generation: data[0] });
}
