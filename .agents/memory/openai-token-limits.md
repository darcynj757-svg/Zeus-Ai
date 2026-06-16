---
name: OpenAI model token limits
description: Hard cap on completion tokens for gpt-4o / gpt-4o-mini — use 16384, not more.
---

Both `gpt-4o` and `gpt-4o-mini` enforce a hard cap of **16384 completion tokens**.
Passing `max_tokens > 16384` returns HTTP 400: "max_tokens is too large".

**Why:** Discovered when raising site-generation limit from 16000 to 32000 — the API rejected 32000 immediately.

**How to apply:** For any site generation call (`generateWithOpenAI`, `streamWithOpenAI`, `editProject`), use `max_tokens: 16384`. For lightweight calls (`generatePlan` = 1000, `generateZeusMd` = 600) keep them as-is.
