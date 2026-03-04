import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const VERCEL_API = 'https://api.vercel.com';

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function vercelFetch(path: string, init: RequestInit = {}) {
  const token = requireEnv('VERCEL_TOKEN');
  const res = await fetch(`${VERCEL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    throw new Error(`Vercel API ${res.status} ${path}: ${text.slice(0, 300)}`);
  }
  return json;
}

async function ensureProject({ projectName, githubOwner, githubRepo }: { projectName: string; githubOwner: string; githubRepo: string }) {
  // 1) Does it exist?
  try {
    return await vercelFetch(`/v9/projects/${encodeURIComponent(projectName)}`);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!msg.includes(' 404 ')) throw e;
  }

  // 2) Create it (personal account; no teamId)
  return vercelFetch('/v9/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: projectName,
      framework: 'nextjs',
      gitRepository: {
        type: 'github',
        repo: `${githubOwner}/${githubRepo}`,
      },
    }),
  });
}

async function ensureAlias({ projectName, alias }: { projectName: string; alias: string }) {
  // Create alias pointing at project.
  // Docs: POST /v2/aliases
  return vercelFetch('/v2/aliases', {
    method: 'POST',
    body: JSON.stringify({ alias, project: projectName }),
  });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') || '';
  const expected = process.env.ADMIN_SECRET || '';
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const slug = String(body.slug || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const githubOwner = String(body.github_owner || '').trim();
  const githubRepo = String(body.github_repo || '').trim();

  if (!slug || !name || !githubOwner || !githubRepo) {
    return NextResponse.json({ error: 'slug, name, github_owner, github_repo required' }, { status: 400 });
  }

  const domain = requireEnv('DEMO_WILDCARD_DOMAIN'); // e.g. demos.dontsweatitdanny.com
  const projectName = `demo-${slug}`;
  const alias = `${slug}.${domain}`;
  const siteUrl = `https://${alias}`;

  // 1) Ensure Vercel project exists and is linked to the GitHub repo
  await ensureProject({ projectName, githubOwner, githubRepo });

  // 2) Ensure alias exists in Vercel
  try {
    await ensureAlias({ projectName, alias });
  } catch (e: any) {
    // If alias already exists, Vercel returns an error. Treat as ok.
    const msg = String(e?.message || e);
    if (!msg.toLowerCase().includes('already') && !msg.toLowerCase().includes('exists')) {
      throw e;
    }
  }

  // 2) Upsert tenant + content item in Supabase
  const sb = supabaseAdmin();

  const { data: tenantRows, error: tErr } = await sb
    .from('tenants')
    .upsert({ slug, name }, { onConflict: 'slug' })
    .select('id,slug,name');

  if (tErr || !tenantRows?.[0]) {
    return NextResponse.json({ error: 'tenant_upsert_failed', details: tErr?.message }, { status: 500 });
  }

  const tenant = tenantRows[0];

  const { data: contentRows, error: cErr } = await sb
    .from('content_items')
    .upsert(
      { tenant_id: tenant.id, slug: 'main', title: `${tenant.name} — Demo`, site_url: siteUrl, r2_url: null },
      { onConflict: 'tenant_id,slug' },
    )
    .select('id,slug,title,r2_url,site_url');

  if (cErr || !contentRows?.[0]) {
    return NextResponse.json({ error: 'content_upsert_failed', details: cErr?.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    slug,
    alias,
    site_url: siteUrl,
    paywall_url: `https://${slug}.${process.env.NEXT_PUBLIC_APP_DOMAIN || 'dontsweatitdanny.com'}/c/main`,
    tenant,
    content: contentRows[0],
  });
}
