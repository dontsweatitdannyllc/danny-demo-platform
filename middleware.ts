import { NextRequest, NextResponse } from 'next/server';

export const config = {
  // Apply to all non-static routes, including /c/* so subdomains can use /c/main directly.
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
      // If already rewritten, don't double-prefix
      if (!url.pathname.startsWith(`/t/${tenant}`)) {
        url.pathname = `/t/${tenant}${url.pathname}`;
      }
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}
