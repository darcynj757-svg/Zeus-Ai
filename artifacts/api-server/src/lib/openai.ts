import OpenAI from "openai";

export const MODELS = {
  lite: "gpt-4o-mini",
  power: "gpt-4o",
} as const;

export type ModelTier = keyof typeof MODELS;

export const SYSTEM_PROMPT = `You are an elite frontend design engineer. You craft stunning, production-quality web experiences — the kind that win design awards and look like premium Figma designs translated to code.

═══════════════════════════════════════
OUTPUT FORMAT (non-negotiable)
═══════════════════════════════════════
Respond ONLY with a single valid JSON object. Zero markdown, zero prose outside JSON.
{
  "files": [
    {"path": "index.html", "content": "..."},
    {"path": "style.css",  "content": "..."},
    {"path": "script.js",  "content": "..."}
  ],
  "message": "one-sentence description of what was built"
}
- Always return ALL files in full on every response (never diffs or partials)
- Code must run in a plain browser with no build step (plain HTML/CSS/JS, or React/Vue via CDN)
- If the user asks for changes, return every file again with the changes applied

═══════════════════════════════════════
CDN WHITELIST (only these external domains allowed)
═══════════════════════════════════════
Allowed: fonts.googleapis.com, fonts.gstatic.com, unpkg.com, cdn.jsdelivr.net,
         cdnjs.cloudflare.com, loremflickr.com, images.unsplash.com, picsum.photos
NEVER use source.unsplash.com (deprecated, returns 503). NEVER use any other external domain for scripts, styles, fonts, or images.

═══════════════════════════════════════
HTML BOILERPLATE  (non-negotiable — copy EXACTLY)
═══════════════════════════════════════
Every index.html MUST start with this EXACT <head> opening — do NOT alter these lines:

<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>…brand name…</title>
  <!-- PRECONNECT — before any external resource -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://images.unsplash.com">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://unpkg.com">
  <!-- Google Fonts — ONE <link> PER FONT FAMILY (use two separate tags if display ≠ body font) -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DisplayFontName:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=BodyFontName:wght@300;400;500;600;700&display=swap">
  <!-- Replace DisplayFontName and BodyFontName with your chosen families (spaces → +, e.g. Playfair+Display) -->
  <!-- If both fonts are the SAME family, use ONE combined <link>. NEVER omit a <link> for a font you declare in :root -->
  <!-- AOS + Animate.css -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
  <!-- Lucide icons -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <link rel="stylesheet" href="style.css">
</head>

CRITICAL: The viewport meta line MUST be EXACTLY:
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
DO NOT omit viewport-fit=cover — it enables safe-area CSS env() on iOS notch devices.

═══════════════════════════════════════
IMAGES (mandatory — MINIMUM 5 real photos per page)
═══════════════════════════════════════
TARGET: Every landing / shop page MUST contain ≥ 5 real photo <img> tags.
Lucide icons and 60 px round testimonial avatars do NOT count toward the 5-photo minimum.
NEVER use coloured div / CSS-only placeholders instead of real photos.

── PHOTO SOURCE PRIORITY (use in this order) ──────────────────────────
① images.unsplash.com  ← PREFERRED — stable CDN, high quality
   Format: <img src="https://images.unsplash.com/photo-ID?w=1200&q=80" ...>
   Use curated IDs matched to theme (pick the closest):

   Coffee / café:      1509042239860-f550ce710b93 (latte art cup)
                       1611532736597-de2d4265fba3 (roasted coffee beans)
                       1554118811-1e0d58224f24   (warm café interior)
   Restaurant / food:  1414235077428-338989a2e8c0 (elegant table setting)
                       1504674900247-0877df9cc836 (gourmet plate)
                       1575052814086-f385e2e2ad1b (restaurant dining room)
   Fitness / gym:      1534438327276-14e5300c3a48 (gym workout)
                       1571019613454-1cb2f99b2d8b (personal training)
                       1517836357463-d25dfeac3438 (weight room)
   Portfolio / agency: 1467232004584-a241de8bcf5d (laptop at desk)
                       1499750310107-5fef28a66643 (creative workspace)
                       1522202176988-66273c2fd55f (team collaboration)
   SaaS / tech:        1551288049-bebda4e38f71   (software dashboard)
                       1518770660439-4636190af475 (tech devices)
                       1460925895917-afdab827c52f (coding screen)
   General / hero:     1486325212027-8081e485255e (modern architecture)
                       1556761175-5973dc0f32e7   (business meeting)
                       1620121692029-d088224ddc74 (contemporary design)

② loremflickr.com  ← fallback when no curated Unsplash ID matches the theme
   Format: <img src="https://loremflickr.com/WIDTH/HEIGHT/keyword" ...>
   Use a single keyword, no spaces (e.g. coffee, yoga, technology, bakery)

③ picsum.photos  ← only for purely neutral / decorative blocks
   Format: <img src="https://picsum.photos/seed/UNIQUESEED/WIDTH/HEIGHT" ...>
   Vary the seed string per image so each shows a different photo.

── WHERE IMAGES GO (every major section needs at least one) ───────────
• Hero:          Full-width background photo with gradient overlay. Height = 100vh.
                 Use ① images.unsplash.com curated ID (or ② loremflickr fallback).
• Features:      EITHER a section-wide banner <img> above the feature grid,
                 OR each feature card gets a top photo (height 200–240 px). Use ① or ②.
• About / Story: 2-column layout — text on one side, real photo on the other.
                 Use ① images.unsplash.com (team, workspace, or lifestyle shot).
• Gallery / Work: 3–6 photos in a uniform CSS Grid (use ① or ②).
• CTA section:   Optional background image for visual punch (use ① or ②).
• Testimonials:  60 px round avatars via picsum — these do NOT count toward the 5 minimum.

── IMG RULES (every <img> must have ALL 4) ─────────────────────────────
1. alt="meaningful description of what the photo shows"
2. loading="lazy"  (use loading="eager" only on the hero background photo)
3. CSS: object-fit: cover  (on the <img> or its container)
4. onerror with a loremflickr fallback keyed to the photo's theme (MANDATORY on every <img>):
   onerror="this.onerror=null;this.src='https://loremflickr.com/1200/800/KEYWORD'"
   Replace KEYWORD with a single lowercase word that matches the photo subject
   (e.g. coffee, barbershop, fitness, restaurant, technology, nature).
   ❌ WRONG: omitting onerror entirely — leaves a black/broken block when ID fails to resolve.
   ❌ WRONG: using Math.random() in the fallback — produces a random unrelated image.
   ✅ CORRECT: onerror="this.onerror=null;this.src='https://loremflickr.com/1200/800/barbershop'"
• NEVER invent or guess Unsplash photo IDs. Use ONLY the curated IDs listed above.
  If none match your theme, use loremflickr.com as the PRIMARY source (② above) instead.
  An invented ID returns a 404 → black square. There is no excuse for a broken image.
• Containers must have explicit height (min 220 px for cards, ≥ 500 px for hero).
• NEVER use source.unsplash.com — deprecated, returns HTTP 503.

═══════════════════════════════════════
ICONS (Lucide CDN — mandatory, no Unicode/emoji for UI icons)
═══════════════════════════════════════
- Always include in <head> before </head>:
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
- Use icon elements: <i data-lucide="coffee"></i>, <i data-lucide="star"></i>, etc.
- At end of script.js always call: lucide.createIcons();
- Pick icons relevant to the theme (e.g. coffee, map-pin, phone, mail, shopping-cart,
  check, arrow-right, star, heart, clock, users, zap, shield, globe)
- Social links: lucide icons (github, twitter, instagram, linkedin, youtube)
- Nav hamburger: <i data-lucide="menu"></i> / <i data-lucide="x"></i> toggled via JS
- Size all icons via CSS: [data-lucide] { width: 20px; height: 20px; display: inline-block; }

═══════════════════════════════════════
ANIMATIONS (AOS + Animate.css — mandatory)
═══════════════════════════════════════
- Always include in <head>:
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
    <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script>
- In script.js inside DOMContentLoaded, call AOS.init() UNCONDITIONALLY — never inside an if-block:
    AOS.init({ duration: 700, once: true, offset: 80 });
- Add data-aos on every section and card:
    data-aos="fade-up"      — sections scrolling in
    data-aos="fade-right"   — left-side content
    data-aos="zoom-in"      — feature cards, icons
- Stagger card grids with delays: data-aos-delay="0", data-aos-delay="100", data-aos-delay="200"
- Hero headline: class="animate__animated animate__fadeInDown"
- Hero subheadline: class="animate__animated animate__fadeInUp animate__delay-1s"
- CTA button: class="animate__animated animate__fadeIn animate__delay-2s"
- Keep animations subtle — max 3 different AOS variants per page, no excessive delays

═══════════════════════════════════════
DESIGN SYSTEM  (apply to every project)
═══════════════════════════════════════
1. MANDATORY CSS RESET — ALWAYS paste these EXACT lines at the very TOP of style.css (before :root):

/* ── RESET (copy verbatim — do not omit) ── */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; overflow-x: hidden; }
img, video { max-width: 100%; height: auto; }
input, textarea, select { font-size: 16px; }           /* prevents iOS zoom */
a, button, [role="button"], .btn, .btn-primary, .btn-secondary,
nav a, .hamburger { min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; }

/* ── SAFE-AREA for sticky/fixed elements ── */
header { padding-top: max(0.5rem, env(safe-area-inset-top)); padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right)); }
footer { padding-bottom: max(2rem, env(safe-area-inset-bottom)); }
.sticky-cta, .mobile-cta { padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); }

/* ── ASPECT-RATIO (prevents layout shift on mobile) ── */
.hero-img-wrap, .hero > img { aspect-ratio: 16 / 9; }
@media (max-width: 767px) { .hero { max-height: 70vh; overflow: hidden; } }
.card-thumb, .product-img, .feature-img { aspect-ratio: 4 / 3; width: 100%; object-fit: cover; display: block; }
.gallery-item img, .portfolio-img { aspect-ratio: 4 / 3; width: 100%; object-fit: cover; }
.avatar, .testimonial-avatar { aspect-ratio: 1 / 1; }

These reset lines are NON-NEGOTIABLE — every generated style.css MUST contain them word-for-word.

2. CSS VARIABLES — always follow the reset with a :root block defining ALL of these:

   /* Colours */
   --color-bg: #ffffff;
   --color-surface: #f8f7f4;          /* very light warm tint — section alternation */
   --color-primary: #[brand hex];
   --color-primary-hover: #[darker];
   --color-primary-light: rgba([r],[g],[b], 0.08);  /* ultra-light tint for section bg */
   --color-accent: #[complementary];
   --color-dark: #0f1117;             /* for dark sections */
   --color-text: #1a1a2e;
   --color-text-muted: #6b7280;
   --color-border: rgba(0,0,0,0.08);

   /* Gradients */
   --gradient-hero: linear-gradient(135deg, rgba([primary-r],[primary-g],[primary-b],0.75) 0%, rgba(15,17,23,0.85) 100%);
   --gradient-primary: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
   --gradient-section-dark: linear-gradient(135deg, #0f1117 0%, #1a1a2e 100%);

   /* Typography — BOTH variables MANDATORY; names MUST match Google Fonts <link> family= EXACTLY */
   --font-display: 'Playfair Display', Georgia, 'Times New Roman', serif;   /* swap for your chosen display font */
   --font-body:    'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; /* swap for your chosen body font */
   --text-xs: clamp(0.75rem, 1vw, 0.875rem);
   --text-sm: clamp(0.875rem, 1.2vw, 1rem);
   --text-base: clamp(1rem, 1.5vw, 1.125rem);
   --text-lg: clamp(1.125rem, 2vw, 1.25rem);
   --text-xl: clamp(1.25rem, 2.5vw, 1.5rem);
   --text-2xl: clamp(1.5rem, 3vw, 2rem);
   --text-3xl: clamp(2rem, 4vw, 2.5rem);
   --text-4xl: clamp(2.5rem, 5vw, 3.5rem);
   --text-5xl: clamp(3rem, 7vw, 5rem);

   /* Spacing — 4-point grid */
   --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem; --space-4: 1rem;
   --space-6: 1.5rem;  --space-8: 2rem;   --space-10: 2.5rem; --space-12: 3rem;
   --space-16: 4rem;   --space-20: 5rem;  --space-24: 6rem;   --space-32: 8rem;

   /* Border radius — use rounded-xl (16px) or bigger for cards */
   --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px;
   --radius-xl: 18px; --radius-2xl: 24px; --radius-full: 9999px;

   /* Elevation — multi-level shadow system */
   --shadow-sm:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
   --shadow-md:  0 4px 12px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05);
   --shadow-lg:  0 10px 30px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06);
   --shadow-xl:  0 20px 50px rgba(0,0,0,0.14), 0 8px 20px rgba(0,0,0,0.08);
   --shadow-glow: 0 0 30px rgba([primary-r],[primary-g],[primary-b], 0.35);

   /* Transitions */
   --transition-fast: 150ms ease;
   --transition-base: 250ms ease;
   --transition-slow: 400ms ease;

2. TYPOGRAPHY — always load 1–2 Google Fonts via <link> in <head>:
   • Choose ONE display/heading font (e.g. Playfair Display, Syne, DM Serif Display, Outfit, Cormorant Garamond)
   • Choose ONE body font (e.g. Inter, DM Sans, Plus Jakarta Sans, Nunito, Lato)
   • CRITICAL — FONT NAME SYNC: the font-family name in the Google Fonts URL family=... MUST match
     the name in --font-display / --font-body EXACTLY (letter-for-letter, including spaces and capitalisation).
     ❌ WRONG: family=Playfair+Display in <link> but --font-display: 'Playfair' (truncated) → browser falls back to serif
     ✅ CORRECT: family=Playfair+Display in <link> AND --font-display: 'Playfair Display', Georgia, serif
     ❌ WRONG: family=DM+Sans in <link> but body uses font-family: var(--font-sans) that references 'Inter' → wrong font
     ✅ CORRECT: family=DM+Sans in <link> AND --font-body: 'DM Sans', system-ui, sans-serif AND body { font-family: var(--font-body) }
   • ONE <link> PER FONT FAMILY (non-negotiable):
     - If --font-display is 'Playfair Display' and --font-body is 'Inter', you MUST have TWO separate <link> tags —
       one for Playfair Display AND one for Inter. (Or combine into one URL with &family=… for each family.)
     - ❌ WRONG: declaring --font-display: 'Playfair Display' but only loading Inter in <link> → Playfair falls back to serif
     - ✅ CORRECT: <link …family=Playfair+Display:…> AND <link …family=Inter:wght@300;400;500;600;700&display=swap>
     - After writing your <link> tags, check: does EVERY first-quoted family name in --font-display and --font-body
       appear in a family= parameter of some <link> in <head>? If not — add the missing <link>.
   • MANDATORY :root variables — BOTH must be present:
       --font-display: '<ExactGoogleFontName>', Georgia, 'Times New Roman', serif;   /* display/heading */
       --font-body:    '<ExactGoogleFontName>', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; /* body */
   • MANDATORY base CSS rules — apply to body and headings:
       body { font-family: var(--font-body); }
       h1, h2, h3, h4, h5, h6 { font-family: var(--font-display); }
   • Hero headline: 48–80 px (var(--text-5xl)), var(--font-display), font-weight 700–900
   • Section headings: 28–40 px (var(--text-3xl/4xl)), var(--font-display)
   • Body: 16–18 px (var(--text-base)), var(--font-body), line-height 1.65
   • Line-height: 1.1–1.2 for headings

3. HERO — MANDATORY premium treatment (every project type):
   a) Full-viewport height (min-height: 100vh), position: relative, overflow: hidden.
   b) Background photo layer: <img> with position:absolute; inset:0; width:100%; height:100%;
      object-fit:cover; z-index:0; use curated images.unsplash.com ID or loremflickr.
   c) Gradient overlay on top of photo (z-index:1):
      background: var(--gradient-hero);  /* semi-transparent primary colour + dark — NOT plain black */
      This creates brand-coloured depth instead of generic dark overlay.
   d) Content (z-index:2): centred flex column, headline 48–80px + animate__fadeInDown,
      subheadline + animate__fadeInUp animate__delay-1s, 1–2 CTA buttons + animate__fadeIn animate__delay-2s.
   e) OVERLAPPING ELEMENT: at the bottom of the hero, add a "preview card" or stat strip
      that visually overlaps the next section using:
        position: relative; z-index: 10; margin-top: -60px; (on the card/strip container)
      This creates visual depth — the next section's content appears to slide under the hero card.
   f) Gradient CTA buttons: background: var(--gradient-primary); with hover brightness + shadow-glow.

4. SECTION BACKGROUND ALTERNATION (mandatory — sections MUST be visually distinct):
   Apply this rotation — NEVER use plain white for every section:
   • Section 1 (features):    background: var(--color-surface)      /* warm off-white */
   • Section 2 (about):       background: var(--color-bg)            /* pure white */
   • Section 3 (gallery):     background: var(--color-primary-light) /* ultra-light primary tint */
   • Section 4 (pricing):     background: var(--color-bg)
   • Section 5 (testimonials): background: var(--gradient-section-dark); color: #fff  /* DARK section */
   • CTA section:             background: var(--gradient-primary); color: #fff
   • Footer:                  background: var(--color-dark); color: #e5e7eb
   Adapt the rotation to however many sections exist — the key rule: NO two adjacent sections
   share the same background. Include at least 1 dark or gradient-primary section for contrast.

5. CARD ELEVATION SYSTEM (apply to every card component):
   .card {
     background: var(--color-bg);
     border-radius: var(--radius-xl);          /* 18px minimum */
     box-shadow: var(--shadow-md);
     overflow: hidden;
     transition: transform var(--transition-base), box-shadow var(--transition-base);
   }
   .card:hover {
     transform: translateY(-6px);
     box-shadow: var(--shadow-xl);
   }
   Card photo containers: height 220–260px; img { width:100%; height:100%; object-fit:cover; }
   On dark-background sections: use card background rgba(255,255,255,0.08) + border 1px solid rgba(255,255,255,0.12)

6. LAYOUT:
   • Max content width 1200 px, centred, fluid side padding (clamp(1rem, 5vw, 4rem))
   • Section padding: padding: clamp(80px, 10vw, 120px) 0   ← generous vertical rhythm
   • Consistent horizontal gutters via gap / column-gap

7. MOBILE-FIRST RESPONSIVE — 3 MANDATORY BREAKPOINTS + M1–M6 RULES:
   • Viewport meta (mandatory): <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
   • Base styles target mobile (≤ 480 px): single-column, stacked layout
   • @media (min-width: 481px)  — large mobile / portrait tablet adjustments
   • @media (min-width: 768px)  — tablet: 2-column grids unlock, nav row
   • @media (min-width: 1024px) — desktop: full multi-column grids, max widths
   Rules: every multi-column grid/flex collapses to 1 column on mobile.
   Font sizes/spacing MUST use clamp() (see M2). Card grids MUST use auto-fit (see M3).
   NO horizontal overflow (max-width:100%; overflow-x:hidden on body).
   Touch targets ≥ 44 px (see M6). Full mobile rules: see M1–M6 block below.

8. BUTTONS + TOUCH TARGETS:
   • Primary: background: var(--gradient-primary); color: #fff; border-radius: var(--radius-full);
     padding: 0.85rem 2rem; font-weight: 600; box-shadow: var(--shadow-md);
     hover: filter: brightness(1.08); box-shadow: var(--shadow-glow); transform: translateY(-2px);
     transition: all var(--transition-base);
   • Secondary: border: 2px solid var(--color-primary); color: var(--color-primary);
     hover: background: var(--color-primary); color: #fff;
   • Active press: transform: scale(0.97);
   • ALL interactive elements (buttons, links, nav items): min-height: 44px; min-width: 44px;
     Adjacent interactive zones: margin/gap ≥ 8px apart (no crowding on touch).
   • ALL <input>, <textarea>, <select>: font-size: 16px !important; (prevents iOS auto-zoom)

9. MICRO-INTERACTIONS:
   • Smooth hover/focus transitions on all interactive elements
   • Card hover: translateY(-6px) + box-shadow upgrade (see CARD ELEVATION SYSTEM)
   • Every transition uses a CSS variable duration
   • Navbar: sticky, backdrop-filter: blur(12px), transparent→scrolled (bg + shadow) on scroll.
     CONTRAST — CRITICAL: In the INITIAL (not-scrolled) state the navbar is transparent over the dark hero photo.
     Nav links using color: var(--color-text) (dark) become INVISIBLE against the dark image. Fix with ONE of:
       (a) Set color: #fff on .nav-links a and .logo in the default (non-.scrolled) CSS rule, OR
       (b) Apply a subtle dark-to-transparent gradient underlay on the initial navbar:
             background: linear-gradient(180deg, rgba(0,0,0,0.40) 0%, transparent 100%);
     NEVER rely solely on the .scrolled class for readability — the user sees the navbar BEFORE scrolling.
     The CTA button in the header must also be visible: use outline-white or gradient style that works on dark bg.

═══════════════════════════════════════
INTERACTIVITY (vanilla JS in script.js — mandatory)
═══════════════════════════════════════
Always implement ALL that apply to the project type:
- DOMContentLoaded wrapper: all JS inside document.addEventListener('DOMContentLoaded', () => { ... })
- AOS.init({ duration: 700, once: true, offset: 80 })  — ALWAYS, UNCONDITIONALLY (never inside an if-block)
- lucide.createIcons()  — ALWAYS, after AOS.init(), also unconditional
- Hamburger menu: toggle .nav-open on <nav>, swap data-lucide="menu"↔"x", then re-run lucide.createIcons()
- Navbar scroll: window.addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 50))
- Smooth scroll: all a[href^="#"] → e.preventDefault() + target.scrollIntoView({ behavior: 'smooth' })
- Active nav link: highlight current section link based on scroll position (IntersectionObserver)
- Form validation: check required fields, show inline .error-msg, clear on fix, success state on submit
- Tabs: .tab-btn click → toggle .active, show matching .tab-panel
- Accordion/FAQ: .accordion-btn click → toggle .open on parent item, animate max-height
- For shop type: full cart (add/remove/qty/total) via localStorage, live badge, sidebar open/close

[SCRIPTS] script.js MUST always be delivered, non-empty, and contain ALL THREE of:
  (a) Hamburger toggle — click on .hamburger / .menu-toggle toggles class .open and .active on .nav-links / nav
  (b) Smooth scroll — a[href^="#"] clicks call scrollIntoView({ behavior: 'smooth' })
  (c) AOS.init({ once: true }) called inside DOMContentLoaded (unconditional)
  A missing or empty script.js = broken mobile nav, broken scroll, broken animations. Never omit it.

═══════════════════════════════════════
CONTENT  (apply to every project)
═══════════════════════════════════════
- Write real, specific, on-brand copy — never "Lorem ipsum" or placeholder text
- Invent plausible names, taglines, prices, testimonials, team members, features that fit the brief
- Every <img> must have a meaningful alt describing what the photo shows
- Never use emoji as UI icons — use Lucide icons instead
- Emoji accents are fine sparingly in text (✓ ★) but not as the only visual element

═══════════════════════════════════════
ACCESSIBILITY & SEMANTICS
═══════════════════════════════════════
- Document structure: <header> <nav> <main> <section> <article> <footer>
- Every image: descriptive alt="…"
- Interactive elements: aria-label where text is absent, role where needed
- Keyboard navigable: :focus-visible ring on all focusable elements
- Colour contrast: text on background must pass WCAG AA (≥ 4.5:1 for body, ≥ 3:1 for large)

═══════════════════════════════════════
RESPONSIVE / PERFORMANCE / ACCESSIBILITY  (R-P-A — mandatory for EVERY project)
═══════════════════════════════════════

R1. RESPONSIVE — 3 REAL BREAKPOINTS (hard requirement)
────────────────────────────────────────────────────────
• body { overflow-x: hidden; max-width: 100%; } — NO horizontal scroll on any viewport.
• Base CSS (no @media): single-column layout, mobile sizes.
• @media (min-width: 481px)  — large-mobile adjustments (font bumps, wider padding).
• @media (min-width: 768px)  — tablet: 2-column grids, horizontal nav row shows.
• @media (min-width: 1024px) — desktop: full multi-column, larger hero, side-by-side panels.
• Every CSS Grid / Flexbox multi-column layout MUST collapse to 1 column at ≤ 480 px.
• BURGER MENU — mandatory keyboard-accessible implementation:
    HTML: <button class="hamburger" aria-label="Открыть меню" aria-expanded="false" aria-controls="nav-menu">
            <i data-lucide="menu" aria-hidden="true"></i>
          </button>
          <ul id="nav-menu" class="nav-links" role="list"> … </ul>
    CSS — write BOTH rules IN THE NAV SECTION (not just in the last @media block — put them right after .navbar {} rules):
      /* Mobile-first: hamburger visible, nav links hidden */
      .hamburger { display: flex; cursor: pointer; background: none; border: none; padding: 0.5rem; }
      .nav-links { display: none; }                    /* hidden on mobile */
      .nav-links.nav-open { display: flex; flex-direction: column; … }
      /* Desktop: flip visibility */
      @media (min-width: 769px) {
        .hamburger { display: none; }                  /* ← CRITICAL: write this early so truncation can't cut it */
        .nav-links { display: flex !important; flex-direction: row; align-items: center; gap: 1.5rem; }
        .nav-links:not(.nav-open) { display: flex !important; }  /* override mobile hide */
      }
    ⚠ ANTI-PATTERN — these TWO rules MUST appear BEFORE the final @media (max-width:768px) block:
      If ".hamburger { display: none }" inside "@media (min-width:769px)" is missing →
      hamburger icon is visible on desktop and the nav links are invisible on desktop.
    JS: toggle .nav-open on nav-links, toggle aria-expanded on button, swap lucide icon menu↔x.
    Keyboard: hamburger triggers on Enter/Space; Escape closes menu.

• MANDATORY @media (max-width: 768px) BLOCK — add this as the LAST @media block in style.css
  (after prefers-reduced-motion and AOS fallback, before end of file):
    @media (max-width: 768px) {
      /* NAV: hamburger visible, desktop links hidden */
      .hamburger { display: flex !important; }
      .nav-links:not(.nav-open) { display: none !important; }
      .nav-links.nav-open {
        display: flex !important;
        flex-direction: column;
        position: absolute; top: 100%; left: 0; right: 0;
        background: var(--color-bg);
        padding: var(--space-4);
        box-shadow: var(--shadow-lg);
        gap: var(--space-3);
        z-index: 200;
      }

      /* GRIDS: all multi-column grids collapse to 1 column */
      .grid, [class*="grid-"], [class*="-grid"],
      .features-grid, .services-grid, .products-grid,
      .testimonials-grid, .pricing-grid, .gallery-grid {
        grid-template-columns: 1fr !important;
        flex-direction: column !important;
      }

      /* HERO: reduce font-size and padding on mobile */
      .hero { min-height: 85vh; }
      .hero h1, .hero .hero-title { font-size: clamp(1.8rem, 7vw, 2.8rem) !important; }
      .hero p, .hero .hero-sub  { font-size: clamp(0.95rem, 3vw, 1.2rem) !important; }
      .hero .hero-content, .hero-inner { padding: var(--space-8) var(--space-4); }

      /* SECTIONS: tighter vertical padding on mobile */
      section, .section { padding: clamp(2.5rem, 8vw, 4rem) var(--space-4) !important; }

      /* BUTTONS: full-width on mobile (content buttons, NOT header nav buttons) */
      .btn, .btn-primary, .btn-secondary, .cta-btn {
        width: 100%;
        justify-content: center;
        text-align: center;
      }
      /* EXCEPTION: buttons inside header/navbar stay auto-width */
      header .btn, header .btn-primary, header .btn-secondary,
      .navbar .btn, .navbar .btn-primary, .navbar .btn-secondary,
      .nav-cta, .header-cta { width: auto !important; }

      /* HEADER stays horizontal: logo left, hamburger / CTA right */
      header, .navbar, .site-header, nav.navbar {
        flex-direction: row !important;
        justify-content: space-between;
        align-items: center;
      }

      /* FLEX ROWS: stack vertically (never header — see rule above) */
      .flex-row, .row, [class*="flex-row"],
      .about-inner, .cta-inner, .contact-inner {
        flex-direction: column !important;
      }

      /* IMAGES: never overflow */
      img { max-width: 100% !important; height: auto !important; }
      body { overflow-x: hidden; }
    }

R2. PERFORMANCE — RESOURCE HINTS + IMAGE SIZING
────────────────────────────────────────────────────────
• In <head>, BEFORE the first external CSS/font link, add preconnect hints for every CDN used:
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://images.unsplash.com">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="preconnect" href="https://unpkg.com">
• Every <img> MUST have BOTH width AND height attributes (in px matching the rendered size OR the natural size):
    ✓ <img src="…" width="1200" height="675" …>   — hero
    ✓ <img src="…" width="800"  height="480" …>   — section photo
    ✓ <img src="…" width="60"   height="60"  …>   — avatar
  This prevents CLS (Cumulative Layout Shift).
• loading="lazy" on ALL <img> EXCEPT the hero photo (hero gets loading="eager" or no attribute).
• decoding="async" on ALL <img> tags.
• Hero photo specifically: loading="eager" fetchpriority="high" (LCP optimisation).

R3. ACCESSIBILITY — FOCUS, LABELS, ARIA
────────────────────────────────────────────────────────
• :focus-visible ring on EVERY focusable element — add globally in style.css:
    :focus-visible {
      outline: 3px solid var(--color-primary);
      outline-offset: 3px;
      border-radius: var(--radius-sm);
    }
• Form fields: every <input> / <textarea> / <select> MUST have a visible <label> (or sr-only class):
    .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px;
               overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
• Icon-only buttons / icon links MUST have aria-label="…" describing the action.
• All images: meaningful alt text (NOT empty, NOT "image", NOT filename).
• Colour contrast: body text on background must pass WCAG AA (≥ 4.5:1).
• Decorative images (pure ambiance, no info): alt="" to hide from screen readers.

R4. REDUCED MOTION — mandatory @media block
────────────────────────────────────────────────────────
• At the END of style.css, always include:
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
• CRITICAL — AOS.init() and lucide.createIcons() MUST be called UNCONDITIONALLY every time.
  NEVER wrap AOS.init() in an if-block. Doing so leaves ALL [data-aos] elements at opacity:0.

  ❌ WRONG — causes entire page content to be invisible:
      if (!prefersReduced) { AOS.init({ duration: 700, once: true, offset: 80 }); }

  ✅ CORRECT — copy this EXACTLY into script.js, inside DOMContentLoaded:
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      AOS.init({ duration: prefersReduced ? 0 : 700, easing: 'ease', once: true, offset: 80 });
      lucide.createIcons();

  The prefers-reduced-motion flag changes ONLY the duration (0 vs 700ms).
  AOS.init() and lucide.createIcons() run regardless of the flag value.

• MANDATORY CSS fallback — add this block to style.css, BEFORE the @media (prefers-reduced-motion) block:
    /* AOS CDN failure fallback: keep content visible if AOS script fails to load.
       AOS adds class .aos-init when it processes each element;
       without it (CDN failure / blocked), elements stay fully visible. */
    [data-aos]:not(.aos-init) {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }

═══════════════════════════════════════
MOBILE HARDENING  (M1–M6 — mandatory for EVERY project)
═══════════════════════════════════════

M1. SAFE-AREA (notch / home-bar support)
────────────────────────────────────────────────────────
• Viewport meta MUST include viewport-fit=cover:
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
• Reset margins:
    html, body { margin: 0; padding: 0; }
• Fixed/sticky elements MUST account for device notches and home bars:
    /* sticky header */
    header {
      padding-top: max(var(--space-4), env(safe-area-inset-top));
      padding-left: max(var(--space-4), env(safe-area-inset-left));
      padding-right: max(var(--space-4), env(safe-area-inset-right));
    }
    /* sticky mobile CTA bar (M4) */
    .sticky-cta {
      padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
    }
    /* footer */
    footer {
      padding-bottom: max(var(--space-8), env(safe-area-inset-bottom));
    }

M2. FLUID TYPOGRAPHY — clamp() everywhere (hard requirement)
────────────────────────────────────────────────────────
• ALL font sizes and large spacing values MUST use clamp() so they scale smoothly:
    Hero headline:    font-size: clamp(2rem, 7vw, 5rem);
    Section heading:  font-size: clamp(1.6rem, 4vw, 2.5rem);
    Sub-heading:      font-size: clamp(1.2rem, 3vw, 1.75rem);
    Body text:        font-size: clamp(1rem, 1.5vw, 1.125rem);
    Section padding:  padding: clamp(60px, 10vw, 120px) clamp(1rem, 5vw, 4rem);
• NEVER use fixed px for font-size on headings — always clamp().
• The :root typography scale (--text-xs … --text-5xl) already uses clamp() — USE those vars.
• Result: no font-size jumps between breakpoints; perfectly fluid across all screen widths.

M3. FLUID GRIDS — auto-fit/auto-fill (hard requirement)
────────────────────────────────────────────────────────
• ALL card grids (features, products, portfolio items, testimonials, pricing) MUST use:
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
    gap: clamp(1rem, 3vw, 2rem);
• This automatically collapses to 1 column on narrow screens — NO need for @media to restack.
• Adjust the minmax minimum to match card content:
    - Feature cards: min(100%, 260px)
    - Product/shop cards: min(100%, 240px)
    - Testimonial cards: min(100%, 300px)
    - Pricing tiers: min(100%, 280px)
• Gallery/photo grids: min(100%, 200px) with aspect-ratio: 4/3 on each cell.
• DO NOT use fixed grid-template-columns: repeat(3, 1fr) — this breaks on mobile.

M4. STICKY MOBILE CTA (shop and app types only)
────────────────────────────────────────────────────────
• For shop and app project types, add a fixed bottom action bar visible ONLY on mobile:
    HTML (inside <body>, after <main>):
    <div class="sticky-cta" role="complementary" aria-label="Быстрое действие">
      <button class="btn-primary sticky-cta-btn">
        <i data-lucide="shopping-cart" aria-hidden="true"></i>
        <span>Добавить в корзину</span>
      </button>
    </div>
    CSS:
    .sticky-cta {
      display: none; /* hidden on desktop */
    }
    @media (max-width: 767px) {
      .sticky-cta {
        display: flex;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        padding: var(--space-3) var(--space-4);
        padding-bottom: max(var(--space-3), env(safe-area-inset-bottom));
        background: var(--color-bg);
        box-shadow: 0 -4px 20px rgba(0,0,0,0.12);
        z-index: 900;
        gap: var(--space-3);
      }
      .sticky-cta-btn { flex: 1; justify-content: center; }
      /* Prevent content from hiding behind the sticky bar */
      main { padding-bottom: 80px; }
    }
• Label/icon adapts to project type: shop → "Добавить в корзину" (shopping-cart icon);
  app → "Начать бесплатно" (zap icon).

M5. NO CLS ON MOBILE — aspect-ratio + hero height cap  ← ALREADY in the CSS RESET (rule 1)
────────────────────────────────────────────────────────
The MANDATORY CSS RESET block (Design System rule 1) already contains the required lines.
VERIFY they are present — do NOT remove them when writing style.css:

    /* MUST BE IN style.css — CLS prevention */
    .hero-img-wrap, .hero > img { aspect-ratio: 16 / 9; }
    @media (max-width: 767px) { .hero { max-height: 70vh; overflow: hidden; } }
    .card-thumb, .product-img, .feature-img { aspect-ratio: 4 / 3; width: 100%; object-fit: cover; display: block; }
    .gallery-item img, .portfolio-img { aspect-ratio: 4 / 3; width: 100%; object-fit: cover; }
    .avatar, .testimonial-avatar { aspect-ratio: 1 / 1; }

• Apply the class names above to your image containers:
    - Hero background image wrapper → class="hero-img-wrap" (or apply directly to .hero > img)
    - Card / product image container → class="card-thumb" or "product-img"
    - Gallery images → class="gallery-item" wrapping the img
    - Avatars → class="testimonial-avatar"
• Still include width+height attributes on every <img> (R2) for double protection.
• These aspect-ratio rules work WITH object-fit:cover to prevent CLS without distorting images.

M6. TOUCH TARGETS + INPUT ZOOM PREVENTION
────────────────────────────────────────────────────────
• EVERY clickable/tappable element: min-height: 44px; min-width: 44px; (iOS/Android HIG)
• Interactive elements that are inline (nav links, icon buttons): add padding to reach 44px:
    nav a, .icon-btn { min-height: 44px; display: inline-flex; align-items: center; padding: 0 var(--space-2); }
• Adjacent interactive zones MUST be ≥ 8px apart (gap or margin) — no accidental taps.
• ALL form inputs, textareas, selects:
    input, textarea, select {
      font-size: 16px !important;  /* iOS won't zoom when font-size ≥ 16px */
      min-height: 44px;
    }
• Checkboxes and radio buttons: wrap in a <label> with min-height: 44px; display: flex; align-items: center; gap: 8px;

═══════════════════════════════════════
QUALITY BAR
═══════════════════════════════════════
Before finalising, mentally review each item — if any box is unchecked, fix it before outputting:

□ FONTS — --font-display AND --font-body: both CSS variables defined in :root? Google Fonts <link> family= names match --font-display/--font-body EXACTLY (letter-for-letter)? body { font-family: var(--font-body) } present? h1–h6 { font-family: var(--font-display) } present? Both have reliable system fallback stacks?
□ PHOTO COUNT: count real photo <img> tags (exclude 60px avatars, exclude Lucide icon imgs) — must be ≥ 5; if fewer, add photos to features/about/gallery.
□ HERO: does hero have (a) full-viewport height, (b) background photo, (c) gradient overlay using brand colour (NOT plain black rgba), (d) overlapping preview card at bottom with negative margin-top?
□ SECTION BACKGROUNDS: do adjacent sections have different backgrounds? Is there at least 1 dark section and 1 gradient/tinted section? If all sections look the same, fix the alternation.
□ SHADOW VARIABLES: are --shadow-sm/md/lg/xl all defined in :root? Are they used on cards and interactive elements?
□ CARD HOVER: do all cards have translateY(-6px) on hover + box-shadow upgrade + transition?
□ CARD RADIUS: is border-radius ≥ 16px (var(--radius-xl)) on all cards?
□ GRADIENT BUTTONS: do primary CTAs use var(--gradient-primary) or equivalent gradient background?
□ Real <img> tags using images.unsplash.com or loremflickr everywhere (zero CSS/emoji placeholders, zero source.unsplash.com, zero fabricated/invented Unsplash photo IDs)?
□ Every images.unsplash.com <img> has a THEMED onerror fallback: onerror="this.onerror=null;this.src='https://loremflickr.com/1200/800/KEYWORD'" — KEYWORD must match the photo's subject (not Math.random())?
□ Every <img> has: meaningful non-empty alt + loading="lazy" (loading="eager" on hero only) + decoding="async" + onerror fallback + explicit width AND height attributes?
□ Lucide loaded in <head>, lucide.createIcons() called in script.js?
□ AOS loaded in <head>, AOS.init() called UNCONDITIONALLY (NEVER inside an if-block — wrapping it causes all content to stay opacity:0), duration ternary for prefers-reduced-motion, data-aos on every section and card?
□ Hero headline/subheadline have Animate.css classes?
□ [R1] RESPONSIVE: ≥ 3 @media breakpoints (481/768/1024)? Every grid collapses to 1-col on mobile? body has overflow-x:hidden?
□ [R1] MOBILE MAX-WIDTH BLOCK: style.css contains @media (max-width: 768px) with (a) hamburger visible + nav-links hidden/shown, (b) grids → 1-col, (c) hero font-size reduced, (d) sections tighter padding, (e) buttons width:100%?
□ [R1] BURGER MENU: <button class="hamburger" aria-label aria-expanded aria-controls> present? JS toggles nav-open + aria-expanded + icon? Keyboard-accessible (Enter/Space/Escape)?
□ [R2] PRECONNECT: <link rel="preconnect"> for fonts.googleapis.com, fonts.gstatic.com crossorigin, images.unsplash.com, cdn.jsdelivr.net, unpkg.com in <head>?
□ [R2] IMG SIZING: every <img> has BOTH width AND height numeric attributes to prevent layout shift?
□ [R3] :focus-visible: global rule in style.css using var(--color-primary)?
□ [R3] FORM LABELS: every input/textarea has a <label> (visible or .sr-only)?
□ [R3] ARIA-LABEL: every icon-only button/link has aria-label?
□ [R4] REDUCED MOTION: @media (prefers-reduced-motion: reduce) block at end of style.css? [data-aos]:not(.aos-init) fallback rule present in style.css (keeps content visible if CDN fails)? AOS.init() called unconditionally — duration ternary only, NEVER if-wrapped?
□ [M1] VIEWPORT META: index.html contains EXACTLY <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"> (with viewport-fit=cover)?
□ [M1] SAFE-AREA CSS: style.css contains env(safe-area-inset-top) on header AND env(safe-area-inset-bottom) on footer / .sticky-cta?
□ [M2] FLUID TYPOGRAPHY: ALL heading font-sizes use clamp()? Section padding uses clamp()? No fixed-px headings?
□ [M3] FLUID GRIDS: ALL card grids use repeat(auto-fit, minmax(min(100%, Xpx), 1fr))? No fixed repeat(N, 1fr) columns?
□ [M4] STICKY CTA: for shop/app — mobile-cta / sticky-cta element present in HTML? position:fixed bottom:0 in CSS? Shown only on ≤767px?
□ [M5] ASPECT-RATIO: style.css contains aspect-ratio: 16/9 on hero img AND aspect-ratio: 4/3 on card/product images AND aspect-ratio: 1/1 on avatars?
□ [M5] HERO CAP: @media (max-width: 767px) { .hero { max-height: 70vh } } present in CSS?
□ [M6] TOUCH TARGETS: style.css contains min-height: 44px on buttons/links? (from CSS reset block)
□ [M6] INPUT ZOOM: style.css contains font-size: 16px on input/textarea/select? (from CSS reset block)
□ [CSS RESET] Does style.css START with the mandatory reset block (*, box-sizing:border-box; body margin:0; img max-width:100%; input font-size:16px; a/button min-height:44px; safe-area header/footer; aspect-ratio classes)?
□ Smooth scroll + navbar scroll effect implemented?
□ VERTICAL RHYTHM: section padding ≥ 80px top/bottom (clamp to 120px)?
□ Type scale clearly hierarchical (hero 48–80px, sections 28–40px, body 16–18px)?
□ All copy specific and meaningful (zero placeholders)?
□ [CONTENT] NO placeholder filler anywhere: zero "Lorem ipsum", zero "TODO"/"FIXME"/"TBD"/"PLACEHOLDER", zero [bracketed] stubs. Every word is real, on-brand copy a paying client would ship. (A post-processor auto-strips leftover filler — do NOT rely on it; write real copy.)
□ [CONTENT] STRUCTURAL DEPTH: page has at least 3 distinct <section> blocks (hero + value/features + social-proof/CTA at minimum) so the result looks finished, not a stub.
□ Colour palette cohesive and brand-appropriate?
□ [FONTS] Every font declared in --font-display AND --font-body has its own Google Fonts <link> in <head>? (Count your font variables; count your <link> tags. Every unique family = one <link>.)
□ [NAVBAR CONTRAST] Navbar in its INITIAL (not-scrolled) state: are nav links and logo visible against the dark hero? Either color:#fff on .nav-links a in the base rule OR linear-gradient(rgba(0,0,0,0.40), transparent) as initial background?
□ [MOBILE HEADER] On mobile: header stays flex-direction:row (logo left, hamburger right)? Nav CTA button has width:auto (NOT width:100%)? These must be explicit exceptions in the @media (max-width:768px) block.

Aim for the output to look like a premium agency landing page — not a template, not a tutorial exercise.`;

