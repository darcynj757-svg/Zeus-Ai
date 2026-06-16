---
name: AOS visibility bug & sanitizeAosInit
description: GPT-4o sometimes wraps AOS.init() in if(prefersReduced) making all [data-aos] content invisible; fixed by post-processing in parseGeneratedOutput.
---

## The bug
GPT-4o occasionally generates:
```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReduced) { AOS.init({ duration: 700, ... }); }
```
AOS CSS sets all `[data-aos]` elements to `opacity:0` initially. If `AOS.init()` is never called (because user has no reduced-motion preference but the logic is inverted, or because the if-guard fires), the entire site content stays invisible.

## The fix (two layers)

**Layer 1 — Prompt hardening (R4 in SYSTEM_PROMPT):**
- Explicit ❌ WRONG / ✅ CORRECT code snippets in the R4 block
- QUALITY BAR checklist item updated to say "NEVER inside an if-block"

**Layer 2 — Deterministic post-processing (`sanitizeAosInit`):**
- Lives in `artifacts/api-server/src/lib/openai.ts`, called from `parseGeneratedOutput` after every successful parse (zero extra tokens/API calls)
- `fixAosInScript`: detects `if (...Reduc...) { ... AOS.init(...) ... }` using brace-balanced state machine, replaces the entire if/else block with the canonical unconditional form
- `fixAosCssFallback`: appends `[data-aos]:not(.aos-init) { opacity:1!important }` to style.css if absent (AOS adds `.aos-init` class when it processes each element — without that class means AOS failed to load)
- Both are idempotent — no change when pattern not found
- Logs `console.warn("[sanitizeAosInit] Fixed: ...")` when a fix is applied

**Why:** Both layers are needed — the prompt reduces frequency, the code-level fix catches any remaining occurrences without retrying generation.

**How to apply:** Do not remove `sanitizeAosInit(...)` calls in `parseGeneratedOutput`. Do not weaken the R4 prompt section.
