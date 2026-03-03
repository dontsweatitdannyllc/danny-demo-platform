import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ContentRootRedirect({
  params,
}: {
  params: Promise<{ content: string }>;
}) {
  const { content } = await params;

  const host = (await headers()).get('host') || '';
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'dontsweatitdanny.com';

  let tenant = 'www';
  if (host.endsWith(`.${domain}`)) {
    tenant = host.replace(`.${domain}`, '');
  }

  // Redirect /c/<content> to the tenant-scoped path.
  redirect(`/t/${tenant}/c/${content}`);
}
