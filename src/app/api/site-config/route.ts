import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const token = searchParams.get('token')

  if (!slug) {
    return NextResponse.json({ error: 'missing slug' }, { status: 400 })
  }

  const sb = supabaseAdmin()

  const { data, error } = await sb
    .from('content_items')
    .select('claimed,demo_mode,custom_domain,owner_token,site_url')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ claimed: false, demo_mode: true, edit_mode: false, owner_token: null })
  }

  // edit_mode is true when the request includes a valid owner token
  const edit_mode = !!(data.claimed && token && data.owner_token === token)

  return NextResponse.json({
    claimed: data.claimed,
    demo_mode: data.demo_mode,
    custom_domain: data.custom_domain,
    site_url: data.site_url,
    edit_mode,
    owner_token: edit_mode ? data.owner_token : null,
  })
}
