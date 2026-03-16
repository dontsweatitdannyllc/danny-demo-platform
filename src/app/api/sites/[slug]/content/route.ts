import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

/** GET /api/sites/{slug}/content — returns editable content for a site */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('site_content')
    .select('slug,content,updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({
      slug,
      business_name: '',
      tagline: '',
      phone: '',
      email: '',
      address: '',
      hours: {},
      services: [],
      about: '',
      photos: [],
      reviews_display: [],
    })
  }

  return NextResponse.json({ slug, ...data.content, updated_at: data.updated_at })
}

/** PUT /api/sites/{slug}/content — save edits (requires owner_token) */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const token = req.headers.get('x-owner-token')

  if (!token) {
    return NextResponse.json({ error: 'missing x-owner-token header' }, { status: 401 })
  }

  const sb = supabaseAdmin()

  // Verify ownership
  const { data: item, error: itemErr } = await sb
    .from('content_items')
    .select('owner_token,claimed')
    .eq('slug', slug)
    .maybeSingle()

  if (itemErr) {
    return NextResponse.json({ error: itemErr.message }, { status: 500 })
  }
  if (!item || item.owner_token !== token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }
  if (!item.claimed) {
    return NextResponse.json({ error: 'site not claimed' }, { status: 403 })
  }

  const body = await req.json()
  // Strip slug and updated_at from incoming body — we control those
  const { slug: _s, updated_at: _u, ...content } = body

  const { error: upsertErr } = await sb
    .from('site_content')
    .upsert(
      { slug, content, updated_at: new Date().toISOString() },
      { onConflict: 'slug' },
    )

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, slug })
}