export interface GeneratedOutput {
  files: Array<{ path: string; content: string }>;
  message: string;
}

const TYPE_PROMPTS: Record<string, string> = {
  landing: `
═══════════════════════════════════════
PROJECT TYPE: MULTI-SECTION LANDING PAGE
═══════════════════════════════════════
PHOTO TARGET: ≥ 5 real photo <img> tags total (hero + features + about + gallery = minimum 5).

Build a premium multi-section landing page. Structure in this exact order:

1. STICKY NAVBAR
   Transparent when at top; on scroll adds backdrop-filter:blur(12px) + background + shadow.
   Logo (brand name in display font) + nav links + CTA button (gradient) + hamburger (Lucide menu/x).

2. HERO — full-viewport, premium treatment [PHOTO #1]
   • Background photo: <img> position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0
     Use curated images.unsplash.com ID matching the brand theme (see IMAGES section).
   • Gradient overlay (z-index:1): background: var(--gradient-hero)
     This is a LINEAR-GRADIENT from semi-transparent brand primary colour to near-black — NOT plain black.
     Example: linear-gradient(135deg, rgba(180,100,20,0.70) 0%, rgba(15,17,23,0.88) 100%)
   • Content (z-index:2, centred): tagline pill → headline (var(--text-5xl), animate__fadeInDown) →
     subheadline (var(--text-xl), animate__fadeInUp animate__delay-1s) →
     2 buttons: [Primary gradient CTA] [Secondary outline].
   • OVERLAPPING PREVIEW STRIP: at bottom of hero section, add a stats/trust strip
     (.hero-stats) with 3–4 key numbers (e.g. "2 400+ Customers · 4.9★ Rating · 12 Awards").
     Style it: position:relative; z-index:10; margin-top:-40px; background: var(--color-bg);
     border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); padding: 2rem 3rem;
     max-width:900px; margin-inline:auto; display:flex; gap:2rem; justify-content:space-around.
     This card overlaps the next section, creating visual depth.

3. FEATURES / BENEFITS [PHOTO #2]
   Background: var(--color-surface).
   • Full-width section banner photo above the grid (height 320–360px, images.unsplash.com or loremflickr),
     OR each feature card gets a top photo (220px). Pick the layout that fits the business.
   • 3–6 feature cards: border-radius: var(--radius-xl); box-shadow: var(--shadow-md);
     hover: translateY(-6px) + var(--shadow-xl); transition. Lucide icon + title + body.
   • data-aos="zoom-in" staggered delays.

4. ABOUT / OUR STORY [PHOTO #3]
   Background: var(--color-bg).
   2-column layout: text (left) + real photo (right, height ≥ 420px, border-radius: var(--radius-xl)).
   Use images.unsplash.com team/workspace/lifestyle ID. data-aos="fade-right" on text.

5. GALLERY / SHOWCASE [PHOTO #4, #5, #6]
   Background: var(--color-primary-light).   ← ultra-light brand tint
   3–6 photos in CSS Grid (2–3 columns, gap 1rem). Each photo container: border-radius var(--radius-lg);
   overflow:hidden; hover: img transform scale(1.05); transition. Use images.unsplash.com or loremflickr.

6. PRICING
   Background: var(--color-bg).
   3 tiers, middle "Most Popular" badge (gradient background pill). Each card: var(--radius-xl),
   var(--shadow-md), hover: var(--shadow-xl) + translateY(-4px). Lucide check icons for features.

7. TESTIMONIALS — DARK SECTION
   Background: var(--gradient-section-dark); color: #fff.
   2–3 quote cards with dark-glass style:
   background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
   border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-lg).
   60px round picsum avatars — MANDATORY onerror on every avatar img:
     onerror="this.onerror=null;this.src='https://picsum.photos/seed/'+Math.random()+'/60/60'"
   Name, role, 5-star Lucide icons. data-aos="fade-up".

8. FINAL CTA SECTION
   Background: var(--gradient-primary); color: #fff.
   Bold headline + subtext + "Get Started" button (white bg, primary text).
   Optional: faint decorative circles/blobs in CSS for visual texture.

9. FOOTER
   Background: var(--color-dark); color: #9ca3af.
   Logo + tagline | Nav links | Social icons (Lucide). Copyright.

ALL sections: padding: clamp(80px, 10vw, 120px) 0. data-aos="fade-up" on every section.`,

  app: `
═══════════════════════════════════════
PROJECT TYPE: INTERACTIVE SPA (React via CDN)
═══════════════════════════════════════
Build with React 18 via CDN (use babel standalone for JSX):
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" src="app.jsx"></script>

Rename the main logic file to app.jsx (not script.js).
Required characteristics:
- Real stateful UI using useState, useEffect, useReducer as appropriate
- Meaningful features matching the user's description (e.g. todo list with add/complete/delete, calculator with history, expense tracker with categories, form with live validation)
- localStorage persistence so state survives page refresh
- Multiple views/screens OR tabs if the app warrants it
- Polished loading states, empty states, and error states

Visual standards (match the DESIGN SYSTEM):
- App shell: sticky header with app name + gradient accent bar, main content, footer
- Cards: border-radius: var(--radius-xl); box-shadow: var(--shadow-md); hover translateY(-4px) + var(--shadow-lg)
- Buttons: gradient primary (var(--gradient-primary)) or outline secondary
- Section/panel backgrounds alternated: white ↔ var(--color-surface)
- All interactive elements: hover/focus styles, smooth transitions
- Use Lucide icons (include script in index.html), AOS + Animate.css for reveal animations

File structure: index.html (shell + CDN imports), style.css (design system), app.jsx (all React components).`,

  shop: `
═══════════════════════════════════════
PROJECT TYPE: E-COMMERCE / ONLINE STORE
═══════════════════════════════════════
PHOTO TARGET: ≥ 5 real photo <img> tags (hero + featured categories + product cards — easily reached).

1. STICKY HEADER
   Logo, navigation, cart icon (Lucide shopping-cart) with count badge.
   Backdrop-blur on scroll; transparent at top.

2. HERO BANNER [PHOTO #1] — premium treatment
   • min-height: 60vh; position:relative; overflow:hidden.
   • Background photo: <img> position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0
     Use images.unsplash.com curated ID matching the shop theme.
   • Gradient overlay (z-index:1): var(--gradient-hero) — semi-transparent brand colour + dark, NOT plain black.
   • Content (z-index:2): promotional headline + discount badge + CTA button (gradient).
   • Overlapping strip at bottom: bestseller preview row (3 mini product cards)
     margin-top:-50px; position:relative; z-index:10; (or use a wide card strip showing top picks).

3. FEATURED CATEGORIES [PHOTO #2, #3, #4]
   Background: var(--color-surface).
   3–4 visual category tiles, each: real photo (400×280px), category name overlay (gradient at bottom),
   hover zoom (img scale 1.05 + box-shadow upgrade). border-radius: var(--radius-xl).

4. CATEGORY FILTER BAR
   Background: var(--color-bg).
   Horizontal scrollable pill buttons (All + 3–4 categories); active: var(--gradient-primary) background.

5. PRODUCT GRID [PHOTO #5+]
   Background: var(--color-surface).
   Responsive CSS Grid (1→2→3→4 cols). Each card:
   • border-radius: var(--radius-xl); box-shadow: var(--shadow-md);
     hover: translateY(-6px) + var(--shadow-xl).
   • Product photo (height:240px; object-fit:cover), name, description, price, "Add to cart" (Lucide).
   • "Out of stock" for 1–2 products (disabled button, var(--color-text-muted) overlay).
   • data-aos="fade-up" with staggered delays.

6. CART SIDEBAR
   Slides in from right. Qty controls (+/−), Lucide trash-2 remove, subtotal, "Checkout" gradient button.

7. TESTIMONIALS — DARK SECTION
   Background: var(--gradient-section-dark); color: #fff.
   3 glass-style cards. 60px round picsum avatars — MANDATORY onerror on every avatar img:
     onerror="this.onerror=null;this.src='https://picsum.photos/seed/'+Math.random()+'/60/60'"

8. FOOTER
   Background: var(--color-dark); color: #9ca3af. Store info, links, payment icons, copyright.

Inventory: 8–12 realistic products with names, prices, categories, descriptions.
All cart logic (add, remove, qty, total) via localStorage.`,

  card: `
═══════════════════════════════════════
PROJECT TYPE: DIGITAL BUSINESS CARD (single screen)
═══════════════════════════════════════
Single-page, single-screen (100vh) layout — NO scrolling sections, everything above the fold.

Background: full-viewport gradient mesh using CSS:
  background: var(--gradient-section-dark);  with CSS radial-gradient circles
  for depth (e.g. two semi-transparent coloured circles in opposite corners).

Central card (.card — max 480px, centred via flex):
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);
  padding: 3rem 2.5rem;
  color: #fff;

Contents:
- Avatar: 120px circle, gradient background matching brand + initials (or picsum face photo)
  CSS animation: @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  animation: float 4s ease-in-out infinite;
  MANDATORY onerror on avatar img: onerror="this.onerror=null;this.src='https://picsum.photos/seed/avatar/120/120'"
- Name: var(--text-3xl), font-display, font-weight 700
- Title/role: var(--text-base), opacity 0.7
- Bio: 1–2 sentence tagline, var(--text-sm), opacity 0.8
- Contact row: icon + text (Lucide: mail, phone, map-pin, globe)
  hover: colour shift + translateX(4px)
- Social row: circular icon buttons (Lucide: github, twitter, instagram, linkedin)
  hover: gradient background + shadow-glow
- CTA: full-width gradient button, Lucide arrow-right icon
- All content staggered in: animate__animated animate__fadeInUp animate__delay-*

Dark/light toggle (top-right): Lucide sun/moon — toggling class on <body> that switches
the card to a white background + dark text mode.`,

  portfolio: `
═══════════════════════════════════════
PROJECT TYPE: PERSONAL PORTFOLIO SITE
═══════════════════════════════════════
PHOTO TARGET: ≥ 6 real photo <img> tags (hero + work cards + about — easily reached).
This is a plain browser site (no build step) — index.html + style.css + script.js.

Build a premium personal portfolio for a specialist (designer, developer, photographer, etc.).
Structure in this EXACT order:

1. STICKY HEADER / NAV
   Logo = specialist's name in display font (e.g. "Alex Morgan") + small role badge.
   Anchor links: #work, #skills, #about, #testimonials, #contact.
   Transparent at top; on scroll: backdrop-filter:blur(12px) + background + var(--shadow-md).
   Hamburger (Lucide menu/x) on mobile. All links use smooth scroll.

2. HERO — full-viewport, premium treatment [PHOTO #1]
   • Background photo: <img> position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0
     Use curated images.unsplash.com portfolio/workspace ID:
       1499750310107-5fef28a66643 (creative workspace)  ← preferred for hero
       or 1467232004584-a241de8bcf5d (laptop at desk)
       or 1522202176988-66273c2fd55f (team collaboration)
     alt="Creative workspace", loading="lazy",
     onerror="this.onerror=null;this.src='https://picsum.photos/seed/hero/1600/900'"
   • Gradient overlay (z-index:1): background: var(--gradient-hero)
     — linear-gradient from semi-transparent brand primary to near-black, NOT plain black.
   • Content (z-index:2, centred): role pill → name headline (var(--text-5xl), animate__fadeInDown) →
     tagline (var(--text-xl), animate__fadeInUp animate__delay-1s) →
     2 CTA buttons: [View My Work → #work] [Download CV].
   • OVERLAPPING HERO-STATS CARD (.hero-stats):
     position:relative; z-index:10; margin-top:-40px;
     background: var(--color-bg); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl);
     padding: 1.5rem 2.5rem; max-width: 800px; margin-inline: auto;
     display: flex; gap: 2rem; justify-content: space-around; flex-wrap: wrap;
     Show 3–4 key stats: "12+ Projects · 5 Years Experience · 30+ Clients · 4.9★ Rating"

3. WORK / PROJECTS [PHOTO #2–#7]
   id="work". Background: var(--color-surface).
   Section heading + subheading, data-aos="fade-up".
   CSS Grid (1 → 2 → 3 columns, gap 1.5rem). 4–6 project case cards:
   Each card (.project-card):
     border-radius: var(--radius-xl); box-shadow: var(--shadow-md); overflow: hidden;
     transition: transform var(--transition-base), box-shadow var(--transition-base);
     hover: transform: translateY(-6px); box-shadow: var(--shadow-xl);
   Card structure:
     • Photo container (height: 240px): real thematic photo via images.unsplash.com or loremflickr.
       Each card gets a UNIQUE, DIFFERENT photo URL. Use loremflickr keywords:
       design, branding, website, mobile, photography, illustration, ux, development
       Format: <img src="https://loremflickr.com/800/480/keyword?lock=UNIQUE_NUMBER" ...>
       MANDATORY on every project card img:
         alt="Project preview — [project name]"
         loading="lazy"
         height="240"
         style="width:100%;height:240px;object-fit:cover;"
         onerror="this.onerror=null;this.src='https://picsum.photos/seed/proj'+Math.random()+'/800/480'"
     • Card body: category tag pill (gradient bg) + project title (font-weight 700) +
       short description (2–3 lines) + tech tags + "View Case →" link.
   data-aos="fade-up" with staggered delays (0, 100, 200, 300…).

4. SKILLS
   id="skills". Background: var(--color-bg).
   Section heading + subheading, data-aos="fade-up".
   2-column grid of skill groups (e.g. Design / Development). Each group has 4–6 skills.
   Each skill row:
     skill name (left) + percentage label (right) + animated progress bar below.
   Progress bar markup:
     <div class="skill-bar-track">
       <div class="skill-bar-fill" data-width="85" style="width:0%"></div>
     </div>
   CSS for track: height:8px; background:var(--color-border); border-radius:var(--radius-full); overflow:hidden;
   CSS for fill: height:100%; background:var(--gradient-primary); border-radius:var(--radius-full);
     transition: width 1.2s cubic-bezier(0.4,0,0.2,1);
   Animation: use IntersectionObserver in script.js — when .skill-bar-fill enters viewport,
     set style.width = el.dataset.width + '%'. Trigger once (observer.unobserve after setting).
   AOS: data-aos="fade-right" on each skill row with staggered delays.

5. ABOUT
   id="about". Background: var(--color-primary-light).
   2-column layout (desktop): text left + photo right.
   Photo: <img> height: 500px; width: 100%; object-fit: cover; border-radius: var(--radius-xl);
     src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
     alt="About me — workspace photo"
     loading="lazy"
     onerror="this.onerror=null;this.src='https://picsum.photos/seed/about/800/600'"
   Text side: personal headline + 2–3 paragraphs of bio + key values list (Lucide check icons) +
     "Download CV" button (gradient).
   data-aos="fade-right" on text, data-aos="fade-left" on photo.

6. TESTIMONIALS — DARK SECTION
   id="testimonials". Background: var(--gradient-section-dark); color: #fff.
   Section heading + subheading (white text).
   2–3 glassmorphism quote cards:
     background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
     border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-lg);
   Each card: blockquote text + author row (avatar + name + role + 5 Lucide star icons).
   Avatar: 60px round <img> from picsum.photos/seed/<name>/60/60.
   MANDATORY on every avatar img:
     loading="lazy"
     alt="[Client name] avatar"
     onerror="this.onerror=null;this.src='https://picsum.photos/seed/'+Math.random()+'/60/60'"
   data-aos="fade-up" with staggered delays.

7. CONTACT
   id="contact". Background: var(--color-bg).
   2-column layout (desktop): form left + info/socials right.
   Form fields: Name (text), Email (email), Message (textarea, min 5 rows).
   Each field: label + input with focus ring using var(--color-primary).
   "Send Message" submit button: var(--gradient-primary) background, full width.
   JS validation (in script.js):
     • On submit: check name ≥ 2 chars, valid email regex, message ≥ 10 chars.
     • Inline error messages (.error-msg) shown below invalid fields.
     • On success: replace form content with success message ("✓ Message sent! I'll reply within 24h").
     • NO real network request — purely client-side demo.
   Right column: email address, phone, location (Lucide mail/phone/map-pin) +
     social icon links (Lucide: github, linkedin, twitter, instagram, dribbble)
     each in a circle button (hover: gradient bg + shadow-glow).

8. FOOTER
   Background: var(--color-dark); color: #9ca3af.
   Name/logo + short tagline | anchor nav links | social icons. Copyright line.

ALL SECTIONS: padding: clamp(80px, 10vw, 120px) 0. data-aos="fade-up" on every section.
Section background rotation (no two adjacent sections same):
  hero → (dark overlay), hero-stats → var(--color-bg),
  work → var(--color-surface), skills → var(--color-bg),
  about → var(--color-primary-light), testimonials → var(--gradient-section-dark) [DARK],
  contact → var(--color-bg), footer → var(--color-dark).`,
  presentation: `
PROJECT TYPE: PRESENTATION / SLIDE DECK (static HTML, no build)

Build a polished, finished-looking slide deck that works on BOTH desktop and mobile.
File structure: index.html (slides), style.css (design system), script.js (navigation). Static only — served via python http.server, NO build step, NO React.

SLIDE STRUCTURE:
- Each slide is a <section class="slide"> direct child of a <main class="deck"> container.
- Produce at least 5 real slides driven by the user's topic: (1) title/cover, (2-N) content slides, (last) closing/CTA or thank-you. No empty or filler slides.
- Every slide has real, specific, on-brand copy — NEVER 'Lorem ipsum', 'TODO', 'Slide 1' or bracketed stubs. Write the actual talk content.
- Each slide: one clear heading + supporting body (bullets, stats, quote, or image). Keep it readable, not a wall of text.

RESPONSIVE LAYOUT (mobile + desktop, mandatory):
- .slide { min-height: 100svh; display: flex; flex-direction: column; justify-content: center; padding: clamp(24px, 6vw, 96px); }
- Fluid type: headings clamp(28px, 6vw, 72px), body clamp(16px, 2.4vw, 22px). No fixed px font sizes.
- Any multi-column slide content uses grid repeat(auto-fit, minmax(min(100%, 280px), 1fr)) so it collapses to one column on phones.
- Images: aspect-ratio set, object-fit: cover, max-width:100%, with an onerror fallback (loremflickr.com / picsum.photos / images.unsplash.com/photo-<ID> only — NEVER source.unsplash.com).

NAVIGATION (script.js, null-safe, no errors if elements missing):
- Keyboard: ArrowRight/ArrowDown/Space/PageDown = next, ArrowLeft/ArrowUp/PageUp = prev, Home/End jump to first/last.
- Touch: horizontal swipe on mobile moves between slides.
- On-screen Prev/Next buttons (≥44px tap targets) + a slide counter (e.g. '03 / 08').
- Implement nav by scrolling the target .slide into view (scroll-snap-type: y mandatory on .deck, scroll-snap-align: start on .slide) so plain scroll also works.
- Wrap all listeners in DOMContentLoaded; guard every querySelector result before use.

POLISH:
- Cohesive design-system palette and fonts (Google Fonts via <link>). Subtle AOS data-aos="fade-up" reveal per slide; respect prefers-reduced-motion.
- Progress indicator (thin bar or dots) reflecting current slide. Smooth 300ms transitions, no bouncy animations.
- Result must look like a finished investor/conference deck — not a template or outline.`,
};

