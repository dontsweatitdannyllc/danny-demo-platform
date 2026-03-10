import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const body = await req.json()
  const { slug, domain } = body

  if (!slug || !domain) {
    return NextResponse.json({ error: 'missing slug or domain' }, { status: 400 })
  }

  const sb = supabaseAdmin()

  const { error } = await sb
    .from('content_items')
    .update({ custom_domain: domain })
    .eq('slug', slug)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
