import OpenAI from "openai";

export const MODELS = {
  lite: "gpt-4o-mini",
  power: "gpt-4o",
} as const;

export type ModelTier = keyof typeof MODELS;

export const SYSTEM_PROMPT = `You are an elite frontend design engineer. You craft stunning, production-quality web experiences — the kind that win design awards.

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
         cdnjs.cloudflare.com, source.unsplash.com, images.unsplash.com, picsum.photos
NEVER use any other external domain for scripts, styles, fonts, or images.

═══════════════════════════════════════
IMAGES (mandatory — no CSS/emoji placeholders)
═══════════════════════════════════════
- ALWAYS use real <img> tags with actual photo URLs — never coloured div/CSS-only placeholders
- Hero backgrounds: use a real photo via CSS background-image or <img>:
    background-image: url('https://source.unsplash.com/1600x900/?TOPIC,KEYWORDS');
  or place an <img src="https://source.unsplash.com/1600x900/?TOPIC,KEYWORDS" alt="..." loading="lazy">
- Section/card images: https://picsum.photos/seed/UNIQUESEED/WIDTH/HEIGHT (vary seed per image)
    e.g. picsum.photos/seed/cafe1/600/400, picsum.photos/seed/cafe2/600/400
- Topic photos: https://source.unsplash.com/800x600/?coffee,latte (comma-separated keywords matching the theme)
- Every <img> must have: meaningful alt="…" describing the scene, loading="lazy", CSS object-fit: cover
- Image containers must have explicit height (e.g. height: 260px) so images display correctly

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
- In script.js inside DOMContentLoaded: AOS.init({ duration: 700, once: true, offset: 80 });
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
1. CSS VARIABLES — always open style.css with a :root block:
   • Colour palette: --color-bg, --color-surface, --color-primary, --color-primary-hover,
     --color-text, --color-text-muted, --color-border
   • Typography scale: --font-sans, --font-display, --text-xs through --text-5xl (clamp-based)
   • Spacing scale: --space-1 through --space-20 (4-point grid)
   • Borders: --radius-sm, --radius-md, --radius-lg, --radius-full
   • Shadows: --shadow-sm, --shadow-md, --shadow-lg, --shadow-glow
   • Transitions: --transition-fast (150ms ease), --transition-base (250ms ease), --transition-slow (400ms ease)

2. TYPOGRAPHY — always load 1–2 Google Fonts via <link> in <head>:
   • Display/heading font (e.g. Playfair Display, Syne, DM Serif Display, Outfit)
   • Body font (e.g. Inter, DM Sans, Plus Jakarta Sans)
   • Clear visual hierarchy: hero headline 48–80 px, section headings 28–40 px, body 16–18 px
   • Line-height: 1.1–1.2 for headings, 1.6–1.7 for body

3. LAYOUT — use CSS Grid and Flexbox:
   • Max content width 1200 px, centred, with fluid side padding
   • Generous vertical rhythm: section padding min 80 px top/bottom
   • Consistent horizontal gutters via gap / column-gap

4. MOBILE-FIRST RESPONSIVE:
   • Base styles target mobile (≤ 480 px)
   • @media (min-width: 768px)  — tablet
   • @media (min-width: 1024px) — desktop
   • Stack columns on mobile, switch to grid on tablet+
   • Touch targets ≥ 44 px

5. MICRO-INTERACTIONS:
   • Smooth hover/focus transitions on all interactive elements (colour, shadow, transform)
   • Button press: active { transform: scale(0.97) }
   • Card hover: translateY(-4px) + box-shadow upgrade
   • Every transition uses a CSS variable duration

6. COMPONENTS (use as needed):
   • Navbar: sticky, backdrop-filter blur, transparent→scrolled (bg + shadow) on scroll; hamburger on mobile
   • Hero: full-viewport-height, real background image with overlay, large headline (Animate.css), subheadline, 1–2 CTAs
   • Cards: consistent padding, border, radius, shadow; hover lift; real picsum images at top; Lucide icons
   • Buttons: primary (filled), secondary (outline), sizes sm/md/lg; focus-visible ring
   • Badges / tags: pill shape, muted background
   • Dividers: subtle gradient lines between sections

═══════════════════════════════════════
INTERACTIVITY (vanilla JS in script.js — mandatory)
═══════════════════════════════════════
Always implement ALL that apply to the project type:
- DOMContentLoaded wrapper: all JS inside document.addEventListener('DOMContentLoaded', () => { ... })
- AOS.init({ duration: 700, once: true, offset: 80 })  — always
- lucide.createIcons()  — always, after AOS.init()
- Hamburger menu: toggle .nav-open on <nav>, swap data-lucide="menu"↔"x", then re-run lucide.createIcons()
- Navbar scroll: window.addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 50))
- Smooth scroll: all a[href^="#"] → e.preventDefault() + target.scrollIntoView({ behavior: 'smooth' })
- Active nav link: highlight current section link based on scroll position (IntersectionObserver)
- Form validation: check required fields, show inline .error-msg, clear on fix, success state on submit
- Tabs: .tab-btn click → toggle .active, show matching .tab-panel
- Accordion/FAQ: .accordion-btn click → toggle .open on parent item, animate max-height
- For shop type: full cart (add/remove/qty/total) via localStorage, live badge, sidebar open/close

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
QUALITY BAR
═══════════════════════════════════════
Before finalising, mentally review:
□ Real <img> tags with unsplash/picsum URLs everywhere (zero CSS/emoji placeholders)?
□ Lucide loaded in <head>, lucide.createIcons() called in script.js?
□ AOS loaded in <head>, AOS.init() called, data-aos on every section and card?
□ Hero headline/subheadline have Animate.css classes?
□ Hamburger menu works on mobile (toggle + icon swap)?
□ Smooth scroll + navbar scroll effect implemented?
□ Every section has breathing room (generous padding)?
□ Type scale is clearly hierarchical?
□ Hover states on every interactive element?
□ Layout responsive from 320 px to 1440 px?
□ All copy specific and meaningful (zero placeholders)?
□ Colour palette feels cohesive?

Aim for the output to look like a professional Figma design translated to code — not a template, not a tutorial exercise.`;

