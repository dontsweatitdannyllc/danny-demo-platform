'use client'

import { useEffect, useMemo, useState } from 'react'

interface SiteContent {
  slug: string
  business_name: string
  tagline: string
  phone: string
  email: string
  address: string
  hours: Record<string, string>
  services: string[]
  about: string
  photos: string[]
  reviews_display: { author: string; text: string; stars: number }[]
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

const emptyContent: SiteContent = {
  slug: '',
  business_name: '',
  tagline: '',
  phone: '',
  email: '',
  address: '',
  hours: {},
  services: [],
  about: '',
  photos: [],
  reviews_display: [],
}

export default function EditPage({ params }: any) {
  const searchParams = useMemo(
    () => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''),
    [],
  )
  const token = searchParams.get('token') || ''
  const slug = params.tenant

  const [content, setContent] = useState<SiteContent>(emptyContent)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [newService, setNewService] = useState('')
  const [siteUrl, setSiteUrl] = useState('')

  // Load content + site URL
  useEffect(() => {
    if (!slug || !token) return
    Promise.all([
      fetch(`/api/sites/${slug}/content`).then((r) => r.json()),
      fetch(`/api/site-config?slug=${slug}`).then((r) => r.json()),
    ]).then(([contentData, configData]) => {
      setContent({ ...emptyContent, ...contentData, slug })
      if (configData.site_url) setSiteUrl(configData.site_url)
      setLoading(false)
    }).catch((e) => {
      setError(e.message)
      setLoading(false)
    })
  }, [slug, token])

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch(`/api/sites/${slug}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-owner-token': token },
        body: JSON.stringify(content),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const uploadPhoto = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/sites/${slug}/photos`, {
      method: 'POST',
      headers: { 'x-owner-token': token },
      body: form,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Upload failed')
    setContent((c) => ({ ...c, photos: [...c.photos, json.url] }))
  }

  if (!token) {
    return (
      <main style={styles.container}>
        <h1>Unauthorized</h1>
        <p>You need a valid owner token to edit this site. Check the link in your email or payment confirmation.</p>
      </main>
    )
  }

  if (loading) {
    return <main style={styles.container}><p>Loading editor...</p></main>
  }

  return (
    <div style={styles.layout}>
      {/* Sidebar editor */}
      <aside style={styles.sidebar}>
        <h1 style={styles.heading}>Edit your site</h1>
        <p style={styles.slug}>{slug}</p>

        {error && <div style={styles.error}>{error}</div>}
        {saved && <div style={styles.success}>Saved!</div>}

        {/* Hero section */}
        <Section title="Hero">
          <Field
            label="Business Name"
            value={content.business_name}
            onChange={(v) => setContent((c) => ({ ...c, business_name: v }))}
          />
          <Field
            label="Tagline"
            value={content.tagline}
            onChange={(v) => setContent((c) => ({ ...c, tagline: v }))}
            multiline
          />
        </Section>

        {/* Contact section */}
        <Section title="Contact Info">
          <Field
            label="Phone"
            value={content.phone}
            onChange={(v) => setContent((c) => ({ ...c, phone: v }))}
          />
          <Field
            label="Email"
            value={content.email}
            onChange={(v) => setContent((c) => ({ ...c, email: v }))}
          />
          <Field
            label="Address"
            value={content.address}
            onChange={(v) => setContent((c) => ({ ...c, address: v }))}
            multiline
          />
        </Section>

        {/* Hours section */}
        <Section title="Hours">
          {DAYS.map((day) => (
            <Field
              key={day}
              label={day.charAt(0).toUpperCase() + day.slice(1)}
              value={content.hours[day] || ''}
              onChange={(v) =>
                setContent((c) => ({ ...c, hours: { ...c.hours, [day]: v } }))
              }
              placeholder="e.g. 8am-6pm"
            />
          ))}
        </Section>

        {/* Services section */}
        <Section title="Services">
          {content.services.map((svc, i) => (
            <div key={i} style={styles.serviceRow}>
              <input
                style={styles.input}
                value={svc}
                onChange={(e) => {
                  const updated = [...content.services]
                  updated[i] = e.target.value
                  setContent((c) => ({ ...c, services: updated }))
                }}
              />
              <button
                style={styles.removeBtn}
                onClick={() => {
                  const updated = content.services.filter((_, j) => j !== i)
                  setContent((c) => ({ ...c, services: updated }))
                }}
              >
                &times;
              </button>
            </div>
          ))}
          <div style={styles.serviceRow}>
            <input
              style={styles.input}
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="Add a service..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newService.trim()) {
                  setContent((c) => ({ ...c, services: [...c.services, newService.trim()] }))
                  setNewService('')
                }
              }}
            />
            <button
              style={styles.addBtn}
              onClick={() => {
                if (newService.trim()) {
                  setContent((c) => ({ ...c, services: [...c.services, newService.trim()] }))
                  setNewService('')
                }
              }}
            >
              +
            </button>
          </div>
        </Section>

        {/* About section */}
        <Section title="About">
          <Field
            label="About your business"
            value={content.about}
            onChange={(v) => setContent((c) => ({ ...c, about: v }))}
            multiline
            rows={6}
          />
        </Section>

        {/* Photos section */}
        <Section title="Photos">
          {content.photos.map((url, i) => (
            <div key={i} style={styles.photoRow}>
              <img src={url} alt="" style={styles.photoThumb} />
              <button
                style={styles.removeBtn}
                onClick={() =>
                  setContent((c) => ({ ...c, photos: c.photos.filter((_, j) => j !== i) }))
                }
              >
                &times;
              </button>
            </div>
          ))}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadPhoto(file)
            }}
          />
        </Section>

        {/* Reviews section */}
        <Section title="Reviews">
          {content.reviews_display.map((review, i) => (
            <div key={i} style={styles.reviewCard}>
              <Field
                label="Author"
                value={review.author}
                onChange={(v) => {
                  const updated = [...content.reviews_display]
                  updated[i] = { ...updated[i], author: v }
                  setContent((c) => ({ ...c, reviews_display: updated }))
                }}
              />
              <Field
                label="Review text"
                value={review.text}
                onChange={(v) => {
                  const updated = [...content.reviews_display]
                  updated[i] = { ...updated[i], text: v }
                  setContent((c) => ({ ...c, reviews_display: updated }))
                }}
                multiline
              />
              <Field
                label="Stars (1-5)"
                value={String(review.stars)}
                onChange={(v) => {
                  const stars = Math.min(5, Math.max(1, parseInt(v) || 1))
                  const updated = [...content.reviews_display]
                  updated[i] = { ...updated[i], stars }
                  setContent((c) => ({ ...c, reviews_display: updated }))
                }}
              />
              <button
                style={styles.removeBtn}
                onClick={() =>
                  setContent((c) => ({
                    ...c,
                    reviews_display: c.reviews_display.filter((_, j) => j !== i),
                  }))
                }
              >
                Remove review
              </button>
            </div>
          ))}
          <button
            style={styles.addBtn}
            onClick={() =>
              setContent((c) => ({
                ...c,
                reviews_display: [...c.reviews_display, { author: '', text: '', stars: 5 }],
              }))
            }
          >
            + Add review
          </button>
        </Section>

        {/* Save button */}
        <button style={styles.saveBtn} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </aside>

      {/* Live preview iframe */}
      <main style={styles.preview}>
        {siteUrl ? (
          <iframe
            src={siteUrl}
            style={styles.iframe}
            title="Site preview"
          />
        ) : (
          <div style={styles.previewPlaceholder}>
            <p>No site URL configured for preview.</p>
          </div>
        )}
      </main>
    </div>
  )
}

