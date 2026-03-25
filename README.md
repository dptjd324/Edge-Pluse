# EdgePulse

EdgePulse is a serverless uptime monitoring project built with React, TypeScript, Cloudflare Workers, and D1.

It provides:

- site registration and deletion
- uptime checks and response-time tracking
- recent check history per site
- a simple monitoring dashboard
- a public status API by site slug

## Tech Stack

- frontend: React 19 + Vite
- backend: Cloudflare Workers
- database: Cloudflare D1

## Available Scripts

- `npm run dev`: start the Vite frontend dev server
- `npm run dev:worker`: start the Cloudflare Worker locally on `127.0.0.1:8787`
- `npm run db:migrate:local`: apply D1 migrations to the local database
- `npm run db:migrate:remote`: apply D1 migrations to the remote Cloudflare database
- `npm run build`: build the frontend bundle
- `npm run lint`: run ESLint
- `npm run deploy`: build and deploy with Wrangler

## Local Development

The frontend and API run as separate local processes.

1. Apply local D1 migrations:

```bash
npm run db:migrate:local
```

2. Start the Worker:

```bash
npm run dev:worker
```

3. In another terminal, start the frontend:

```bash
npm run dev
```

4. Open the Vite app in the browser.

The Vite dev server proxies these paths to the Worker running on `http://127.0.0.1:8787`:

- `/api`
- `/health`

Because of that, frontend requests such as `fetch('/api/sites')` and the `View site API` link work correctly during local development.

## Main API Routes

- `GET /health`
- `GET /api/sites`
- `POST /api/sites`
- `DELETE /api/sites/:id`
- `POST /api/sites/:id/check`
- `GET /api/sites/:id/checks`
- `GET /api/public/:slug`

## Database

D1 migrations are stored in [`db/migrations`](./db/migrations):

- `0001_create_sites.sql`
- `0002_create_checks.sql`

## Notes

- The current frontend is a read-only monitoring dashboard.
- Site creation, deletion, and public status access are currently exposed through API routes rather than dedicated UI flows.
