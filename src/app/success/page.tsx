'use client';

import { useEffect, useMemo, useState } from 'react';

export default function SuccessPage() {
  const params = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), []);
  const tenant = params.get('tenant') || '';
  const returnUrl = params.get('return') || '';

  const [state, setState] = useState<{ status: 'checking' | 'active' | 'waiting' | 'error'; message?: string; ownerToken?: string }>(
    { status: 'checking' },
  );

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(`/api/subscription/status?tenant=${encodeURIComponent(tenant)}`, { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (json.active) {
          setState({ status: 'active', ownerToken: json.owner_token || '' });
          // Give the UI a beat, then redirect to provisioning.
          setTimeout(() => {
            if (returnUrl) window.location.href = '/t/' + tenant + '/provision';
          }, 800);
        } else {
          setState({ status: 'waiting', message: 'Waiting for Stripe to confirm…' });
        }
      } catch (e: any) {
        if (cancelled) return;
        setState({ status: 'error', message: e?.message || String(e) });
      }
    }

    if (!tenant || !returnUrl) {
      setState({ status: 'error', message: 'Missing tenant or return URL.' });
      return;
    }

    tick();
    const id = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tenant, returnUrl]);

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1>Payment received</h1>
      <p style={{ color: '#6b7280' }}>
        Tenant: <code>{tenant}</code>
      </p>

      {state.status === 'active' ? (
        <>
          <p>Unlocked. Redirecting you back to the demo…</p>
          {state.ownerToken && (
            <p style={{ marginTop: 12 }}>
              <a
                href={`/t/${tenant}/edit?token=${state.ownerToken}`}
                style={{ textDecoration: 'underline', color: '#2563eb' }}
              >
                Edit your website
              </a>
              {' — '}
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                Bookmark this link to edit your site anytime.
              </span>
            </p>
          )}
        </>
      ) : state.status === 'waiting' ? (
        <p>{state.message}</p>
      ) : state.status === 'error' ? (
        <p style={{ color: '#b91c1c' }}>Error: {state.message}</p>
      ) : (
        <p>Checking subscription status…</p>
      )}

      <div style={{ marginTop: 16 }}>
        {returnUrl ? (
          <a href={returnUrl} style={{ textDecoration: 'underline' }}>
            Back to demo
          </a>
        ) : null}
      </div>
    </main>
  );
}
