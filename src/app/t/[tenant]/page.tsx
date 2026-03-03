const BUILD = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';

export default async function TenantHome({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Demo: {tenant}</h1>
      <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
        Build: <code>{BUILD}</code>
      </div>
      <p>
        This is the tenant root. In MVP we’ll serve the demo at <code>/c/main</code>.
      </p>
      <p>
        Try: <a href={`/c/main`}>/c/main</a>
      </p>
    </main>
  );
}