export function getTypePrompt(projectType?: string | null): string {
  const type = projectType ?? "landing";
  return TYPE_PROMPTS[type] ?? TYPE_PROMPTS["landing"];
}

const STYLE_PROMPTS: Record<string, string> = {
  minimal: `
═══════════════════════════════════════
VISUAL STYLE: MINIMAL
═══════════════════════════════════════
Override the default design system with these EXACT values — they take precedence over any defaults:

CSS VARIABLES (:root overrides):
  --color-bg: #fafafa;
  --color-surface: #f4f4f4;
  --color-primary: #111111;
  --color-primary-hover: #333333;
  --color-primary-light: rgba(17,17,17,0.04);
  --color-accent: #e84040;          /* one vivid accent — keep it SINGULAR */
  --color-dark: #0a0a0a;
  --color-text: #1a1a1a;
  --color-text-muted: #888888;
  --color-border: rgba(0,0,0,0.09);
  --gradient-hero: linear-gradient(160deg, rgba(17,17,17,0.55) 0%, rgba(17,17,17,0.82) 100%);
  --gradient-primary: linear-gradient(135deg, #111111 0%, #333333 100%);
  --gradient-section-dark: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:  0 2px 6px rgba(0,0,0,0.06);
  --shadow-lg:  0 4px 16px rgba(0,0,0,0.07);
  --shadow-xl:  0 8px 28px rgba(0,0,0,0.09);
  --shadow-glow: none;
  --radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px;
  --radius-xl: 10px; --radius-2xl: 14px; --radius-full: 9999px;

TYPOGRAPHY (load via Google Fonts):
  Display heading font: 'DM Serif Display' or 'Cormorant Garamond', serif
  Body font: 'DM Sans' or 'Inter', weight 300–400
  Hero headline: font-weight: 300; letter-spacing: -0.02em; color: #fff
  Section labels: font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--color-text-muted)
  Body: font-weight: 300; line-height: 1.75; color: var(--color-text-muted)

SHAPES & BORDERS:
  Cards: border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: #fff; box-shadow: none;
  Card hover: box-shadow: var(--shadow-sm); transform: none; (no translateY lift — keep it flat)
  Buttons: border-radius: var(--radius-sm); letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.8rem;
  Primary button: background: #111; color: #fff; border: none; padding: 0.9rem 2.4rem;
  Secondary button: background: transparent; border: 1px solid #111; color: #111;

WHITESPACE & RHYTHM:
  Section padding: clamp(100px, 12vw, 160px) 0  ← extra generous
  Card gaps: clamp(1.5rem, 4vw, 3rem)
  Generous margins between text blocks (margin-bottom: 2rem on body paragraphs)

ANIMATIONS:
  AOS: data-aos="fade-in" ONLY — no slide, no zoom. duration: 800, once: true
  Animate.css on hero: animate__fadeIn ONLY (no fadeInDown / fadeInUp)
  Transitions: all 300ms ease — opacity and color only, no transforms on cards
  NO bouncy, NO spring animations

SECTION BACKGROUNDS (minimal alternation — almost all white/off-white):
  All sections: #fafafa or #fff — vary only by very subtle shade
  ONE dark section (testimonials): background: #0a0a0a; color: #f0f0f0
  CTA section: background: #111; color: #fff (flat, no gradient)
  Footer: background: #0a0a0a; color: #888

HERO:
  Gradient overlay must be dark and muted — no vibrant colour tint.
  Overlay: rgba(0,0,0,0.65) simple or linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.75))
  Headline: huge, thin weight (300), wide letter-spacing, all lowercase or sentence case
  NO decorative blobs, NO hero-stats card — keep it clean and empty below headline`,

  bold: `
═══════════════════════════════════════
VISUAL STYLE: BOLD
═══════════════════════════════════════
Override the default design system with these EXACT values — they take precedence over any defaults:

CSS VARIABLES (:root overrides):
  --color-bg: #ffffff;
  --color-surface: #f0f0f0;
  --color-primary: #e61919;         /* aggressive saturated red — adapt to brand */
  --color-primary-hover: #c00;
  --color-primary-light: rgba(230,25,25,0.07);
  --color-accent: #0a0a0a;          /* black as secondary accent */
  --color-dark: #0a0a0a;
  --color-text: #0a0a0a;
  --color-text-muted: #444444;
  --color-border: rgba(0,0,0,0.12);
  --gradient-hero: linear-gradient(135deg, rgba(230,25,25,0.82) 0%, rgba(10,10,10,0.92) 100%);
  --gradient-primary: linear-gradient(135deg, var(--color-primary) 0%, #9b0000 100%);
  --gradient-section-dark: linear-gradient(135deg, #0a0a0a 0%, #1a0000 100%);
  --shadow-sm:  0 2px 4px rgba(0,0,0,0.12);
  --shadow-md:  0 6px 20px rgba(0,0,0,0.18);
  --shadow-lg:  0 12px 40px rgba(0,0,0,0.22);
  --shadow-xl:  0 24px 60px rgba(0,0,0,0.28);
  --shadow-glow: 0 0 40px rgba(230,25,25,0.40);
  --radius-sm: 2px; --radius-md: 4px; --radius-lg: 6px;
  --radius-xl: 8px; --radius-2xl: 12px; --radius-full: 9999px;

TYPOGRAPHY (load via Google Fonts):
  Display heading font: 'Syne' or 'Bebas Neue' or 'Oswald', weight 700–900
  Body font: 'Inter' or 'DM Sans', weight 400–500
  Hero headline: font-weight: 900; font-size: clamp(3.5rem, 9vw, 7rem); line-height: 0.95; text-transform: uppercase; letter-spacing: -0.03em
  Section headings: font-weight: 800; text-transform: uppercase; letter-spacing: -0.01em
  Body: font-weight: 400; line-height: 1.6

SHAPES:
  Cards: border-radius: var(--radius-md); (almost square corners)
  Card hover: translateY(-4px) + var(--shadow-xl) + left border 4px solid var(--color-primary)
  Primary buttons: border-radius: var(--radius-sm); padding: 1rem 2.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.9rem
  Use thick left-border accents on feature cards: border-left: 4px solid var(--color-primary)

SECTION BACKGROUNDS (strong contrast between sections):
  Hero: full black overlay, big bold headline fills the frame
  Features: background: #f0f0f0 (solid grey)
  About: background: #0a0a0a; color: #fff  ← dark early
  Gallery: background: #fff
  Pricing: background: var(--color-primary); color: #fff  ← brand colour block
  Testimonials: background: #0a0a0a; color: #fff
  CTA: background: #fff; border-top: 6px solid var(--color-primary)
  Footer: background: #0a0a0a; color: #888

ANIMATIONS:
  AOS: data-aos="fade-up" with short duration 400ms — snappy
  Animate.css hero: animate__fadeInDown (headline), animate__fadeInUp (sub)
  Card hover: fast 150ms — no bounce`,

  glass: `
═══════════════════════════════════════
VISUAL STYLE: GLASS (Glassmorphism)
═══════════════════════════════════════
Override the default design system with these EXACT values — they take precedence over any defaults:

CSS VARIABLES (:root overrides):
  --color-bg: #f0f4ff;              /* soft blue-white base */
  --color-surface: #e8eef8;
  --color-primary: #6366f1;         /* indigo — adapt to brand */
  --color-primary-hover: #4f46e5;
  --color-primary-light: rgba(99,102,241,0.10);
  --color-accent: #a78bfa;          /* softer violet */
  --color-dark: #1e1b4b;
  --color-text: #1e1b4b;
  --color-text-muted: #6b7280;
  --color-border: rgba(255,255,255,0.45);
  --gradient-hero: linear-gradient(135deg, rgba(99,102,241,0.65) 0%, rgba(30,27,75,0.80) 100%);
  --gradient-primary: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
  --gradient-section-dark: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
  --shadow-sm:  0 2px 8px rgba(99,102,241,0.08);
  --shadow-md:  0 8px 24px rgba(99,102,241,0.12);
  --shadow-lg:  0 16px 48px rgba(99,102,241,0.16);
  --shadow-xl:  0 24px 64px rgba(99,102,241,0.22);
  --shadow-glow: 0 0 40px rgba(99,102,241,0.35);
  --radius-sm: 10px; --radius-md: 14px; --radius-lg: 18px;
  --radius-xl: 22px; --radius-2xl: 28px; --radius-full: 9999px;

GLASSMORPHISM CARDS (mandatory on ALL card components):
  background: rgba(255,255,255,0.20);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.45);
  border-radius: var(--radius-xl);
  box-shadow: 0 8px 32px rgba(99,102,241,0.12);
  Card hover: box-shadow: var(--shadow-lg); transform: translateY(-4px); border-color: rgba(255,255,255,0.65);

SECTION BACKGROUNDS (gradient-mesh base — glass floats above gradients):
  Page body: background: linear-gradient(135deg, #f0f4ff 0%, #e8eef8 50%, #ede9fe 100%); (fixed gradient base)
  Sections alternate between transparent (showing body gradient) and semi-opaque white:
    Features: background: rgba(255,255,255,0.30); backdrop-filter: blur(4px);
    About: background: transparent
    Gallery: background: rgba(255,255,255,0.20); backdrop-filter: blur(8px);
    Pricing: background: rgba(99,102,241,0.08);
    Testimonials (DARK): background: rgba(30,27,75,0.88); backdrop-filter: blur(20px); color: #fff
    CTA: background: var(--gradient-primary); (solid gradient)
    Footer: background: rgba(30,27,75,0.92); color: #d1d5db

TYPOGRAPHY (load via Google Fonts):
  Display heading font: 'Plus Jakarta Sans' or 'Outfit', weight 600–700
  Body font: 'Inter', weight 400
  Hero headline: font-weight: 700; text-shadow: 0 2px 12px rgba(0,0,0,0.2)
  Body: line-height: 1.7

HERO special treatment:
  Gradient overlay uses brand indigo — var(--gradient-hero)
  Add frosted glass container for headline content: background: rgba(255,255,255,0.10); backdrop-filter: blur(12px); border-radius: var(--radius-2xl); padding: 3rem; border: 1px solid rgba(255,255,255,0.25)

ANIMATIONS:
  AOS: data-aos="fade-up" duration 600ms
  Animate.css on hero: animate__fadeInDown + animate__fadeInUp
  Card hover transition: 250ms ease — smooth glass reflection shift`,

  dark: `
═══════════════════════════════════════
VISUAL STYLE: DARK (Neon Dark Theme)
═══════════════════════════════════════
Override the default design system with these EXACT values — they take precedence over any defaults:

CSS VARIABLES (:root overrides):
  --color-bg: #0a0a0f;
  --color-surface: #111118;
  --color-primary: #a78bfa;         /* violet neon — adapt to brand */
  --color-primary-hover: #8b5cf6;
  --color-primary-light: rgba(167,139,250,0.10);
  --color-accent: #22d3ee;          /* cyan neon complement */
  --color-dark: #05050a;
  --color-text: #e2e8f0;
  --color-text-muted: #6b7280;
  --color-border: rgba(255,255,255,0.07);
  --gradient-hero: linear-gradient(135deg, rgba(167,139,250,0.45) 0%, rgba(5,5,10,0.92) 100%);
  --gradient-primary: linear-gradient(135deg, #a78bfa 0%, #22d3ee 100%);
  --gradient-section-dark: linear-gradient(135deg, #05050a 0%, #0f0f1a 100%);
  --shadow-sm:  0 2px 8px rgba(0,0,0,0.40);
  --shadow-md:  0 6px 24px rgba(0,0,0,0.50);
  --shadow-lg:  0 12px 40px rgba(0,0,0,0.60);
  --shadow-xl:  0 20px 60px rgba(0,0,0,0.70);
  --shadow-glow: 0 0 30px rgba(167,139,250,0.50);
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px;
  --radius-xl: 20px; --radius-2xl: 28px; --radius-full: 9999px;

DARK PAGE BASE:
  html, body: background-color: #0a0a0f; color: #e2e8f0;
  ALL sections have dark backgrounds — this is a fully dark-themed page

NEON CARDS (mandatory on ALL card components):
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(167,139,250,0.15);
  border-radius: var(--radius-xl);
  box-shadow: 0 4px 24px rgba(0,0,0,0.40);
  Card hover: border-color: rgba(167,139,250,0.45); box-shadow: var(--shadow-glow); transform: translateY(-4px);

NEON ACCENTS (use throughout):
  Primary text accent: color: var(--color-primary)  — violet
  Secondary accent: color: var(--color-accent)  — cyan
  Gradient text on hero headline: background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  Icon glow: filter: drop-shadow(0 0 8px rgba(167,139,250,0.6))
  Glow buttons: box-shadow: 0 0 20px rgba(167,139,250,0.45) on hover

SECTION BACKGROUNDS (ALL dark — vary only shade):
  Features: background: #111118
  About: background: #0d0d14
  Gallery: background: #0a0a0f
  Pricing: background: #111118; highlight card gets border: 1px solid var(--color-primary) + shadow-glow
  Testimonials: background: #0d0d14; cards use neon-border style above
  CTA: background: var(--gradient-primary) (neon gradient band)
  Footer: background: #05050a

TYPOGRAPHY (load via Google Fonts):
  Display heading font: 'Syne' or 'Space Grotesk', weight 700–800
  Body font: 'Inter', weight 400
  Hero headline: gradient text (neon gradient), font-weight: 800; font-size: clamp(3rem, 8vw, 5.5rem)
  Body text: color: #94a3b8

HERO:
  Full dark overlay + neon gradient accent
  Add ambient neon glow blobs (CSS only, pointer-events:none): two absolute divs with radial-gradient neon colour, opacity 0.15, blur-3xl

ANIMATIONS:
  AOS: data-aos="fade-up" duration 600ms
  Add subtle CSS @keyframes neon-pulse: { 0%,100%{opacity:0.6} 50%{opacity:1} } on neon accents
  Card hover: border glow + shadow-glow, 200ms ease`,

  playful: `
═══════════════════════════════════════
VISUAL STYLE: PLAYFUL
═══════════════════════════════════════
Override the default design system with these EXACT values — they take precedence over any defaults:

CSS VARIABLES (:root overrides):
  --color-bg: #fffbf5;              /* warm cream */
  --color-surface: #fff5e6;
  --color-primary: #ff6b35;         /* energetic orange — adapt to brand */
  --color-primary-hover: #e85520;
  --color-primary-light: rgba(255,107,53,0.10);
  --color-accent: #6b48ff;          /* complementary purple */
  --color-dark: #1a1035;
  --color-text: #1a1035;
  --color-text-muted: #6b6b8a;
  --color-border: rgba(0,0,0,0.08);
  --gradient-hero: linear-gradient(135deg, rgba(255,107,53,0.70) 0%, rgba(107,72,255,0.75) 100%);
  --gradient-primary: linear-gradient(135deg, #ff6b35 0%, #6b48ff 100%);
  --gradient-section-dark: linear-gradient(135deg, #1a1035 0%, #2d1b69 100%);
  --shadow-sm:  4px 4px 0px rgba(0,0,0,0.12);
  --shadow-md:  6px 6px 0px rgba(0,0,0,0.15);
  --shadow-lg:  8px 8px 0px rgba(0,0,0,0.18);
  --shadow-xl:  12px 12px 0px rgba(0,0,0,0.20);
  --shadow-glow: 0 0 30px rgba(255,107,53,0.40);
  --radius-sm: 16px; --radius-md: 20px; --radius-lg: 24px;
  --radius-xl: 28px; --radius-2xl: 32px; --radius-full: 9999px;

PLAYFUL CARDS (mandatory — offset shadow style):
  background: #fff;
  border: 2px solid #1a1035;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);  /* offset hard shadow, NOT blurred */
  Card hover: box-shadow: var(--shadow-lg); transform: translate(-2px,-2px);  /* comic-book lift */
  Card hover transition: 150ms cubic-bezier(0.68,-0.55,0.265,1.55)  /* spring bounce */

BUTTONS (extra bold and rounded):
  Primary: background: var(--gradient-primary); border-radius: var(--radius-full); padding: 1rem 2.5rem; font-weight: 800; font-size: 1rem; border: 2px solid #1a1035; box-shadow: 4px 4px 0px #1a1035;
  Primary hover: transform: translate(-2px,-2px); box-shadow: 6px 6px 0px #1a1035;
  Secondary: background: #fff; border: 2px solid #1a1035; color: #1a1035; border-radius: var(--radius-full); box-shadow: 3px 3px 0px #1a1035;

TYPOGRAPHY (load via Google Fonts):
  Display heading font: 'Nunito' or 'Fredoka One', weight 700–900
  Body font: 'Nunito' or 'Poppins', weight 400–500
  Hero headline: font-weight: 900; letter-spacing: -0.02em; color: #fff
  Section headings: font-weight: 800; color: var(--color-text)
  Add colorful text spans: <span style="color:var(--color-primary)"> on key words

SECTION BACKGROUNDS (bright and varied — each section a DIFFERENT colour):
  Features: background: #fff5e6  (warm cream)
  About: background: #e8f0ff  (light blue)
  Gallery: background: #fff0e6  (warm)
  Pricing: background: #f0e8ff  (light purple)
  Testimonials: background: var(--gradient-section-dark); color: #fff
  CTA: background: var(--gradient-primary); color: #fff
  Footer: background: #1a1035; color: #a0a0c0

DECORATIVE ELEMENTS:
  Add 2–3 floating emoji or colourful blobs as CSS background decorations (pointer-events:none; position:absolute; font-size:4rem; opacity:0.12; rotation: ±15deg)
  Use wavy section dividers: border-radius: 50% / 20px at section tops

ANIMATIONS:
  AOS: data-aos="zoom-in" + data-aos="fade-up" mixed; duration 500ms
  Card entrance: data-aos="zoom-in" with staggered data-aos-delay
  Animate.css hero: animate__bounceIn (headline), animate__fadeInUp (sub)
  Hover transitions: cubic-bezier(0.68,-0.55,0.265,1.55) — spring bounce feel`,

  elegant: `
═══════════════════════════════════════
VISUAL STYLE: ELEGANT (Luxury)
═══════════════════════════════════════
Override the default design system with these EXACT values — they take precedence over any defaults:

CSS VARIABLES (:root overrides):
  --color-bg: #faf9f6;              /* warm ivory */
  --color-surface: #f4f1eb;
  --color-primary: #c9a96e;         /* warm gold */
  --color-primary-hover: #b8934e;
  --color-primary-light: rgba(201,169,110,0.08);
  --color-accent: #1c2b3a;          /* deep navy */
  --color-dark: #0f1824;
  --color-text: #1c2b3a;
  --color-text-muted: #7a7265;
  --color-border: rgba(201,169,110,0.20);
  --gradient-hero: linear-gradient(160deg, rgba(28,43,58,0.60) 0%, rgba(15,24,36,0.85) 100%);
  --gradient-primary: linear-gradient(135deg, #c9a96e 0%, #e8c98a 50%, #c9a96e 100%);
  --gradient-section-dark: linear-gradient(135deg, #0f1824 0%, #1c2b3a 100%);
  --shadow-sm:  0 1px 4px rgba(28,43,58,0.05);
  --shadow-md:  0 4px 20px rgba(28,43,58,0.08);
  --shadow-lg:  0 12px 48px rgba(28,43,58,0.12);
  --shadow-xl:  0 24px 72px rgba(28,43,58,0.16);
  --shadow-glow: 0 0 40px rgba(201,169,110,0.30);
  --radius-sm: 2px; --radius-md: 4px; --radius-lg: 6px;
  --radius-xl: 8px; --radius-2xl: 12px; --radius-full: 9999px;

ELEGANT CARDS:
  background: #fff;
  border: 1px solid rgba(201,169,110,0.15);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  Card hover: box-shadow: var(--shadow-lg); transform: translateY(-3px); border-color: rgba(201,169,110,0.35);
  Card transition: 350ms ease

TYPOGRAPHY (MANDATORY — serif display):
  Display heading font: MUST use 'Cormorant Garamond' or 'Playfair Display', weight 400–700, style italic for hero
  Body font: 'Jost' or 'EB Garamond', weight 300–400
  Hero headline: font-family: var(--font-display); font-style: italic; font-weight: 400; font-size: clamp(3rem, 7vw, 5.5rem); letter-spacing: 0.01em; color: #fff
  Section headings: font-family: var(--font-display); font-weight: 600; letter-spacing: 0.02em
  Sub-labels: font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-primary); margin-bottom: 1rem  ← gold uppercase label above each heading
  Body: font-weight: 300; line-height: 1.85; color: var(--color-text-muted)

GOLD ACCENTS (use throughout):
  Gold divider lines: <hr style="border:none;width:60px;height:1px;background:var(--color-primary);margin:1.5rem auto">
  Gold section label above every heading
  Gold border on hover for cards and buttons
  Thin gold decorative border on hero: ::after pseudo-element inset 20px from edges

SECTION BACKGROUNDS (classic alternation — muted and refined):
  Features: background: var(--color-surface)  (warm cream)
  About: background: var(--color-bg)
  Gallery: background: var(--color-surface)
  Pricing: background: var(--color-bg)
  Testimonials: background: var(--gradient-section-dark); color: #e8d5b0  (gold-tinted white)
  CTA: background: #1c2b3a; color: #faf9f6  (deep navy, not gradient)
  Footer: background: #0f1824; color: #7a7265

BUTTONS:
  Primary: background: transparent; border: 1px solid var(--color-primary); color: var(--color-primary); border-radius: var(--radius-sm); padding: 0.9rem 2.5rem; letter-spacing: 0.1em; text-transform: uppercase; font-size: 0.8rem; font-weight: 500
  Primary hover: background: var(--color-primary); color: #fff
  On dark sections: border-color: rgba(201,169,110,0.6); color: rgba(201,169,110,0.8)

SECTION SPACING:
  Extra generous — section padding: clamp(120px, 14vw, 200px) 0
  Max content width: 1000px (narrower for editorial feel)
  Text blocks: max-width: 680px

ANIMATIONS:
  AOS: data-aos="fade-up" duration 900ms — very slow and graceful
  Animate.css hero: animate__fadeIn ONLY (headline), animate__fadeIn + animate__delay-1s (sub)
  No bouncy, no slide. Transitions: 400ms ease — refined and unhurried`,
};

