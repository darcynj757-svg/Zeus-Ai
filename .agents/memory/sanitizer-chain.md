---
name: Sanitizer chain order
description: Order and purpose of all 5 post-processing sanitizers in parseGeneratedOutput.
---

# Sanitizer chain in parseGeneratedOutput

Full chain (innermost first):
```
sanitizeFonts(sanitizeImages(sanitizeNavbar(sanitizeMobile(sanitizeAosInit(files)))))
```

## Each sanitizer

### sanitizeAosInit (innermost)
- `script.js`: rewrites AOS.init() wrapped in if(prefersReduced) to unconditional call
- `style.css`: appends `[data-aos]:not(.aos-init){opacity:1!important}` fallback if missing

### sanitizeMobile
- `index.html`: injects viewport meta if missing
- `style.css`: appends MOBILE_CSS_FALLBACK block if no `@media (max-width:` exists at all
  - MOBILE_CSS_FALLBACK now includes `header{flex-direction:row!important}` + `header .btn{width:auto!important}`

### sanitizeNavbar
- `style.css` only:
  1. **Contrast guard**: if navbar has `backdrop-filter` or `background:transparent` and no `:not(.scrolled)` rule → appends `color:#fff` on `.nav-links a` and `.logo`
  2. **Mobile guard**: always appends `@media(max-width:768px){ header{flex-direction:row!important} + header .btn{width:auto!important} }` unless marker already present
- Idempotency markers: "Navbar contrast guard" and "Mobile nav safety"

### sanitizeImages
- All `*.html` files: fixes `<img>` tags (onerror fallback, loading=lazy, non-empty alt, source.unsplash→images.unsplash)

### sanitizeFonts (outermost)
- Reads `--font-*` variables from `:root {}` block in `style.css`
- Reads existing `fonts.googleapis.com/css2?family=` links from `index.html`
- Injects a `<link rel="stylesheet" href="...">` for every font family NOT already covered
- Injection point: right after last existing GF link, or before `</head>` if none

## Test files
- `sanitizeFonts.test.ts` — 20 tests
- `sanitizeNavbar.test.ts` — 19 tests
- `sanitizeImages.test.ts` — 23 tests

**Why:** Each sanitizer addresses a class of model hallucination that appeared in E2E audits.
Model often: forgets GF link for display font, uses dark nav text over dark hero, makes header column on mobile.
Deterministic post-processing costs 0 tokens and is idempotent.

**How to apply:** If adding a new sanitizer: (1) add to the chain outermost/innermost as makes sense for read-order, (2) add idempotency marker, (3) write tests, (4) update CLAUDE_CONTEXT.md chain description.
