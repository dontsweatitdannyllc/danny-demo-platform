'use client';

import { useEffect, useMemo, useState } from 'react';

import { Paywall } from './Paywall';

type GateResult = { allowed: boolean; remaining?: number; expiresAt?: string | null; reason?: string };

export function GateAndRender({ tenant, siteUrl }: { tenant: string; siteUrl: string }) {
  const [state, setState] = useState<{
    loading: boolean;
    allowed: boolean;
    remaining: number;
    expiresAt: string | null;
    reason: string;
  }>({
    loading: true,
    allowed: false,
    remaining: 0,
    expiresAt: null,
    reason: '',
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
      setState({
        loading: false,
        allowed: !!json.allowed,
        remaining: json.remaining ?? 0,
        expiresAt: (json.expiresAt ?? null) as any,
        reason: json.reason || '',
      });
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

  // Active subscriber → redirect straight to the hosted site.
  if (state.allowed && state.reason === 'subscribed') {
    if (siteUrl && typeof window !== 'undefined') {
      window.location.href = siteUrl;
    }
    return <p>Redirecting to your site…</p>;
  }

  // Everyone else (free preview or expired) sees the paywall with subscription options.
  // During free preview we also show a preview iframe of the site.
  return (
    <div>
      {showDebug ? (
        <pre style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 10, overflowX: 'auto' }}>
          {JSON.stringify({ monthly, yearly, state }, null, 2)}
        </pre>
      ) : null}

      <Paywall
        monthlyEnabled={!!monthly}
        yearlyEnabled={!!yearly}
        onMonthly={() => monthly && checkout(monthly)}
        onYearly={() => yearly && checkout(yearly)}
        expiresAt={state.expiresAt}
      />

      {state.allowed && siteUrl ? (
        <div style={{ marginTop: 18 }}>
          <div style={{ padding: 10, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, marginBottom: 12 }}>
            Free preview — subscribe above to keep your site live.
          </div>
          <iframe
            src={siteUrl}
            style={{ width: '100%', height: '70vh', border: '1px solid #e5e7eb', borderRadius: 12 }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : null}
    </div>
  );
}
