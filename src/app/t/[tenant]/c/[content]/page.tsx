import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { GateAndRender } from './GateAndRender';

async function getContent(tenantSlug: string, contentSlug: string) {
  const sb = supabaseAdmin();
  const { data: tenant, error: tErr } = await sb
    .from('tenants')
    .select('id,slug,name')
    .eq('slug', tenantSlug)
    .single();
  if (tErr) throw tErr;

  const { data: item, error: cErr } = await sb
    .from('content_items')
    .select('slug,title,r2_url')
    .eq('tenant_id', tenant.id)
    .eq('slug', contentSlug)
    .single();
  if (cErr) throw cErr;

  return { tenant, item };
}

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string; content: string }>;
}) {
  const { tenant, content } = await params;
  const { item } = await getContent(tenant, content);

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ margin: '8px 0 12px' }}>{item.title}</h1>
      <GateAndRender tenant={tenant} r2Url={item.r2_url} />
    </main>
  );
}