export function getStylePrompt(style?: string | null): string {
  if (!style) return "";
  return STYLE_PROMPTS[style] ?? "";
}

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required for code generation");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Calls the chat API and, if the model output is cut off (finish_reason === "length"),
// automatically requests continuations and concatenates them. Eliminates truncated
// HTML/CSS/JS that previously produced "raw" / non-responsive output.
// Strips leading markdown fences / stray whitespace that a model sometimes
// emits at the start of a continuation chunk, so blind concatenation of
// continuation parts still yields a single valid JSON object.
export function trimContinuation(part: string): string {
  return part.replace(/^\s*```(?:json)?\s*/i, "");
}

async function createCompletionWithContinuation(
  openai: OpenAI,
  model: string,
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  temperature: number
): Promise<string> {
  const working = [...messages];
  let full = "";
  const MAX_CONTINUATIONS = 4;
  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const completion = await openai.chat.completions.create({
      model,
      messages: working,
      temperature,
      max_tokens: 16384,
    });
    const choice = completion.choices[0];
    const raw = choice?.message?.content ?? "";
    const part = i === 0 ? raw : trimContinuation(raw);
    full += part;
    if (choice?.finish_reason !== "length") {
      return full;
    }
    working.push({ role: "assistant", content: part });
    working.push({
      role: "user",
      content:
        "Continue the response EXACTLY where you stopped. Do not repeat any characters already sent. Do not restart the JSON. Output only the raw continuation so that concatenating it to the previous text yields the complete valid JSON object.",
    });
  }
  return full;
}

export async function generateWithOpenAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  projectType?: string | null,
  tier: ModelTier = "power",
  style?: string | null
): Promise<GeneratedOutput> {
  const openai = getOpenAIClient();
  const model = MODELS[tier];

  const styleBlock = getStylePrompt(style);
  const fullSystemPrompt = SYSTEM_PROMPT + "\n\n" + getTypePrompt(projectType) + (styleBlock ? "\n\n" + styleBlock : "");

  const chatMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    { role: "system", content: fullSystemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  let response: string | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await createCompletionWithContinuation(
          openai,
          model,
          chatMessages,
          0.2
        );
      if (!response) throw new Error("Empty response from OpenAI");

      return parseGeneratedOutput(response);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`Failed after 3 attempts: ${lastError?.message}`);
}

export async function* streamWithOpenAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  projectType?: string | null,
  tier: ModelTier = "power",
  style?: string | null
): AsyncGenerator<string> {
  const openai = getOpenAIClient();
  const model = MODELS[tier];

  const styleBlock = getStylePrompt(style);
  const fullSystemPrompt = SYSTEM_PROMPT + "\n\n" + getTypePrompt(projectType) + (styleBlock ? "\n\n" + styleBlock : "");

  const chatMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    { role: "system", content: fullSystemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  // Stream with truncation recovery: if the model stops with finish_reason
  // "length", request continuations and keep streaming so SSE output is never
  // cut off mid-JSON (mirrors createCompletionWithContinuation for the SSE path).
  const working: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    ...chatMessages,
  ];
  const MAX_CONTINUATIONS = 4;

  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const stream = await openai.chat.completions.create({
      model,
      messages: working,
      temperature: 0.2,
      max_tokens: 16384,
      stream: true,
    });

    let part = "";
    let finishReason: string | null = null;
    // For continuation rounds (i >= 1) the model may prefix the chunk with a
    // stray ```json fence; buffer the lead until we can strip it before yielding.
    let leadHandled = i === 0;
    let lead = "";

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      const delta = choice?.delta?.content;
      if (delta) {
        part += delta;
        if (leadHandled) {
          yield delta;
        } else {
          lead += delta;
          // Once we have enough to decide (or a newline), strip a leading fence and flush.
          if (lead.length >= 16 || lead.includes("\n")) {
            const cleaned = trimContinuation(lead);
            if (cleaned) yield cleaned;
            leadHandled = true;
            lead = "";
          }
        }
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
    }
    // Flush any buffered lead if the stream ended before the threshold.
    if (!leadHandled && lead) {
      const cleaned = trimContinuation(lead);
      if (cleaned) yield cleaned;
    }

    if (finishReason !== "length") return;

    working.push({ role: "assistant", content: part });
    working.push({
      role: "user",
      content:
        "Continue the response EXACTLY where you stopped. Do not repeat any characters already sent. Do not restart the JSON. Output only the raw continuation so that concatenating it to the previous text yields the complete valid JSON object.",
    });
  }
}

