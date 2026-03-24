interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement
  first<T>(column?: string): Promise<T | null>
  all<T>(): Promise<{ results: T[] }>
  run(): Promise<{ success: boolean; meta?: { last_row_id?: number; changes?: number } }>
}

interface D1Database {
  prepare: (query: string) => D1PreparedStatement
}

export interface Env {
  edgepulse_db: D1Database
}

interface WorkerExecutionContext {
  waitUntil: (promise: Promise<unknown>) => void
  passThroughOnException: () => void
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

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

interface CreateSiteInput {
  name?: unknown
  url?: unknown
  slug?: unknown
  checkInterval?: unknown
}

interface ValidatedSiteInput {
  name: string
  url: string
  slug: string
  checkInterval: number
}

interface WorkerHandler<Environment> {
  fetch: (
    request: Request,
    env: Environment,
    ctx: WorkerExecutionContext,
  ) => Response | Promise<Response>
}

const json = <T>(payload: ApiResponse<T>, init?: ResponseInit) =>
  Response.json(payload, init)

const notFound = () =>
  json(
    {
      success: false,
      error: 'Not found',
    },
    { status: 404 },
  )

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const parseSiteId = (pathname: string) => {
  const match = pathname.match(/^\/api\/sites\/(\d+)$/)

  if (!match) {
    return null
  }

  return Number(match[1])
}

const validateSiteInput = (payload: CreateSiteInput): string | null => {
  if (!isNonEmptyString(payload.name)) {
    return 'Name is required'
  }

  if (!isNonEmptyString(payload.url)) {
    return 'URL is required'
  }

  if (!isNonEmptyString(payload.slug)) {
    return 'Slug is required'
  }

  if (typeof payload.checkInterval !== 'number' || payload.checkInterval <= 0) {
    return 'checkInterval must be a positive number'
  }

  try {
    new URL(payload.url)
  } catch {
    return 'URL must be valid'
  }

  return null
}

const toValidatedSiteInput = (payload: CreateSiteInput): ValidatedSiteInput => ({
  name: payload.name as string,
  url: payload.url as string,
  slug: payload.slug as string,
  checkInterval: payload.checkInterval as number,
})

const getSites = async (env: Env) => {
  const result = await env.edgepulse_db
    .prepare(
      `SELECT id, name, url, slug, check_interval, is_active, created_at, updated_at
       FROM sites
       ORDER BY id DESC`,
    )
    .all<Site>()

  return json({
    success: true,
    data: {
      sites: result.results,
    },
  })
}

const createSite = async (request: Request, env: Env) => {
  let payload: CreateSiteInput

  try {
    payload = (await request.json()) as CreateSiteInput
  } catch {
    return json(
      {
        success: false,
        error: 'Invalid JSON body',
      },
      { status: 400 },
    )
  }

  const validationError = validateSiteInput(payload)

  if (validationError) {
    return json(
      {
        success: false,
        error: validationError,
      },
      { status: 400 },
    )
  }

  const siteInput = toValidatedSiteInput(payload)

  try {
    const insertResult = await env.edgepulse_db
      .prepare(
        `INSERT INTO sites (name, url, slug, check_interval)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(
        siteInput.name.trim(),
        siteInput.url.trim(),
        siteInput.slug.trim(),
        siteInput.checkInterval,
      )
      .run()

    const siteId = insertResult.meta?.last_row_id

    if (typeof siteId !== 'number') {
      throw new Error('Site was created but no id was returned')
    }

    const site = await env.edgepulse_db
      .prepare(
        `SELECT id, name, url, slug, check_interval, is_active, created_at, updated_at
         FROM sites
         WHERE id = ?`,
      )
      .bind(siteId)
      .first<Site>()

    return json(
      {
        success: true,
        data: {
          site,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create site'

    return json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    )
  }
}

const deleteSite = async (pathname: string, env: Env) => {
  const siteId = parseSiteId(pathname)

  if (siteId === null) {
    return notFound()
  }

  try {
    const existingSite = await env.edgepulse_db
      .prepare('SELECT id FROM sites WHERE id = ?')
      .bind(siteId)
      .first<{ id: number }>()

    if (!existingSite) {
      return json(
        {
          success: false,
          error: 'Site not found',
        },
        { status: 404 },
      )
    }

    await env.edgepulse_db.prepare('DELETE FROM sites WHERE id = ?').bind(siteId).run()

    return json({
      success: true,
      data: {
        deletedId: siteId,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete site'

    return json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    )
  }
}

const worker: WorkerHandler<Env> = {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)

    if (pathname === '/health') {
      try {
        const result = await env.edgepulse_db
          .prepare('SELECT 1 as connected')
          .first<{ connected: number }>()

        return json({
          success: true,
          data: {
            status: 'ok',
            database: result?.connected === 1 ? 'connected' : 'unavailable',
          },
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Database connection failed'

        return json(
          {
            success: false,
            error: message,
          },
          { status: 500 },
        )
      }
    }

    if (pathname === '/') {
      return json({
        success: true,
        data: {
          name: 'EdgePulse',
          message: 'Cloudflare Worker connected to D1',
        },
      })
    }

    if (pathname === '/api/sites' && request.method === 'GET') {
      return getSites(env)
    }

    if (pathname === '/api/sites' && request.method === 'POST') {
      return createSite(request, env)
    }

    if (request.method === 'DELETE' && pathname.startsWith('/api/sites/')) {
      return deleteSite(pathname, env)
    }

    return notFound()
  },
}

export default worker
