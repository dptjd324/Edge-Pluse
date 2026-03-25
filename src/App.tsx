import type { ChangeEvent, FormEvent, MouseEvent } from 'react'
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

interface CreateSiteResponse {
  site: Site
}

interface CheckResponse {
  check: SiteCheck
}

interface CreateSiteFormState {
  name: string
  url: string
  checkInterval: string
}

interface PublicSiteInfo {
  name: string
  url: string
  slug: string
}

interface PublicSiteResponse {
  site: PublicSiteInfo
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

const getPathname = () => window.location.pathname

const isPublicStatusPath = (pathname: string) => pathname.startsWith('/status/')

const getSlugFromStatusPath = (pathname: string) => {
  const match = pathname.match(/^\/status\/([^/]+)$/)

  if (!match) {
    return null
  }

  return decodeURIComponent(match[1])
}

function App() {
  const [pathname, setPathname] = useState(getPathname)
  const [sites, setSites] = useState<Site[]>([])
  const [checksBySite, setChecksBySite] = useState<Record<number, SiteCheck[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingSiteId, setDeletingSiteId] = useState<number | null>(null)
  const [checkingSiteId, setCheckingSiteId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [formState, setFormState] = useState<CreateSiteFormState>({
    name: '',
    url: '',
    checkInterval: '5',
  })
  const [publicLoading, setPublicLoading] = useState(false)
  const [publicError, setPublicError] = useState<string | null>(null)
  const [publicSite, setPublicSite] = useState<PublicSiteInfo | null>(null)
  const [publicChecks, setPublicChecks] = useState<SiteCheck[]>([])

  const statusSlug = getSlugFromStatusPath(pathname)
  const showingPublicStatus = isPublicStatusPath(pathname) && statusSlug !== null

  const navigateTo = (nextPathname: string) => {
    if (nextPathname === pathname) {
      return
    }

    window.history.pushState({}, '', nextPathname)
    setPathname(nextPathname)
  }

  const handleNavigate = (event: MouseEvent<HTMLAnchorElement>, nextPathname: string) => {
    event.preventDefault()
    navigateTo(nextPathname)
  }

  const loadDashboard = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false

    if (!silent) {
      setLoading(true)
    }

    setError(null)

    try {
      const sitesResponse = await fetch('/api/sites')
      const sitesPayload = (await sitesResponse.json()) as ApiResponse<SitesResponse>

      if (!sitesResponse.ok || !sitesPayload.success || !sitesPayload.data) {
        throw new Error(sitesPayload.error ?? 'Failed to load sites')
      }

      const loadedSites = sitesPayload.data.sites
      setSites(loadedSites)

      const checkResults = await Promise.all(
        loadedSites.map(async (site) => {
          const checksResponse = await fetch(`/api/sites/${site.id}/checks`)
          const checksPayload = (await checksResponse.json()) as ApiResponse<ChecksResponse>

          if (!checksResponse.ok || !checksPayload.success || !checksPayload.data) {
            throw new Error(checksPayload.error ?? `Failed to load checks for ${site.name}`)
          }

          return [site.id, checksPayload.data.checks.slice(0, 5)] as const
        }),
      )

      setChecksBySite(Object.fromEntries(checkResults))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const onPopState = () => {
      setPathname(getPathname())
    }

    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (cancelled || showingPublicStatus) {
        return
      }

      await loadDashboard()
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [showingPublicStatus])

  useEffect(() => {
    let cancelled = false

    const loadPublicStatus = async () => {
      if (!showingPublicStatus || !statusSlug) {
        setPublicSite(null)
        setPublicChecks([])
        setPublicError(null)
        return
      }

      setPublicLoading(true)
      setPublicError(null)

      try {
        const response = await fetch(`/api/public/${encodeURIComponent(statusSlug)}`)
        const payload = (await response.json()) as ApiResponse<PublicSiteResponse>

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? 'Failed to load public status')
        }

        if (cancelled) {
          return
        }

        setPublicSite(payload.data.site)
        setPublicChecks(payload.data.checks)
      } catch (loadError) {
        if (cancelled) {
          return
        }

        setPublicSite(null)
        setPublicChecks([])
        setPublicError(
          loadError instanceof Error ? loadError.message : 'Failed to load public status',
        )
      } finally {
        if (!cancelled) {
          setPublicLoading(false)
        }
      }
    }

    void loadPublicStatus()

    return () => {
      cancelled = true
    }
  }, [showingPublicStatus, statusSlug])

  const handleFormChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target

