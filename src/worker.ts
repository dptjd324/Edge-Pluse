interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement
  first<T>(column?: string): Promise<T | null>
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

interface WorkerHandler<Environment> {
  fetch: (
    request: Request,
    env: Environment,
    ctx: WorkerExecutionContext,
  ) => Response | Promise<Response>
}

const json = <T>(payload: ApiResponse<T>, init?: ResponseInit) =>
  Response.json(payload, init)

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

    return json(
      {
        success: false,
        error: 'Not found',
      },
      { status: 404 },
    )
  },
}

export default worker
