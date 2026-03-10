import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'missing slug' }, { status: 400 })
  }

  const sb = supabaseAdmin()

  const { data, error } = await sb
    .from('content_items')
    .select('claimed,demo_mode,custom_domain')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ claimed: false, demo_mode: true })
  }

  return NextResponse.json(data)
}