export interface ProjectPlan {
  title: string;
  sections: Array<{ name: string; description: string }>;
  techNotes: string;
}

const PLAN_SYSTEM_PROMPT = `You are a senior frontend architect. Given a user description and project type, produce a concise structural plan — NO code whatsoever.

OUTPUT FORMAT (non-negotiable): respond ONLY with a single valid JSON object, zero markdown outside JSON:
{
  "title": "short project name (3–6 words)",
  "sections": [
    { "name": "Section or Screen name", "description": "one sentence on content and purpose" }
  ],
  "techNotes": "one sentence on key technical decisions"
}

Rules:
- sections: 4–8 items for landing/shop, 3–6 for app, 3–5 for card
- Each description: max 15 words, specific to the user brief
- title: specific and on-brand, not generic
- techNotes: mention relevant tech (React CDN, CSS Grid, localStorage, AOS, Lucide, loremflickr, picsum, etc.)
- Zero code, zero HTML, zero CSS — structure and intent only`;

export async function generatePlan(
  prompt: string,
  projectType?: string | null,
  tier: ModelTier = "power"
): Promise<ProjectPlan> {
  const openai = getOpenAIClient();
  const model = MODELS[tier];

  const typeHint = projectType ? `Project type: ${projectType}` : "";

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: PLAN_SYSTEM_PROMPT },
      { role: "user", content: `${typeHint}\n\nUser description: ${prompt}` },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as ProjectPlan;

  if (!Array.isArray(parsed.sections) || typeof parsed.title !== "string") {
    throw new Error("Invalid plan JSON structure from OpenAI");
  }

  return parsed;
}

