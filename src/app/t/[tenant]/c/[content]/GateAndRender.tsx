'use client';

import { useEffect, useMemo, useState } from 'react';

type GateResult = { allowed: boolean; remaining?: number };

export function GateAndRender({ tenant, r2Url }: { tenant: string; r2Url: string }) {
  const [state, setState] = useState<{ loading: boolean; allowed: boolean; remaining: number }>({
    loading: true,
    allowed: false,
    remaining: 0,
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
      setState({ loading: false, allowed: !!json.allowed, remaining: json.remaining ?? 0 });
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant]);

  const monthly = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
  const yearly = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY;

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
      <div style={{ padding: 24, border: '1px solid #ddd', borderRadius: 12, maxWidth: 720 }}>
        <h2>Unlock this demo</h2>
        <p>You’ve used your free preview views. Subscribe to unlock full access.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button disabled={!monthly} onClick={() => monthly && checkout(monthly)}>
            $20 / month
          </button>
          <button disabled={!yearly} onClick={() => yearly && checkout(yearly)}>
            $200 / year
          </button>
        </div>
      </div>
    );
  }

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