    setFormState((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleCreateSite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSubmitting(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: formState.name.trim(),
          url: formState.url.trim(),
          checkInterval: Number(formState.checkInterval),
        }),
      })

      const payload = (await response.json()) as ApiResponse<CreateSiteResponse>

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to create site')
      }

      setFormState({
        name: '',
        url: '',
        checkInterval: '5',
      })
      setFormSuccess(`${payload.data.site.name} was added to monitoring.`)
      await loadDashboard({ silent: true })
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Failed to create site')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSite = async (site: Site) => {
    const confirmed = window.confirm(`Delete ${site.name} and all of its checks?`)

    if (!confirmed) {
      return
    }

    setDeletingSiteId(site.id)
    setActionError(null)

    try {
      const response = await fetch(`/api/sites/${site.id}`, {
        method: 'DELETE',
      })

      const payload = (await response.json()) as ApiResponse<{ deletedId: number }>

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to delete site')
      }

      await loadDashboard({ silent: true })
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Failed to delete site')
    } finally {
      setDeletingSiteId(null)
    }
  }

  const handleRunCheck = async (site: Site) => {
    setCheckingSiteId(site.id)
    setActionError(null)

    try {
      const response = await fetch(`/api/sites/${site.id}/check`, {
        method: 'POST',
      })

      const payload = (await response.json()) as ApiResponse<CheckResponse>

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to run site check')
      }

      await loadDashboard({ silent: true })
    } catch (checkError) {
      setActionError(checkError instanceof Error ? checkError.message : 'Failed to run site check')
    } finally {
      setCheckingSiteId(null)
    }
  }

  const totalSites = sites.length
  const activeSites = sites.filter((site) => site.is_active === 1).length
  const downSites = sites.filter((site) => formatStatus(checksBySite[site.id] ?? []) === 'down').length

  if (isPublicStatusPath(pathname)) {
    return (
      <main className="dashboard-shell">
        <section className="hero-panel hero-panel-compact">
          <div className="hero-copy">
            <p className="eyebrow">Public status</p>
            <h1>Status window for one monitored endpoint.</h1>
            <p className="hero-text">
              Share a public page for one service without exposing the full dashboard.
            </p>
            <div className="hero-actions">
              <a href="/" className="primary-link" onClick={(event) => handleNavigate(event, '/')}>
                Back to dashboard
              </a>
              {publicSite ? (
                <a
                  href={`/api/public/${encodeURIComponent(publicSite.slug)}`}
                  className="secondary-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open raw API
                </a>
              ) : null}
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <img src={heroImage} alt="" />
          </div>
        </section>

        {publicLoading ? <p className="panel-message">Loading public status...</p> : null}
        {publicError ? <p className="panel-message error-message">{publicError}</p> : null}
        {!publicLoading && !publicError && !publicSite ? (
          <p className="panel-message">No public status data is available for this path.</p>
        ) : null}

        {publicSite ? (
          <>
            <section className="metrics-strip" aria-label="Public status summary">
              <div>
                <span className="metric-label">Site</span>
                <strong className="metric-copy">{publicSite.name}</strong>
              </div>
              <div>
                <span className="metric-label">Slug</span>
                <strong className="metric-copy">/{publicSite.slug}</strong>
              </div>
              <div>
                <span className="metric-label">Current</span>
                <strong className="metric-copy">{formatStatus(publicChecks)}</strong>
              </div>
            </section>

            <section className="board-section">
              <div className="section-heading">
                <h2>Endpoint status</h2>
                <p>{publicSite.url}</p>
              </div>

              <article className="site-panel">
                <header className="site-header">
                  <div>
                    <p className="site-slug">/{publicSite.slug}</p>
                    <h3>{publicSite.name}</h3>
                  </div>
                  <span className={`status-pill ${formatStatus(publicChecks)}`}>
                    {formatStatus(publicChecks)}
                  </span>
                </header>

                <div className="checks-block">
                  <div className="checks-heading">
                    <h4>Recent checks</h4>
                    <span>{publicChecks.length} entries</span>
                  </div>

                  {publicChecks.length > 0 ? (
                    <ul className="checks-list">
                      {publicChecks.map((check) => (
                        <li key={check.id}>
                          <div className="check-main">
                            <span className={`check-dot ${check.status}`}></span>
                            <span className="check-status">{check.status}</span>
                            <span>{formatResponseTime(check.response_time)}</span>
                            <span>
                              {check.status_code === null ? 'No code' : `HTTP ${check.status_code}`}
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
            </section>
          </>
        ) : null}
      </main>
    )
  }

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
            <a href="#site-create-form" className="primary-link">
              Add site
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

      <section className="board-section" id="site-create-form">
        <div className="section-heading">
          <h2>Add a monitored site</h2>
          <p>Register a URL and choose how often EdgePulse should check it.</p>
        </div>

        <form className="site-form" onSubmit={handleCreateSite}>
          <label className="field">
            <span>Site name</span>
            <input
              type="text"
              name="name"
              value={formState.name}
              onChange={handleFormChange}
              placeholder="Marketing Site"
              required
            />
          </label>

          <label className="field field-wide">
            <span>URL</span>
            <input
              type="url"
              name="url"
              value={formState.url}
              onChange={handleFormChange}
              placeholder="https://example.com"
              required
            />
          </label>

          <label className="field">
            <span>Check interval</span>
            <input
              type="number"
              name="checkInterval"
              value={formState.checkInterval}
              onChange={handleFormChange}
              min="1"
              step="1"
              required
            />
          </label>

          <button className="primary-link primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Create monitor'}
          </button>
        </form>

        {formError ? <p className="panel-message error-message">{formError}</p> : null}
        {formSuccess ? <p className="panel-message success-message">{formSuccess}</p> : null}
      </section>

      <section className="board-section" id="monitoring-dashboard">
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

                  <div className="site-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => handleRunCheck(site)}
                      disabled={checkingSiteId === site.id}
                    >
                      {checkingSiteId === site.id ? 'Checking...' : 'Run check now'}
                    </button>
                    <a
                      href={`/status/${encodeURIComponent(site.slug)}`}
                      className="secondary-link"
                      onClick={(event) =>
                        handleNavigate(event, `/status/${encodeURIComponent(site.slug)}`)
                      }
                    >
                      Public status
                    </a>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => handleDeleteSite(site)}
                      disabled={deletingSiteId === site.id}
                    >
                      {deletingSiteId === site.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>

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

        {actionError ? <p className="panel-message error-message">{actionError}</p> : null}
      </section>
    </main>
  )
}

export default App
