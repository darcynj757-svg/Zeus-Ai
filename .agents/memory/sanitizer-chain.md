---
name: Sanitizer chain order
description: Order and purpose of all 6 post-processing sanitizers in parseGeneratedOutput.
---

# Sanitizer chain in parseGeneratedOutput

Full chain (innermost first):
```
sanitizeScripts(sanitizeFonts(sanitizeImages(sanitizeNavbar(sanitizeMobile(sanitizeAosInit(files))))))
```

Applied in BOTH paths: normal `JSON.parse` path AND `recoverPartialFiles` path.

## Each sanitizer

### sanitizeAosInit (innermost)
- `script.js`: rewrites AOS.init() wrapped in if(prefersReduced) to unconditional call
- `style.css`: appends `[data-aos]:not(.aos-init){opacity:1!important}` fallback if missing

### sanitizeMobile
- `index.html`: injects viewport meta if missing
- `style.css`: appends MOBILE_CSS_FALLBACK block if no `@media (max-width:` exists at all
  - MOBILE_CSS_FALLBACK includes `header{flex-direction:row!important}` + `header .btn{width:auto!important}`

### sanitizeNavbar
- `style.css` only:
  1. **Contrast guard**: if navbar has `backdrop-filter` or `background:transparent` and no `:not(.scrolled)` rule → appends `color:#fff` on `.nav-links a` and `.logo`
  2. **Mobile guard**: always appends `@media(max-width:768px){ header{flex-direction:row!important} + header .btn{width:auto!important} }` unless marker already present
- Idempotency markers: "Navbar contrast guard" and "Mobile nav safety"

### sanitizeImages
- All `*.html` files: fixes `<img>` tags (onerror fallback, loading=lazy, non-empty alt, source.unsplash→images.unsplash)

### sanitizeFonts
- Reads `--font-*` variables from `:root {}` block in `style.css`
- Reads existing `fonts.googleapis.com/css2?family=` links from `index.html`
- Injects a `<link rel="stylesheet" href="...">` for every font family NOT already covered
- Injection point: right after last existing GF link, or before `</head>` if none

### sanitizeScripts (outermost)
- Triggers when: `script.js` absent OR empty/whitespace OR content lacks both `hamburger` and `DOMContentLoaded`
- Injects minimal fallback: hamburger toggle (.hamburger/.menu-toggle → .nav-links/nav .open/.active), smooth scroll (a[href^="#"]), `window.AOS && AOS.init({once:true})`
- Also ensures `<script src="script.js" defer></script>` appears before `</body>` in index.html
- Idempotent: working script or already-present `<script>` tag → no change, no duplication

## Test files
- `sanitizeAosInit` — covered via integration
- `sanitizeMobile` — covered via integration
- `sanitizeNavbar.test.ts` — 19 tests
- `sanitizeImages.test.ts` — 23 tests
- `sanitizeFonts.test.ts` — 20 tests
- `sanitizeScripts.test.ts` — 24 tests

**Why:** Each sanitizer addresses a class of model hallucination. Model sometimes truncates response → script.js missing or empty → mobile nav dead, no smooth scroll, AOS never fires (content stays opacity:0). Deterministic post-processing costs 0 tokens and is idempotent.

**How to apply:** If adding a new sanitizer: (1) add to the chain as outermost (wraps all others), (2) add idempotency check to avoid re-firing, (3) write tests for absent/weak/working/double-run cases, (4) update CLAUDE_CONTEXT.md chain description.