/* ---- Sub-components ---- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={styles.section}>
      <button style={styles.sectionHeader} onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} {title}
      </button>
      {open && <div style={styles.sectionBody}>{children}</div>}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline,
  rows,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  rows?: number
  placeholder?: string
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {multiline ? (
        <textarea
          style={styles.textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows || 3}
          placeholder={placeholder}
        />
      ) : (
        <input
          style={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  )
}

/* ---- Styles ---- */

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    height: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  container: {
    padding: 40,
    maxWidth: 600,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  sidebar: {
    width: 420,
    minWidth: 420,
    height: '100vh',
    overflowY: 'auto',
    padding: 24,
    borderRight: '1px solid #e5e7eb',
    background: '#fafafa',
  },
  heading: {
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 4px',
  },
  slug: {
    fontSize: 13,
    color: '#6b7280',
    margin: '0 0 16px',
  },
  error: {
    background: '#fef2f2',
    color: '#b91c1c',
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
  },
  success: {
    background: '#f0fdf4',
    color: '#15803d',
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    background: '#fff',
  },
  sectionHeader: {
    display: 'block',
    width: '100%',
    padding: '10px 14px',
    background: 'none',
    border: 'none',
    textAlign: 'left' as const,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#111',
  },
  sectionBody: {
    padding: '0 14px 14px',
  },
  field: {
    display: 'block',
    marginBottom: 10,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '6px 10px',
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    boxSizing: 'border-box' as const,
  },
  textarea: {
    display: 'block',
    width: '100%',
    padding: '6px 10px',
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    boxSizing: 'border-box' as const,
    resize: 'vertical' as const,
  },
  serviceRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 6,
    alignItems: 'center',
  },
  removeBtn: {
    background: '#fee2e2',
    color: '#b91c1c',
    border: 'none',
    borderRadius: 4,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 13,
    flexShrink: 0,
  },
  addBtn: {
    background: '#dbeafe',
    color: '#1d4ed8',
    border: 'none',
    borderRadius: 4,
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: 13,
    flexShrink: 0,
  },
  photoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  photoThumb: {
    width: 60,
    height: 60,
    objectFit: 'cover' as const,
    borderRadius: 6,
    border: '1px solid #e5e7eb',
  },
  reviewCard: {
    padding: 10,
    marginBottom: 10,
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    background: '#f9fafb',
  },
  saveBtn: {
    display: 'block',
    width: '100%',
    padding: '12px 0',
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    background: '#2563eb',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 8,
    marginBottom: 24,
  },
  preview: {
    flex: 1,
    background: '#f3f4f6',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  previewPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6b7280',
  },
}