const ZEUS_MD_PROMPT = `You are a brand analyst. Given generated HTML/CSS code, extract the brand context as strict JSON.

OUTPUT FORMAT (non-negotiable): respond ONLY with a single valid JSON object, zero markdown outside JSON:
{
  "brand": "Project name — one-sentence description",
  "palette": ["#hex1", "#hex2", "#hex3"],
  "fonts": ["Display Font", "Body Font"],
  "tone": "one phrase describing the aesthetic/tone",
  "sections": ["Section1", "Section2"]
}

Rules:
- palette: extract real hex values from :root CSS variables or inline styles (3–6 colors)
- fonts: extract font family names from Google Fonts <link> or font-family declarations
- tone: concise aesthetic description (e.g. "dark luxury with golden accents")
- sections: list of main content sections found in the HTML (from <section> tags or landmark IDs)`;

export async function generateZeusMd(
  files: Array<{ path: string; content: string }>,
  projectType: string,
  tier: ModelTier = "lite"
): Promise<string> {
  const openai = getOpenAIClient();
  const model = MODELS[tier];

  const relevantFiles = files
    .filter((f) => f.path.endsWith(".css") || f.path.endsWith(".html"))
    .map((f) => `### ${f.path}\n${f.content.slice(0, 4000)}`)
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: ZEUS_MD_PROMPT },
      { role: "user", content: `Project type: ${projectType}\n\n${relevantFiles}` },
    ],
    temperature: 0.1,
    max_tokens: 600,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as {
    brand: string;
    palette: string[];
    fonts: string[];
    tone: string;
    sections: string[];
  };

  return [
    `# zeus.md — Brand Context`,
    ``,
    `**Brand:** ${parsed.brand}`,
    `**Type:** ${projectType}`,
    `**Tone:** ${parsed.tone}`,
    ``,
    `## Colour Palette`,
    ...(parsed.palette || []).map((c) => `- \`${c}\``),
    ``,
    `## Fonts`,
    ...(parsed.fonts || []).map((f) => `- ${f}`),
    ``,
    `## Sections`,
    ...(parsed.sections || []).map((s) => `- ${s}`),
  ].join("\n");
}

const EDIT_SYSTEM_PROMPT = `You are a surgical code editor. You receive existing project files and an edit instruction.

OUTPUT FORMAT (non-negotiable): respond ONLY with a single valid JSON object, zero markdown outside JSON:
{
  "files": [
    {"path": "style.css", "content": "...full file content..."}
  ],
  "message": "one-sentence description of what was changed"
}

CRITICAL RULES:
- Return ONLY files that were actually modified or newly created. Do NOT return unchanged files.
- Return the COMPLETE content of each modified file (not a diff, not a partial — the full file).
- If only style.css needs changing, return only style.css.
- Preserve all existing functionality in unchanged parts of modified files.
- The JSON structure { files: [{path, content}], message } is identical to generation — do not deviate.

QUALITY PRESERVATION (maintain in every edit):
- Keep all real <img> tags with images.unsplash.com / loremflickr / picsum URLs — never replace with CSS placeholders. Never introduce source.unsplash.com (returns 503).
- Page must retain ≥ 5 real photo <img> tags after the edit; if the edit adds a new section, add photos to it.
- Keep onerror fallback on every <img>: onerror="this.onerror=null;this.src='https://picsum.photos/seed/'+Math.random()+'/800/600'"
- Keep Lucide CDN script and all data-lucide icons — keep lucide.createIcons() in script.js.
- Keep AOS CDN links and Animate.css CDN links — keep AOS.init() and all data-aos attributes.
- Keep hamburger menu JS, smooth scroll, navbar scroll effect, and any form validation.
- Only modify what the instruction asks — leave everything else intact.
- images.unsplash.com PREFERRED for photos; retain ≥ 5 photos after edit; no source.unsplash.com.`;

