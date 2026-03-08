import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { GateAndRender } from './GateAndRender';

export const dynamic = 'force-dynamic';

async function getContent(tenantSlug: string, contentSlug: string) {
  const sb = supabaseAdmin();
  const { data: tenant, error: tErr } = await sb
    .from('tenants')
    .select('id,slug,name')
    .eq('slug', tenantSlug)
    .single();

  if (tErr || !tenant) {
    console.error('[content-page] tenant not found:', tenantSlug, tErr?.message);
    return null;
  }

  const { data: item, error: cErr } = await sb
    .from('content_items')
    .select('slug,title,site_url')
    .eq('tenant_id', tenant.id)
    .eq('slug', contentSlug)
    .single();

  if (cErr || !item) {
    console.error('[content-page] content not found:', contentSlug, 'for tenant:', tenantSlug, cErr?.message);
    return null;
  }

  return { tenant, item };
}

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string; content: string }>;
}) {
  const { tenant, content } = await params;
  const result = await getContent(tenant, content);
  if (!result) return notFound();

  const { item } = result;

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ margin: '8px 0 12px' }}>{item.title}</h1>
      <GateAndRender tenant={tenant} siteUrl={item.site_url || ''} />
    </main>
  );
}
