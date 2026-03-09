'use client';

import { useEffect, useMemo, useState } from 'react';

import { Paywall } from './Paywall';

type GateResult = { allowed: boolean; reason?: string };

export function GateAndRender({ tenant, siteUrl }: { tenant: string; siteUrl: string }) {
  const [state, setState] = useState<{ loading: boolean; allowed: boolean }>({
    loading: true,
    allowed: false,
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
      setState({ loading: false, allowed: !!json.allowed });
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant]);

  const monthly = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
  const yearly = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY;

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

  // Active subscriber → redirect to the hosted site.
  if (state.allowed) {
    if (siteUrl && typeof window !== 'undefined') {
      window.location.href = siteUrl;
    }
    return <p>Redirecting to your site…</p>;
  }

  // Not subscribed → show paywall.
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
      />
    </div>
  );
}