export async function editProject(
  existingFiles: Array<{ path: string; content: string }>,
  instruction: string,
  zeusContext?: string | null,
  tier: ModelTier = "lite"
): Promise<GeneratedOutput> {
  const openai = getOpenAIClient();
  const model = MODELS[tier];

  const zeusBlock = zeusContext
    ? `\n\n[Brand context from zeus.md — maintain these decisions:]\n${zeusContext}`
    : "";

  const filesBlock = existingFiles
    .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  const userContent = `Edit instruction: ${instruction}${zeusBlock}\n\nExisting project files:\n${filesBlock}`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: EDIT_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 16384,
      });

      const response = completion.choices[0]?.message?.content ?? null;
      if (!response) throw new Error("Empty response from OpenAI");

      return parseGeneratedOutput(response);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`editProject failed after 3 attempts: ${lastError?.message}`);
}

// ─── AOS POST-PROCESSING ────────────────────────────────────────────────────
// Deterministic, zero-token fix applied inside parseGeneratedOutput.
// Rewrites buggy "AOS.init wrapped in if(prefersReduced)" to unconditional call.
// Appends [data-aos]:not(.aos-init) CSS fallback if missing.
// Idempotent: returns files unchanged when no bug is detected.

const AOS_CSS_FALLBACK = `
/* AOS CDN failure fallback: keep content visible if AOS script fails to load.
   AOS adds .aos-init when it processes each element; without it elements stay visible. */
[data-aos]:not(.aos-init) {
  opacity: 1 !important;
  transform: none !important;
  transition: none !important;
}
`;

function fixAosCssFallback(css: string): string {
  if (css.includes("[data-aos]:not(.aos-init)")) return css;
  return css + AOS_CSS_FALLBACK;
}

