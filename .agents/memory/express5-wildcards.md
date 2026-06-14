---
name: Express 5 router wildcards
description: Express 5 uses path-to-regexp@8 which requires named wildcards — anonymous * throws PathError at startup.
---

## Rule
In Express 5 routes, NEVER use anonymous wildcards `*` — always use named wildcards `*name`.

**Wrong:** `router.get('/:slug/*', handler)` → `PathError: Missing parameter name at index N`

**Correct:** `router.get('/:slug/*filePath', handler)` → works, param available as `req.params.filePath`

**Why:** path-to-regexp@8 (bundled with Express 5 / router@2) dropped support for unnamed wildcards. They must be named.

**How to apply:** Any time you add a catch-all route in Express 5 — wildcard must be `/*paramName`. Access via `req.params.paramName` (may need `as Record<string, string>` cast in TypeScript).
