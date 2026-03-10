import { NextResponse } from 'next/server'
import dns from 'dns/promises'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const domain = searchParams.get('domain')

  if (!domain) {
    return NextResponse.json({ error: 'missing domain' }, { status: 400 })
  }

  try {
    const records = await dns.resolveCname(domain)

    const valid = records.some(r => r.includes('dontsweatitdanny'))

    return NextResponse.json({ verified: valid, records })
  } catch (err: any) {
    return NextResponse.json({ verified: false, error: err.message })
  }
}
