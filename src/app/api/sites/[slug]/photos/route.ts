import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'

/** POST /api/sites/{slug}/photos — upload a photo (requires owner_token) */
export async function POST(
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

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'no file provided' }, { status: 400 })
  }

  // Upload to Vercel Blob
  const blob = await put(`sites/${slug}/${Date.now()}-${file.name}`, file, {
    access: 'public',
  })

  return NextResponse.json({ url: blob.url })
}
