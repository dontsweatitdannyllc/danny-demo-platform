-- Enable UUIDs
create extension if not exists "pgcrypto";

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  title text not null,
  -- Legacy: originally used for static R2 HTML. We now also allow any URL.
  r2_url text,
  -- Preferred: where to send the user after the paywall (e.g. Vercel deployment URL)
  site_url text,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists public.stripe_customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  price_id text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_tenant_status_idx
  on public.subscriptions (tenant_id, status);

create table if not exists public.viewer_access (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  viewer_id text not null,
  views int not null default 0,
  first_view_at timestamptz,
  last_view_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tenant_id, viewer_id)
);

create index if not exists viewer_access_tenant_viewer_idx
  on public.viewer_access (tenant_id, viewer_id);
