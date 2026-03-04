'use client';

import { useEffect, useMemo, useState } from 'react';

import { Paywall } from './Paywall';

type GateResult = { allowed: boolean; remaining?: number; expiresAt?: string | null };

export function GateAndRender({ tenant, r2Url, siteUrl }: { tenant: string; r2Url: string; siteUrl: string }) {
  const [state, setState] = useState<{ loading: boolean; allowed: boolean; remaining: number; expiresAt: string | null }>({
    loading: true,
    allowed: false,
    remaining: 0,
    expiresAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenant }),
      });
      const json = (await res.json()) as GateResult;
      if (cancelled) return;
      setState({ loading: false, allowed: !!json.allowed, remaining: json.remaining ?? 0, expiresAt: (json.expiresAt ?? null) as any });
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant]);

  const monthly = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
  const yearly = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY;

  // Helpful debug: shows whether the client actually received the env vars.
  const showDebug = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').has('debug');

  const returnUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href.split('?')[0];
  }, []);

  async function checkout(priceId: string) {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant, priceId, returnUrl }),
    });
    const json = await res.json();
    if (json.url) window.location.href = json.url;
  }

  if (state.loading) return <p>Loading…</p>;

  if (!state.allowed) {
    return (
      <div>
        {showDebug ? (
          <pre style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 10, overflowX: 'auto' }}>
            {JSON.stringify({ monthly, yearly }, null, 2)}
          </pre>
        ) : null}
        <Paywall
          monthlyEnabled={!!monthly}
          yearlyEnabled={!!yearly}
          onMonthly={() => monthly && checkout(monthly)}
          onYearly={() => yearly && checkout(yearly)}
          expiresAt={state.expiresAt}
        />
      </div>
    );
  }

  // Clean long-term: redirect to the hosted site (no iframe).
  if (siteUrl) {
    if (typeof window !== 'undefined') {
      window.location.href = siteUrl;
    }
    return <p>Redirecting…</p>;
  }

  // Legacy fallback: iframe R2/static URL
  return (
    <div>
      {state.remaining > 0 ? (
        <div style={{ padding: 10, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, marginBottom: 12 }}>
          Free preview remaining: {state.remaining}
        </div>
      ) : null}
      <iframe
        src={r2Url}
        style={{ width: '100%', height: '85vh', border: 0, borderRadius: 12 }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