export interface GeneratedOutput {
  files: Array<{ path: string; content: string }>;
  message: string;
}

const TYPE_PROMPTS: Record<string, string> = {
  landing: `
═══════════════════════════════════════
PROJECT TYPE: MULTI-SECTION LANDING PAGE
═══════════════════════════════════════
Structure (in this order):
1. Sticky navbar with logo + navigation links + hamburger on mobile (Lucide menu/x)
2. Hero — full-viewport height, real background photo (source.unsplash.com, topic-matched),
   dark overlay (rgba 0.5), large headline (animate__fadeInDown), subheadline (animate__fadeInUp animate__delay-1s), 1–2 CTA buttons
3. Features / Benefits — 3–6 cards in a responsive grid, each with:
   - Lucide icon (relevant to feature), short title, 1–2 line description
   - data-aos="zoom-in" with staggered data-aos-delay
4. Pricing — 3 tiers with names, prices, feature lists (Lucide check icons), "Most popular" highlight on middle tier
5. Testimonials — 2–3 quote cards with picsum avatar images (round, 60px), name, role, data-aos="fade-up"
6. Final CTA — bold call-to-action section with contrasting background, real background image optional
7. Footer — logo, nav links, social icons (Lucide), copyright

Each section must have a distinct background (alternate --color-bg / --color-surface).
All sections except hero get data-aos="fade-up".`,

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
- Every interactive element must have hover/focus styles and smooth transitions
- App shell: fixed/sticky header with app name and optional nav, main content area, footer
- Use Lucide icons where appropriate (include the script tag in index.html)
- AOS for any scroll-reveal elements, Animate.css for entry animations on mount

File structure: index.html (shell + CDN imports), style.css (design system), app.jsx (all React components).`,

  shop: `
═══════════════════════════════════════
PROJECT TYPE: E-COMMERCE / ONLINE STORE
═══════════════════════════════════════
Build a polished product catalogue with shopping cart:

1. Sticky header: store logo, navigation, cart icon (Lucide shopping-cart) with item count badge
2. Hero banner: real background photo (source.unsplash.com, shop-theme keywords), promotional headline, discount badge, CTA button
3. Category filter bar: horizontal scrollable pill buttons (All + 3–4 categories); active category highlighted
4. Product grid: responsive CSS Grid (1→2→3→4 cols), each card has:
   - Real product image: <img src="https://picsum.photos/seed/PRODUCTNAME/400/300" alt="..." loading="lazy">
   - Product name, short description, price (formatted with currency symbol)
   - "Add to cart" button with Lucide shopping-cart icon, hover lift effect
   - "Out of stock" state for 1–2 products (disabled button, muted overlay)
   - data-aos="fade-up" with staggered delays
5. Cart sidebar: slides in from right, lists items with qty controls (+ / −) and Lucide trash-2 remove, subtotal, "Checkout" button
6. Inventory: pre-populate 8–12 realistic products with names, prices, categories, descriptions
7. Footer: store info, links, payment method icons (Lucide), copyright

All cart logic (add, remove, qty change, total) in plain JS via localStorage.
On page load: restore cart from localStorage, update badge count.`,

  card: `
═══════════════════════════════════════
PROJECT TYPE: DIGITAL BUSINESS CARD (single screen)
═══════════════════════════════════════
Single-page, single-screen (100vh) layout — NO scrolling sections, everything fits above the fold.
Layout (centred, card-like container max 480 px wide):
- Avatar: large circle (120 px) with gradient background and initials — or a picsum face photo (object-fit: cover, border-radius: 50%)
- Name: large display font, prominent
- Title / role: subtitle in muted colour
- Bio: 1–2 sentence tagline
- Contact row: 3–4 icon+text links — use Lucide icons (mail, phone, map-pin, globe)
- Social links: row of circular icon buttons using Lucide (github, twitter, instagram, linkedin) with hover colour
- CTA button: "Get in touch" or equivalent, full-width, primary colour

Design notes:
- Background: subtle gradient or mesh pattern (CSS only)
- Card has white/surface background, generous padding, rounded-xl, box-shadow
- Micro-animations: avatar subtle float (CSS keyframe), links stagger in via animate__animated animate__fadeInUp
- Dark/light toggle button in top-right corner (Lucide sun/moon, toggle class on <body>)
- Must look stunning on mobile (320–480 px) — this is the primary viewport`,
};

export function getTypePrompt(projectType?: string | null): string {
  const type = projectType ?? "landing";
  return TYPE_PROMPTS[type] ?? TYPE_PROMPTS["landing"];
}

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required for code generation");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateWithOpenAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  projectType?: string | null,
  tier: ModelTier = "power"
): Promise<GeneratedOutput> {
  const openai = getOpenAIClient();
  const model = MODELS[tier];

  const fullSystemPrompt = SYSTEM_PROMPT + "\n\n" + getTypePrompt(projectType);

  const chatMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    { role: "system", content: fullSystemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  let response: string | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: chatMessages,
        temperature: 0.2,
        max_tokens: 16000,
      });

      response = completion.choices[0]?.message?.content ?? null;
      if (!response) throw new Error("Empty response from OpenAI");

      const cleaned = response
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as GeneratedOutput;

      if (!Array.isArray(parsed.files) || typeof parsed.message !== "string") {
        throw new Error("Invalid JSON structure from OpenAI");
      }

      return parsed;
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
  tier: ModelTier = "power"
): AsyncGenerator<string> {
  const openai = getOpenAIClient();
  const model = MODELS[tier];

  const fullSystemPrompt = SYSTEM_PROMPT + "\n\n" + getTypePrompt(projectType);

  const chatMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    { role: "system", content: fullSystemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const stream = await openai.chat.completions.create({
    model,
    messages: chatMessages,
    temperature: 0.2,
    max_tokens: 16000,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
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
- techNotes: mention relevant tech (React CDN, CSS Grid, localStorage, AOS, Lucide, Unsplash, etc.)
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
- Keep all real <img> tags with unsplash/picsum URLs — never replace with CSS placeholders.
- Keep Lucide CDN script and all data-lucide icons — keep lucide.createIcons() in script.js.
- Keep AOS CDN links and Animate.css CDN links — keep AOS.init() and all data-aos attributes.
- Keep hamburger menu JS, smooth scroll, navbar scroll effect, and any form validation.
- Only modify what the instruction asks — leave everything else intact.`;

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
        max_tokens: 16000,
      });

      const response = completion.choices[0]?.message?.content ?? null;
      if (!response) throw new Error("Empty response from OpenAI");

      const cleaned = response
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as GeneratedOutput;

      if (!Array.isArray(parsed.files) || typeof parsed.message !== "string") {
        throw new Error("Invalid JSON structure from OpenAI");
      }

      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`editProject failed after 3 attempts: ${lastError?.message}`);
}

export function parseGeneratedOutput(raw: string): GeneratedOutput {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as GeneratedOutput;

  if (!Array.isArray(parsed.files) || typeof parsed.message !== "string") {
    throw new Error("Invalid JSON structure from OpenAI");
  }

  return parsed;
}
