'use client'

import { useState } from 'react'

export default function ProvisionPage({ params }: any) {
  const [domain, setDomain] = useState('')
  const [done, setDone] = useState(false)

  const attachDomain = async () => {
    const slug = params.tenant

    await fetch('/api/domain/attach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, domain }),
    })

    setDone(true)
  }

  if (done) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Domain attached</h1>
        <p>Point your DNS to demos.dontsweatitdanny.com</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Connect your domain</h1>

      <input
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="yourdomain.com"
        style={{ padding: 10, width: 300 }}
      />

      <br /><br />

      <button onClick={attachDomain}>
        Attach domain
      </button>

      <p style={{ marginTop: 20 }}>
        Or keep using the demo domain for now.
      </p>
    </div>
  )
}
