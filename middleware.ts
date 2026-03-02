import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'dontsweatitdanny.com';
  const url = req.nextUrl;

  // tenant.domain
  if (host.endsWith(`.${domain}`)) {
    const tenant = host.replace(`.${domain}`, '');
    if (tenant && tenant !== 'www') {
      url.pathname = `/t/${tenant}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}
