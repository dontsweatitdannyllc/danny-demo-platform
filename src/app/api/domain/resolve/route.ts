import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const host = searchParams.get('host')

  if (!host) return NextResponse.json({ error: 'missing host' }, { status: 400 })

  const sb = supabaseAdmin()

  const { data } = await sb
    .from('content_items')
    .select('slug')
    .eq('custom_domain', host)
    .maybeSingle()

  if (!data) return NextResponse.redirect('https://dontsweatitdanny.com')

  return NextResponse.redirect(
    `https://platform.dontsweatitdanny.com/t/${data.slug}`
  )
}
