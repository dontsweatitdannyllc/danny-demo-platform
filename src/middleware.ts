import { NextRequest, NextResponse } from 'next/server';

export const config = {
  // Apply to all non-static routes, including /c/* so subdomains can use /c/main directly.
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'dontsweatitdanny.com';
  const url = req.nextUrl;

  console.log('[middleware]', { host, domain, pathname: url.pathname, match: host.endsWith(`.${domain}`) });

  // Routes that live at the top level and should never be tenant-rewritten.
  const skipRewrite = ['/success'];

  // tenant.domain
  if (host.endsWith(`.${domain}`)) {
    const tenant = host.replace(`.${domain}`, '');
    if (tenant && tenant !== 'www' && !skipRewrite.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))) {
      // If already rewritten, don't double-prefix
      if (!url.pathname.startsWith(`/t/${tenant}`)) {
        url.pathname = `/t/${tenant}${url.pathname}`;
      }
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}
