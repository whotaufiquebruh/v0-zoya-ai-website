---
name: Proxy routing conflict — Next.js vs Express
description: Next.js /api/* routes are silently swallowed by the proxy; backend logic must live in the Express api-server.
---

The shared reverse proxy uses most-specific-first path matching:
- `paths = ["/api"]` → artifacts/api-server (port 8080)
- `paths = ["/"]`   → artifacts/zoya-ai Next.js (port 3000)

**Problem:** Any Next.js App Router API route under `app/api/*` is unreachable from the browser because the proxy intercepts `/api/*` and sends it to the Express server before Next.js ever sees it.

**Rule:** Put ALL backend API logic in `artifacts/api-server/src/routes/`. Next.js is frontend-only. Frontend fetch calls to `/api/*` naturally route to Express.

**Why:** The proxy is configured in `.replit-artifact/artifact.toml` for each service. Changing Next.js routes to use `/zoya-api/*` would be an alternative, but the clean separation (Express=API, Next.js=UI) is more maintainable.

**How to apply:** Whenever adding a new API endpoint for the Zoya app, create it in `artifacts/api-server/src/routes/zoya-*.ts` and register it in `artifacts/api-server/src/routes/index.ts`. Dead Next.js API routes under `artifacts/zoya-ai/app/api/*` can be deleted — they are unreachable.
