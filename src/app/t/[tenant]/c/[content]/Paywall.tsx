'use client';

export function Paywall({
  onMonthly,
  onYearly,
  monthlyEnabled,
  yearlyEnabled,
}: {
  onMonthly: () => void;
  onYearly: () => void;
  monthlyEnabled: boolean;
  yearlyEnabled: boolean;
}) {
  return (
    <div style={{ padding: 24, border: '1px solid #e5e7eb', borderRadius: 16, maxWidth: 820 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Private preview</div>
      <h2 style={{ margin: '0 0 10px' }}>Claim the website we built for your business</h2>
      <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.5 }}>
        This demo was generated specifically for you. Subscribe to unlock it and keep it live.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
        <div style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 14 }}>
          <div style={{ fontWeight: 700 }}>Mobile-ready</div>
          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>Looks great on phones and loads fast.</div>
        </div>
        <div style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 14 }}>
          <div style={{ fontWeight: 700 }}>SEO-friendly</div>
          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>Clean structure + performance-first defaults.</div>
        </div>
        <div style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 14 }}>
          <div style={{ fontWeight: 700 }}>Cancel anytime</div>
          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>No contracts. Keep control.</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <button
          disabled={!monthlyEnabled}
          onClick={onMonthly}
          style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid #d1d5db', background: '#111827', color: 'white' }}
        >
          $20 / month
        </button>

        <button
          disabled={!yearlyEnabled}
          onClick={onYearly}
          style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid #d1d5db', background: 'white' }}
        >
          $200 / year <span style={{ color: '#10b981', fontWeight: 700 }}>(best value)</span>
        </button>
      </div>

      <details style={{ marginTop: 18 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>FAQ</summary>
        <div style={{ marginTop: 10, color: '#4b5563', lineHeight: 1.6 }}>
          <p><b>What happens after I pay?</b><br/>The demo unlocks immediately and stays live while your subscription is active.</p>
          <p><b>Can I use my own domain?</b><br/>Yes — we can point your domain once you’re ready.</p>
          <p><b>Can I cancel?</b><br/>Yes, cancel anytime in Stripe. The site will re-lock when the subscription ends.</p>
        </div>
      </details>
    </div>
  );
}
