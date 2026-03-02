export default function Home() {
  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Dont Sweat It Danny — Demo Platform</h1>
      <p>
        This is the platform app. Demos live on wildcard subdomains like{' '}
        <code>business.dontsweatitdanny.com</code>.
      </p>
      <p>
        Next steps: connect Supabase + Stripe secrets, create tenants/content rows, and upload demo bundles
        to R2.
      </p>
    </main>
  );
}
