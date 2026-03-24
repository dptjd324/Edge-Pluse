import { useEffect, useState } from 'react'
import heroImage from './assets/hero.png'
import './App.css'

type CheckStatus = 'up' | 'down'

interface Site {
  id: number
  name: string
  url: string
  slug: string
  check_interval: number
  is_active: number
  created_at: string
  updated_at: string
}

interface SiteCheck {
  id: number
  site_id: number
  status: CheckStatus
  status_code: number | null
  response_time: number | null
  error_message: string | null
  checked_at: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface SitesResponse {
  sites: Site[]
}

interface ChecksResponse {
  checks: SiteCheck[]
}

const formatStatus = (checks: SiteCheck[]) => {
  if (checks.length === 0) {
    return 'unknown'
  }

  return checks[0].status
}

const formatResponseTime = (responseTime: number | null) => {
  if (responseTime === null) {
    return 'No timing'
  }

  return `${responseTime} ms`
}

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

function App() {
  const [sites, setSites] = useState<Site[]>([])
  const [checksBySite, setChecksBySite] = useState<Record<number, SiteCheck[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      setLoading(true)
      setError(null)

      try {
        const sitesResponse = await fetch('/api/sites')
        const sitesPayload = (await sitesResponse.json()) as ApiResponse<SitesResponse>

        if (!sitesResponse.ok || !sitesPayload.success || !sitesPayload.data) {
          throw new Error(sitesPayload.error ?? 'Failed to load sites')
        }

        if (cancelled) {
          return
        }

        const loadedSites = sitesPayload.data.sites
        setSites(loadedSites)

        const checkResults = await Promise.all(
          loadedSites.map(async (site) => {
            const checksResponse = await fetch(`/api/sites/${site.id}/checks`)
            const checksPayload =
              (await checksResponse.json()) as ApiResponse<ChecksResponse>

            if (!checksResponse.ok || !checksPayload.success || !checksPayload.data) {
              throw new Error(checksPayload.error ?? `Failed to load checks for ${site.name}`)
            }

            return [site.id, checksPayload.data.checks.slice(0, 5)] as const
          }),
        )

        if (cancelled) {
          return
        }

        setChecksBySite(Object.fromEntries(checkResults))
      } catch (loadError) {
        if (cancelled) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  const totalSites = sites.length
  const activeSites = sites.filter((site) => site.is_active === 1).length
  const downSites = sites.filter((site) => formatStatus(checksBySite[site.id] ?? []) === 'down').length

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">EdgePulse</p>
          <h1>Live uptime board for every monitored endpoint.</h1>
          <p className="hero-text">
            One screen for site inventory, current status, and the most recent
            checks coming out of the Worker monitor.
          </p>
          <div className="hero-actions">
            <a href="/api/sites" className="primary-link">
              View site API
            </a>
            <span className="hero-note">Cloudflare Worker + D1 monitoring</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <img src={heroImage} alt="" />
        </div>
      </section>

      <section className="metrics-strip" aria-label="Dashboard summary">
        <div>
          <span className="metric-label">Sites</span>
          <strong>{totalSites}</strong>
        </div>
        <div>
          <span className="metric-label">Active</span>
          <strong>{activeSites}</strong>
        </div>
        <div>
          <span className="metric-label">Down now</span>
          <strong>{downSites}</strong>
        </div>
      </section>

      <section className="board-section">
        <div className="section-heading">
          <h2>Monitoring dashboard</h2>
          <p>Site list, current status, and latest checks.</p>
        </div>

        {loading ? <p className="panel-message">Loading monitoring data...</p> : null}
        {error ? <p className="panel-message error-message">{error}</p> : null}
        {!loading && !error && sites.length === 0 ? (
          <p className="panel-message">No monitored sites have been created yet.</p>
        ) : null}

        {!loading && !error && sites.length > 0 ? (
          <div className="site-grid">
            {sites.map((site) => {
              const checks = checksBySite[site.id] ?? []
              const currentStatus = formatStatus(checks)

              return (
                <article className="site-panel" key={site.id}>
                  <header className="site-header">
                    <div>
                      <p className="site-slug">/{site.slug}</p>
                      <h3>{site.name}</h3>
                    </div>
                    <span className={`status-pill ${currentStatus}`}>
                      {currentStatus}
                    </span>
                  </header>

                  <p className="site-url">{site.url}</p>

                  <dl className="site-meta">
                    <div>
                      <dt>Check interval</dt>
                      <dd>{site.check_interval} min</dd>
                    </div>
                    <div>
                      <dt>Mode</dt>
                      <dd>{site.is_active === 1 ? 'Active' : 'Paused'}</dd>
                    </div>
                  </dl>

                  <div className="checks-block">
                    <div className="checks-heading">
                      <h4>Recent checks</h4>
                      <span>{checks.length} entries</span>
                    </div>

                    {checks.length > 0 ? (
                      <ul className="checks-list">
                        {checks.map((check) => (
                          <li key={check.id}>
                            <div className="check-main">
                              <span className={`check-dot ${check.status}`}></span>
                              <span className="check-status">{check.status}</span>
                              <span>{formatResponseTime(check.response_time)}</span>
                              <span>
                                {check.status_code === null
                                  ? 'No code'
                                  : `HTTP ${check.status_code}`}
                              </span>
                            </div>
                            <div className="check-meta">
                              <span>{formatTimestamp(check.checked_at)}</span>
                              <span>{check.error_message ?? 'Healthy response'}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="empty-checks">No checks recorded yet.</p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default App