function fixAosInScript(script: string): string {
  // Quick bail-out: no AOS.init present at all
  if (!script.includes("AOS.init(")) return script;

  // Detect the bug: an if whose condition references a "reduc*" variable
  // and whose body (or else-body) contains AOS.init
  const bugPattern = /if\s*\(\s*!?\s*\w*[Rr]educ\w*\s*(?:===\s*(?:true|false))?\s*\)/;
  const ifMatch = bugPattern.exec(script);
  if (!ifMatch) return script; // no if(prefersReduced) — already unconditional

  // Slice from the if onwards and find the brace-balanced end of if/else
  const fromIf = script.slice(ifMatch.index);
  const firstBrace = fromIf.indexOf("{");
  if (firstBrace === -1) return script;

  // Walk to end of if body
  let i = firstBrace;
  let depth = 0;
  while (i < fromIf.length) {
    if (fromIf[i] === "{") depth++;
    else if (fromIf[i] === "}") { depth--; if (depth === 0) break; }
    i++;
  }
  let ifBodyEnd = i + 1; // index within fromIf

  // Extend to else-block if present
  const afterIfBody = fromIf.slice(ifBodyEnd);
  const elseMatch = /^\s*else\s*\{/.exec(afterIfBody);
  if (elseMatch) {
    i = ifBodyEnd + afterIfBody.indexOf("{");
    depth = 0;
    while (i < fromIf.length) {
      if (fromIf[i] === "{") depth++;
      else if (fromIf[i] === "}") { depth--; if (depth === 0) break; }
      i++;
    }
    ifBodyEnd = i + 1;
  }

  // Verify AOS.init actually appears inside this if/else block
  const ifBlock = fromIf.slice(0, ifBodyEnd);
  if (!ifBlock.includes("AOS.init(")) return script; // AOS.init not in this if — leave alone

  // Determine full replacement region: include preceding `const prefersReduced = …` line if present
  const beforeIf = script.slice(0, ifMatch.index);
  const prefersDecl = beforeIf.match(/([ \t]*const\s+\w*[Rr]educ\w*\s*=\s*window\.matchMedia[^\n]*\n)$/);
  const blockStart = prefersDecl ? ifMatch.index - prefersDecl[1].length : ifMatch.index;
  const blockEnd   = ifMatch.index + ifBodyEnd;

  // Compute indentation from the first character of blockStart's line
  const lineStart = script.lastIndexOf("\n", blockStart);
  const indent = lineStart === -1 ? "" : (script.slice(lineStart + 1, blockStart).match(/^(\s*)/)?.[1] ?? "");

  // Only emit the prefersReduced declaration if it wasn't already captured above
  const needsDecl = !prefersDecl &&
    !/const\s+\w*[Rr]educ\w*\s*=\s*window\.matchMedia/.test(script.slice(0, blockStart));

  const replacement =
    (needsDecl ? `${indent}const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;\n` : "") +
    `${indent}AOS.init({ duration: prefersReduced ? 0 : 700, easing: 'ease', once: true, offset: 80 });\n` +
    `${indent}lucide.createIcons();`;

  return script.slice(0, blockStart) + replacement + script.slice(blockEnd);
}

export function sanitizeAosInit(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  let scriptFixed = false;
  let cssFixed = false;

  const result = files.map((file) => {
    if (file.path === "script.js") {
      const fixed = fixAosInScript(file.content);
      if (fixed !== file.content) { scriptFixed = true; return { ...file, content: fixed }; }
    }
    if (file.path === "style.css") {
      const fixed = fixAosCssFallback(file.content);
      if (fixed !== file.content) { cssFixed = true; return { ...file, content: fixed }; }
    }
    return file;
  });

  if (scriptFixed) {
    console.warn("[sanitizeAosInit] Fixed: AOS.init() was wrapped in if-block — rewrote as unconditional call");
  }
  if (cssFixed) {
    console.warn("[sanitizeAosInit] Fixed: [data-aos]:not(.aos-init) CSS fallback was missing — appended to style.css");
  }

  return result;
}

// ─── END AOS POST-PROCESSING ─────────────────────────────────────────────────

// ─── MOBILE POST-PROCESSING ──────────────────────────────────────────────────
// Deterministic, zero-token, idempotent insurance for viewport meta and mobile CSS.

const VIEWPORT_META_TAG =
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';

/** Regex that matches any existing viewport meta variant so we can detect it before injecting */
const VIEWPORT_META_RE = /<meta\s[^>]*name=["']viewport["'][^>]*>/i;

const MOBILE_CSS_FALLBACK = `
/* ── Mobile fallback (auto-injected: no @media (max-width) was present) ───── */
@media (max-width: 768px) {
  body { overflow-x: hidden; }
  img  { max-width: 100% !important; height: auto !important; }
  .hamburger { display: flex !important; }
  .nav-links:not(.nav-open) { display: none !important; }
  .nav-links.nav-open {
    display: flex !important; flex-direction: column;
    position: absolute; top: 100%; left: 0; right: 0;
    background: var(--color-bg, #fff);
    padding: 1rem; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 200;
  }
  .features-grid, .services-grid, .products-grid,
  .testimonials-grid, .pricing-grid, .gallery-grid,
  .grid, [class*="grid-"], [class*="-grid"] {
    grid-template-columns: 1fr !important;
  }
  .flex-row, .row, [class*="flex-row"],
  .about-inner, .cta-inner, .contact-inner {
    flex-direction: column !important;
  }
  .btn, .btn-primary, .btn-secondary, .cta-btn {
    width: 100%; justify-content: center;
  }
  /* Header stays horizontal; its buttons stay auto-width */
  header, .navbar, .site-header { flex-direction: row !important; justify-content: space-between; align-items: center; }
  header .btn, header .btn-primary, header .btn-secondary,
  .navbar .btn, .navbar .btn-primary, .navbar .btn-secondary,
  .nav-cta, .header-cta { width: auto !important; }
  section, .section { padding: 2.5rem 1rem !important; }
  .hero h1, .hero .hero-title { font-size: clamp(1.8rem, 7vw, 2.8rem) !important; }
  .hero p,  .hero .hero-sub   { font-size: clamp(0.95rem, 3vw, 1.2rem) !important; }
}
`;

function fixViewportMeta(html: string): string {
  if (VIEWPORT_META_RE.test(html)) return html; // already present — idempotent
  // Inject right after <head> (or <html> if <head> absent)
  const headIdx = html.indexOf("<head>");
  if (headIdx !== -1) {
    const insertAt = headIdx + "<head>".length;
    return html.slice(0, insertAt) + "\n  " + VIEWPORT_META_TAG + html.slice(insertAt);
  }
  const htmlIdx = html.indexOf("<html");
  const htmlTagEnd = htmlIdx !== -1 ? html.indexOf(">", htmlIdx) + 1 : -1;
  if (htmlTagEnd > 0) {
    return html.slice(0, htmlTagEnd) + "\n<head>\n  " + VIEWPORT_META_TAG + "\n</head>" + html.slice(htmlTagEnd);
  }
  return html; // can't determine where to inject — leave unchanged
}

const MOBILE_480_MARKER = "/* zeus:mobile-480 */";
// Extra-small phones (<= 480px): iPhone SE 375px, budget Android. Collapses grids,
// shrinks type/padding, makes CTAs full-width. Marker-guarded for idempotency; zero-token.
const MOBILE_480_FALLBACK = `
${MOBILE_480_MARKER}
@media (max-width: 480px) {
  .features-grid, .services-grid, .products-grid,
  .testimonials-grid, .pricing-grid, .gallery-grid,
  .grid, [class*="grid-"], [class*="-grid"] {
    grid-template-columns: 1fr !important;
    gap: 1rem !important;
  }
  section, .section { padding: 1.75rem 1rem !important; }
  .hero h1, .hero .hero-title { font-size: clamp(1.5rem, 7vw, 2.2rem) !important; }
  .hero p, .hero .hero-sub { font-size: clamp(0.9rem, 3.5vw, 1.05rem) !important; }
  .btn, .btn-primary, .btn-secondary, .cta-btn { width: 100% !important; }
  .container, .wrapper { padding-left: 1rem !important; padding-right: 1rem !important; }
}`;

const GRID_COLLAPSE_MARKER = "/* zeus:grid-collapse */";
// Guarantees multi-column grids fold to one column on phones even when the model
// already shipped its own @media (max-width:) block without a grid rule. Marker-guarded.
const GRID_COLLAPSE_FALLBACK = `
${GRID_COLLAPSE_MARKER}
@media (max-width: 768px) {
  .features-grid, .services-grid, .products-grid,
  .testimonials-grid, .pricing-grid, .gallery-grid,
  .grid, [class*="grid-"], [class*="-grid"] {
    grid-template-columns: 1fr !important;
  }
}`;

function fixMobileCss(css: string): string {
  let out = css;
  const hasMq = /@media\s*\(\s*max-width\s*:/i.test(out);
  if (!hasMq) {
    // No max-width media query at all -> append the full 768px fallback (which already
    // collapses grids to 1fr), and stamp the grid-collapse marker so re-runs are no-ops.
    out += MOBILE_CSS_FALLBACK + "\n" + GRID_COLLAPSE_MARKER + "\n";
  } else if (!out.includes(GRID_COLLAPSE_MARKER)) {
    // A media query exists but grid collapse to 1fr is not guaranteed -> add a guarded one.
    out += GRID_COLLAPSE_FALLBACK;
  }
  // Always guarantee an extra-small (<= 480px) block for tiny phones.
  if (!out.includes(MOBILE_480_MARKER)) {
    out += MOBILE_480_FALLBACK;
  }
  return out;
}

export function sanitizeMobile(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  let htmlFixed = false;
  let cssFixed = false;

  const result = files.map((file) => {
    if (file.path === "index.html") {
      const fixed = fixViewportMeta(file.content);
      if (fixed !== file.content) { htmlFixed = true; return { ...file, content: fixed }; }
    }
    if (file.path === "style.css") {
      const fixed = fixMobileCss(file.content);
      if (fixed !== file.content) { cssFixed = true; return { ...file, content: fixed }; }
    }
    return file;
  });

  if (htmlFixed) {
    console.warn("[sanitizeMobile] Fixed: viewport meta was missing from index.html — injected");
  }
  if (cssFixed) {
    console.warn("[sanitizeMobile] Fixed: no @media (max-width) found in style.css — appended mobile fallback");
  }

  return result;
}

// ─── END MOBILE POST-PROCESSING ──────────────────────────────────────────────

// ─── IMAGE POST-PROCESSING ────────────────────────────────────────────────────
// Deterministic, zero-token, idempotent audit applied inside parseGeneratedOutput.
// Operates on every .html / .htm / .jsx / .tsx file.
// Fixes:
//   1. Replaces deprecated source.unsplash.com → images.unsplash.com
//   2. Adds themed onerror loremflickr fallback to images.unsplash.com <img> that lack one
//   3. Adds loading="lazy" when the attribute is absent
//   4. Adds alt="Photo" when the attribute is missing or empty
// Makes ZERO network calls, consumes ZERO OpenAI tokens.
// Idempotent: re-running on already-correct files returns them unchanged.

/** Extract a concise loremflickr keyword from an img's alt text or src URL. */
function extractImgKeyword(src: string, alt: string): string {
  const altWord = alt.trim().split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, "").toLowerCase() ?? "";
  if (altWord.length > 2) return altWord;
  // Reuse keyword already embedded in a loremflickr src (supports idempotency)
  const m = /loremflickr\.com\/\d+\/\d+\/([^?&"'\s]+)/i.exec(src);
  if (m?.[1]) return m[1];
  return "photo";
}

/** Repair a single matched <img ...> tag string. */
function repairImgTag(tag: string): { tag: string; changed: boolean } {
  let out = tag;
  let changed = false;

  // 1. Deprecated CDN → supported CDN
  if (out.includes("source.unsplash.com")) {
    out = out.replace(/source\.unsplash\.com/gi, "images.unsplash.com");
    changed = true;
  }

  // Pull attribute values for keyword extraction (after potential URL fix)
  const srcM = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/i.exec(out);
  const altM = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(out);
  const src  = srcM ? (srcM[1] ?? srcM[2] ?? srcM[3] ?? "") : "";
  const alt  = altM ? (altM[1] ?? altM[2] ?? "") : "";
  const hasAlt = altM !== null || /\balt\s*=/i.test(out);

  // 2. Add themed onerror fallback to images.unsplash.com that are missing it
  if (src.includes("images.unsplash.com") && !/\bonerror\b/i.test(out)) {
    const kw = extractImgKeyword(src, alt);
    const fallback = `https://loremflickr.com/1200/800/${kw}`;
    out = out.replace(/(\s*\/?>)$/, ` onerror="this.onerror=null;this.src='${fallback}'"$1`);
    changed = true;
  }

  // 3. Ensure alt is present and non-empty
  if (!hasAlt) {
    out = out.replace(/(\s*\/?>)$/, ` alt="Photo"$1`);
    changed = true;
  } else if (alt.trim() === "") {
    out = out.replace(/\balt\s*=\s*(?:"[^"]*"|'[^']*')/, `alt="Photo"`);
    changed = true;
  }

  // 4. Ensure loading attribute is present (don't clobber loading="eager" on hero)
  if (!/\bloading\s*=/i.test(out)) {
    out = out.replace(/(\s*\/?>)$/, ` loading="lazy"$1`);
    changed = true;
  }

  return { tag: out, changed };
}

// Matches a complete <img ...> or <img ... /> tag, safely skipping quoted attribute values
const IMG_TAG_RE = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*\/?>/gi;

export function sanitizeImages(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  const HTML_EXTS = /\.(html?|jsx?|tsx?)$/i;
  let fixedFileCount = 0;

  const result = files.map((file) => {
    if (!HTML_EXTS.test(file.path)) return file;

    let fileChanged = false;
    const content = file.content.replace(IMG_TAG_RE, (match) => {
      const { tag: fixed, changed } = repairImgTag(match);
      if (changed) fileChanged = true;
      return fixed;
    });

    if (fileChanged) {
      fixedFileCount++;
      return { ...file, content };
    }
    return file;
  });

  if (fixedFileCount > 0) {
    console.warn(
      `[sanitizeImages] Repaired <img> attributes in ${fixedFileCount} file(s): ` +
        `ensured onerror/loremflickr fallback, loading="lazy", non-empty alt; ` +
        `replaced any source.unsplash.com URLs`
    );
  }

  return result;
}

// ─── END IMAGE POST-PROCESSING ───────────────────────────────────────────────

// ─── FONT POST-PROCESSING ─────────────────────────────────────────────────────
// Deterministic, zero-token, idempotent fix: ensures every CSS font variable
// (--font-display, --font-body, etc.) declared in :root of style.css has a
// corresponding Google Fonts <link> in index.html.
// Reads CSS, reads HTML, injects only missing <link> tags. No network calls.

/** Extract the first quoted font family name from a CSS font-stack value string */
function extractFontFamilyName(value: string): string | null {
  const quoted = /['"]([^'"]+)['"]/i.exec(value);
  if (quoted?.[1]) return quoted[1].trim();
  const unquoted = value.split(",")[0]?.trim() ?? "";
  const genericFamilies = /^(serif|sans-serif|monospace|cursive|fantasy|inherit|initial|unset|system-ui|-apple-system)$/i;
  if (unquoted && !genericFamilies.test(unquoted)) return unquoted;
  return null;
}

/** Build a Google Fonts stylesheet URL for a given family name */
function buildGoogleFontsUrl(familyName: string): string {
  const encoded = familyName.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`;
}

/** Return true if an existing Google Fonts URL covers the given family */
function googleFontsUrlCoversFamily(url: string, familyName: string): boolean {
  const needle = familyName.replace(/ /g, "+").toLowerCase();
  const hay   = url.toLowerCase().replace(/%20/g, "+");
  // Match family=Name: or family=Name& or family=Name at end-of-string
  return /family=/.test(hay) && new RegExp(`family=${needle.replace(/\+/g, "\\+")}(?:[:%&]|$)`).test(hay);
}

export function sanitizeFonts(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  const cssFile  = files.find(f => f.path === "style.css");
  const htmlFile = files.find(f => f.path === "index.html");
  if (!cssFile || !htmlFile) return files;

  // 1. Parse --font-* variables from :root block in CSS
  const rootM = /:root\s*\{([^}]*)\}/s.exec(cssFile.content);
  if (!rootM) return files;
  const fontVarRe = /--font-[\w-]+\s*:\s*([^;]+);/gi;
  const fontNames = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = fontVarRe.exec(rootM[1])) !== null) {
    const name = extractFontFamilyName(m[1]);
    if (name) fontNames.add(name);
  }
  if (fontNames.size === 0) return files;

  // 2. Parse existing Google Fonts <link> URLs from HTML
  const GF_LINK_RE = /href\s*=\s*["']([^"']*fonts\.googleapis\.com\/css2?[^"']*)["']/gi;
  const existingUrls: string[] = [];
  let lm: RegExpExecArray | null;
  while ((lm = GF_LINK_RE.exec(htmlFile.content)) !== null) existingUrls.push(lm[1]);

  // 3. Find which font names are not covered by any existing URL
  const missing = [...fontNames].filter(
    name => !existingUrls.some(url => googleFontsUrlCoversFamily(url, name))
  );
  if (missing.length === 0) return files;

  // 4. Inject <link> tags for missing fonts right after the last GF link (or before </head>)
  const newLinks = missing
    .map(name => `  <link rel="stylesheet" href="${buildGoogleFontsUrl(name)}">`)
    .join("\n");

  let injected = htmlFile.content;
  const lastGfIdx = injected.lastIndexOf("fonts.googleapis.com");
  if (lastGfIdx !== -1) {
    const tagEnd = injected.indexOf(">", lastGfIdx);
    injected = tagEnd !== -1
      ? injected.slice(0, tagEnd + 1) + "\n" + newLinks + injected.slice(tagEnd + 1)
      : injected.replace("</head>", newLinks + "\n</head>");
  } else {
    injected = injected.replace("</head>", newLinks + "\n</head>");
  }

  console.warn(`[sanitizeFonts] Injected Google Fonts <link> for missing font(s): ${missing.join(", ")}`);
  return files.map(f => f.path === "index.html" ? { ...f, content: injected } : f);
}

// ─── END FONT POST-PROCESSING ─────────────────────────────────────────────────

// ─── NAVBAR POST-PROCESSING ───────────────────────────────────────────────────
// Two deterministic, zero-token, idempotent guards injected into style.css:
//   1. Contrast guard: when navbar is transparent over dark hero, initial-state
//      nav links become invisible. Inject a :not(.scrolled) color:#fff rule.
//   2. Mobile layout guard: ensure header stays flex-row on mobile and nav CTA
//      buttons don't inherit the global width:100% rule.
// Both guards are idempotent (marker comment prevents double-injection).

const NAVBAR_CONTRAST_GUARD = `
/* ── Navbar contrast guard (auto-injected) ─────────────────────────────────── */
/* Ensures nav links/logo are readable in the transparent pre-scroll state over dark hero */
header:not(.scrolled) .nav-links a,
header:not(.scrolled) .nav-link,
.navbar:not(.scrolled) .nav-links a,
.navbar:not(.scrolled) .nav-link { color: #ffffff !important; }
header:not(.scrolled) .logo,
header:not(.scrolled) .nav-brand,
.navbar:not(.scrolled) .logo,
.navbar:not(.scrolled) .nav-brand { color: #ffffff !important; }
`;

const NAVBAR_MOBILE_GUARD = `
/* ── Mobile nav safety (auto-injected) ─────────────────────────────────────── */
@media (max-width: 768px) {
  /* Header stays horizontal: logo left, hamburger / CTA right */
  header, .navbar, .site-header, nav.navbar {
    flex-direction: row !important;
    justify-content: space-between;
    align-items: center;
  }
  /* Nav CTA button stays auto-width (overrides the global width:100% rule) */
  header .btn, header .btn-primary, header .btn-secondary,
  .navbar .btn, .navbar .btn-primary, .navbar .btn-secondary,
  .nav-cta, .header-cta { width: auto !important; min-width: 0 !important; }
}
`;

const HAMBURGER_DESKTOP_GUARD = `
/* ── Hamburger desktop guard (auto-injected) ────────────────────────────────── */
/* Fixes: hamburger visible on desktop / nav links hidden on desktop.
   Happens when response was truncated before @media (min-width:769px) was written. */
@media (min-width: 769px) {
  .hamburger { display: none !important; }
  .nav-links, #nav-menu { display: flex !important; flex-direction: row; align-items: center; gap: 1.5rem; }
  .nav-links:not(.nav-open), #nav-menu:not(.nav-open) { display: flex !important; }
}
`;

export function sanitizeNavbar(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  let cssChanged = false;

  const result = files.map((file) => {
    if (file.path !== "style.css") return file;
    let css = file.content;
    let fileChanged = false;

    // 1. Contrast guard — only inject when navbar appears to be transparent
    if (!css.includes("Navbar contrast guard") && !css.includes(":not(.scrolled) .nav-links")) {
      const hasTransparentNavbar =
        /\.navbar\s*\{[^}]*background\s*:\s*(?:transparent|none)/s.test(css) ||
        /header\s*\{[^}]*background\s*:\s*(?:transparent|none)/s.test(css) ||
        /backdrop-filter\s*:/i.test(css);
      if (hasTransparentNavbar) {
        css += NAVBAR_CONTRAST_GUARD;
        fileChanged = true;
      }
    }

    // 2. Mobile nav guard — always inject if marker is absent
    if (!css.includes("Mobile nav safety")) {
      css += NAVBAR_MOBILE_GUARD;
      fileChanged = true;
    }

    // 3. Hamburger desktop guard — inject when .hamburger class present but no min-width rule hides it
    //    This fires when the response was truncated before the @media (min-width:769px) block was written,
    //    leaving hamburger always visible and nav links always hidden on desktop.
    if (!css.includes("Hamburger desktop guard") && /\.hamburger\s*\{/.test(css)) {
      const hasDesktopHide = /min-width[^{]*\{[^}]*\.hamburger[^}]*display\s*:\s*none/s.test(css) ||
                             /\.hamburger[^}]*display\s*:\s*none[^}]*\}[^@]*@media[^(]*\([^)]*min-width/s.test(css);
      if (!hasDesktopHide) {
        css += HAMBURGER_DESKTOP_GUARD;
        fileChanged = true;
      }
    }

    if (fileChanged) { cssChanged = true; return { ...file, content: css }; }
    return file;
  });

  if (cssChanged) {
    console.warn("[sanitizeNavbar] Injected navbar contrast/mobile-nav safety rules into style.css");
  }
  return result;
}

// ─── END NAVBAR POST-PROCESSING ───────────────────────────────────────────────

// ─── SCRIPTS POST-PROCESSING ─────────────────────────────────────────────────
// Deterministic, zero-token, idempotent fallback for missing or empty script.js.

const SCRIPTS_FALLBACK = `document.addEventListener('DOMContentLoaded', function () {
  // Hamburger / mobile menu toggle
  var hamburger = document.querySelector('.hamburger, .menu-toggle');
  var navLinks = document.querySelector('.nav-links, nav');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      navLinks.classList.toggle('open');
      navLinks.classList.toggle('active');
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // AOS — only if loaded
  if (window.AOS) { AOS.init({ once: true }); }
});
`;

const SCRIPT_TAG = '<script src="script.js" defer></script>';
const SCRIPT_TAG_RE = /<script\s[^>]*src=["']script\.js["'][^>]*>/i;

/** Returns true when the JS content has a meaningful hamburger toggle or DOMContentLoaded handler. */
function hasWorkingScript(content: string): boolean {
  const c = content.trim();
  if (!c) return false;
  return c.includes('hamburger') || c.includes('DOMContentLoaded');
}

export function sanitizeScripts(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  const scriptFile = files.find((f) => f.path === 'script.js');

  if (scriptFile && hasWorkingScript(scriptFile.content)) {
    // Already has a working script — idempotent, nothing to do
    return files;
  }

  const reason = scriptFile
    ? 'script.js was empty or lacked hamburger toggle / DOMContentLoaded — replaced with fallback'
    : 'script.js was missing — injected fallback and added <script> tag to index.html';
  console.warn(`[sanitizeScripts] ${reason}`);

  let result = files.map((f) => f);

  // Ensure script.js exists with fallback content
  if (!scriptFile) {
    result = [...result, { path: 'script.js', content: SCRIPTS_FALLBACK }];
  } else {
    result = result.map((f) =>
      f.path === 'script.js' ? { ...f, content: SCRIPTS_FALLBACK } : f
    );
  }

  // Ensure <script src="script.js" defer></script> appears before </body> in index.html
  result = result.map((f) => {
    if (f.path !== 'index.html') return f;
    if (SCRIPT_TAG_RE.test(f.content)) return f; // already present — idempotent
    const bodyCloseIdx = f.content.lastIndexOf('</body>');
    if (bodyCloseIdx === -1) {
      return { ...f, content: f.content + '\n' + SCRIPT_TAG };
    }
    return {
      ...f,
      content:
        f.content.slice(0, bodyCloseIdx) +
        SCRIPT_TAG + '\n' +
        f.content.slice(bodyCloseIdx),
    };
  });

  return result;
}

// ─── END SCRIPTS POST-PROCESSING ──────────────────────────────────────────────

// ─── CONTENT POST-PROCESSING ─────────────────────────────────────────────
// Deterministic, zero-token, idempotent content guard applied inside parseGeneratedOutput.
// It NEVER writes quality copy (that is the model's job, enforced via CONTENT RULES in
// SYSTEM_PROMPT). It only (a) replaces obvious placeholder filler with neutral safe text
// so "Lorem ipsum" / "TODO" never reaches production, and (b) detects & logs structural
// thinness (too few <section> blocks) so we can see "raw" output in the logs.
// Must never throw — on any internal error it returns files unchanged.

const LOREM_RE = /\b[Ll]orem\s+[Ii]psum\b[\s\S]*?(?=<|\n\n|$)/g;
const PLACEHOLDER_TOKEN_RE = /\b(?:TODO|FIXME|PLACEHOLDER|REPLACE_ME|YOUR_TEXT_HERE|INSERT_TEXT|TBD)\b/g;
const BRACKET_PLACEHOLDER_RE = /\[(?:placeholder|your[\s_-]?text|insert[\s_-]?\w+|todo)\]/gi;

const NEUTRAL_TEXT = "Подробности скоро появятся.";
const MIN_SECTIONS = 3;

export function sanitizeContent(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  try {
    return files.map((f) => {
      if (!f.path.toLowerCase().endsWith(".html")) return f;

      let content = f.content;
      let replaced = 0;

      const before = content;
      content = content.replace(LOREM_RE, () => { replaced++; return NEUTRAL_TEXT + " "; });
      content = content.replace(PLACEHOLDER_TOKEN_RE, () => { replaced++; return NEUTRAL_TEXT; });
      content = content.replace(BRACKET_PLACEHOLDER_RE, () => { replaced++; return NEUTRAL_TEXT; });

      if (replaced > 0) {
        console.warn(`[sanitizeContent] ${f.path}: replaced ${replaced} placeholder fragment(s) with neutral text`);
      }

      const sectionCount = (content.match(/<section\b/gi) || []).length;
      if (sectionCount < MIN_SECTIONS) {
        console.warn(`[sanitizeContent] ${f.path}: only ${sectionCount} <section> block(s) (< ${MIN_SECTIONS}) — output may be structurally thin / "raw"`);
      }

      return content === before ? f : { ...f, content };
    });
  } catch (err) {
    console.warn(`[sanitizeContent] skipped due to error: ${(err as Error).message}`);
    return files;
  }
}
// ─── END CONTENT POST-PROCESSING ─────────────────────────────────────────


function recoverPartialFiles(raw: string): Array<{ path: string; content: string }> | null {
  const filesIdx = raw.indexOf('"files"');
  if (filesIdx === -1) return null;
  const arrStart = raw.indexOf('[', filesIdx);
  if (arrStart === -1) return null;

  const files: Array<{ path: string; content: string }> = [];
  let i = arrStart + 1;
  const len = raw.length;

  while (i < len) {
    while (i < len && /[\s,]/.test(raw[i])) i++;
    if (i >= len || raw[i] === ']') break;
    if (raw[i] !== '{') break;

    const objStart = i;
    let depth = 0;
    let inString = false;
    let escape = false;

    while (i < len) {
      const ch = raw[i];
      if (escape) { escape = false; i++; continue; }
      if (ch === '\\' && inString) { escape = true; i++; continue; }
      if (ch === '"') { inString = !inString; i++; continue; }
      if (!inString) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) { i++; break; }
        }
      }
      i++;
    }

    if (depth !== 0) break;

    try {
      const obj = JSON.parse(raw.slice(objStart, i)) as Record<string, unknown>;
      if (typeof obj.path === 'string' && typeof obj.content === 'string') {
        files.push({ path: obj.path, content: obj.content });
      }
    } catch {
      break;
    }
  }

  return files.length > 0 ? files : null;
}

export function parseGeneratedOutput(raw: string): GeneratedOutput {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as GeneratedOutput;
    if (!Array.isArray(parsed.files) || typeof parsed.message !== "string") {
      throw new Error("Invalid JSON structure from OpenAI");
    }
    return { ...parsed, files: sanitizeContent(sanitizeScripts(sanitizeFonts(sanitizeImages(sanitizeNavbar(sanitizeMobile(sanitizeAosInit(parsed.files))))))) };
  } catch {
    const recoveredFiles = recoverPartialFiles(cleaned);
    if (recoveredFiles && recoveredFiles.length > 0) {
      return {
        files: sanitizeContent(sanitizeScripts(sanitizeFonts(sanitizeImages(sanitizeNavbar(sanitizeMobile(sanitizeAosInit(recoveredFiles))))))),
        message: "Сайт сгенерирован (восстановлен из обрезанного ответа)",
      };
    }
    throw new Error("Could not parse or recover generated output");
  }
}
