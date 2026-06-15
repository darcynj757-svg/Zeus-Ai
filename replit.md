# Zeus AI

An AI-powered web development platform that lets users generate, preview, and deploy web projects (landings, apps, shops) through a conversational chat interface using OpenAI GPT models and E2B sandboxes.

## Run & Operate

- `pnpm install` — install all workspace dependencies
- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run the API server in dev mode
- `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/vibe-coding run dev` — run the frontend (port 5000)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite 7, Tailwind CSS 4, Radix UI, Framer Motion, TanStack Query, Wouter
- API: Express 5, Pino logging
- DB: PostgreSQL + Drizzle ORM (supports both pg and @neondatabase/serverless)
- AI: OpenAI SDK (GPT-4o / GPT-4o-mini)
- Sandbox: E2B for secure code execution and live previews
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle for API), Vite (frontend)

## Where things live

- `artifacts/vibe-coding/` — React frontend (main app UI)
- `artifacts/api-server/` — Express backend (API, AI, E2B orchestration)
- `artifacts/mockup-sandbox/` — Vite preview sandbox template
- `lib/db/` — Drizzle ORM schema and DB connection (source of truth for DB schema)
- `lib/api-spec/` — OpenAPI spec + Orval config (source of truth for API contract)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod schemas and TypeScript types

## Architecture decisions

- Frontend runs on port 5000 (Replit webview), API server runs on port 8080
- Frontend proxies `/api` and `/sites` to `http://localhost:8080` via Vite dev proxy
- DB auto-detects Neon vs standard pg based on `DATABASE_URL` (checks for `neon.tech`)
- Both servers started together in a single workflow command using `&`
- Deployment uses autoscale target with build step (esbuild + Vite) and `vite preview` for production frontend

## Product

Zeus AI lets users describe what they want to build in plain language, then generates working code, shows a live preview via E2B sandboxes, and allows publishing the site publicly.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `PORT` and `BASE_PATH` env vars are required by the Vite config — the frontend throws if either is missing
- `OPENAI_API_KEY` and `E2B_API_KEY` are needed for AI generation and sandbox previews respectively
- API server `dev` script builds first then starts — use `start` directly in production after building

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- DB schema: `lib/db/src/schema/`
- API routes: `artifacts/api-server/src/routes/`
