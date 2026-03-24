export type Env = Record<string, never>

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
  async fetch(request) {
    const { pathname } = new URL(request.url)

    if (pathname === '/health') {
      return json({
        success: true,
        data: {
          status: 'ok',
        },
      })
    }

    return json({
      success: true,
      data: {
        name: 'EdgePulse',
        message: 'Cloudflare Worker initialized',
      },
    })
  },
}

export default worker
