/**
 * Unit tests for sanitizeNavbar — run with:
 *   scripts/node_modules/.bin/tsx --test artifacts/api-server/src/lib/__tests__/sanitizeNavbar.test.ts
 */
import { sanitizeNavbar } from "../openai.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function run(label: string, fn: () => void) {
  console.log(`\n${label}`);
  fn();
}

function css(content: string) {
  return [{ path: "style.css", content }];
}

function findCss(out: Array<{ path: string; content: string }>): string {
  return out.find(f => f.path === "style.css")?.content ?? "";
}

// ── Baseline CSS snippets ────────────────────────────────────────────────────

const CSS_TRANSPARENT_NAVBAR = `.navbar {
  position: sticky;
  top: 0;
  background: transparent;
  backdrop-filter: blur(12px);
}
.nav-links a { color: var(--color-text); }`;

const CSS_SCROLLED_NAVBAR = `.navbar {
  position: sticky;
  top: 0;
  background: rgba(255,255,255,0.95);
}
.navbar.scrolled { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.nav-links a { color: var(--color-text); }`;

const CSS_ALREADY_HAS_CONTRAST = `.navbar { backdrop-filter: blur(12px); background: transparent; }
.navbar:not(.scrolled) .nav-links a { color: #fff; }`;

const CSS_ALREADY_HAS_MOBILE_GUARD = `.navbar { backdrop-filter: blur(12px); background: transparent; }
/* ── Mobile nav safety (auto-injected) ─────────────────────────────────────── */
@media (max-width: 768px) { header { flex-direction: row !important; } }`;

const CSS_OPAQUE_NAVBAR = `.navbar { position: sticky; background: #1a1a1a; }
.nav-links a { color: #fff; }`;

// ── Tests ────────────────────────────────────────────────────────────────────

run("injects contrast guard when navbar is background:transparent with backdrop-filter", () => {
  const out = findCss(sanitizeNavbar(css(CSS_TRANSPARENT_NAVBAR)));
  assert(out.includes("Navbar contrast guard"), "Contrast guard marker injected");
  assert(out.includes(":not(.scrolled) .nav-links a"), ":not(.scrolled) nav link rule present");
  assert(out.includes("color: #ffffff"), "White text color injected");
});

run("injects contrast guard when backdrop-filter alone triggers it", () => {
  const input = `.header { backdrop-filter: blur(10px); } .nav-links a { color: var(--color-text); }`;
  const out = findCss(sanitizeNavbar(css(input)));
  assert(out.includes("Navbar contrast guard"), "Contrast guard injected for backdrop-filter only");
});

run("does NOT inject contrast guard when navbar has opaque background", () => {
  const out = findCss(sanitizeNavbar(css(CSS_OPAQUE_NAVBAR)));
  assert(!out.includes("Navbar contrast guard"), "No contrast guard when navbar is opaque");
});

run("does NOT inject contrast guard when :not(.scrolled) rule already exists", () => {
  const out = findCss(sanitizeNavbar(css(CSS_ALREADY_HAS_CONTRAST)));
  assert(!out.includes("Navbar contrast guard"), "Skips guard injection — already handled by model");
});

run("always injects mobile nav guard into every style.css", () => {
  const outTransparent = findCss(sanitizeNavbar(css(CSS_TRANSPARENT_NAVBAR)));
  const outScrolled    = findCss(sanitizeNavbar(css(CSS_SCROLLED_NAVBAR)));
  const outOpaque      = findCss(sanitizeNavbar(css(CSS_OPAQUE_NAVBAR)));
  assert(outTransparent.includes("Mobile nav safety"), "Mobile guard added to transparent navbar CSS");
  assert(outScrolled.includes("Mobile nav safety"),    "Mobile guard added to scrolled navbar CSS");
  assert(outOpaque.includes("Mobile nav safety"),      "Mobile guard added to opaque navbar CSS");
});

run("mobile guard contains header flex-row and width:auto rules", () => {
  const out = findCss(sanitizeNavbar(css(CSS_TRANSPARENT_NAVBAR)));
  assert(out.includes("flex-direction: row !important"), "flex-direction:row rule present");
  assert(out.includes("width: auto !important"),         "width:auto override present");
  assert(out.includes("max-width: 768px"),               "Inside @media (max-width:768px)");
});

run("does NOT double-inject mobile guard when already present", () => {
  const out = findCss(sanitizeNavbar(css(CSS_ALREADY_HAS_MOBILE_GUARD)));
  const count = (out.match(/Mobile nav safety/g) ?? []).length;
  assert(count === 1, `Mobile guard appears exactly once (found ${count})`);
});

run("idempotent: running twice produces same output", () => {
  const input = css(CSS_TRANSPARENT_NAVBAR);
  const once  = sanitizeNavbar(input);
  const twice = sanitizeNavbar(once);
  assert(findCss(once) === findCss(twice), "Second run identical to first");
});

run("passes through non-CSS files unchanged", () => {
  const input = [
    { path: "index.html", content: "<html></html>" },
    { path: "style.css",  content: CSS_TRANSPARENT_NAVBAR },
    { path: "script.js",  content: "console.log('hi');" },
  ];
  const out = sanitizeNavbar(input);
  const htmlFile = out.find(f => f.path === "index.html");
  const jsFile   = out.find(f => f.path === "script.js");
  assert(htmlFile?.content === "<html></html>", "HTML file untouched");
  assert(jsFile?.content   === "console.log('hi');", "JS file untouched");
});

run("passes through when no style.css in files array", () => {
  const input = [{ path: "index.html", content: "<html></html>" }];
  const out = sanitizeNavbar(input);
  assert(out.length === 1 && out[0].content === "<html></html>", "No changes when no style.css");
});

run("contrast guard and mobile guard both appended at end of CSS", () => {
  const out = findCss(sanitizeNavbar(css(CSS_TRANSPARENT_NAVBAR)));
  const contrastIdx = out.indexOf("Navbar contrast guard");
  const mobileIdx   = out.indexOf("Mobile nav safety");
  const origEnd     = CSS_TRANSPARENT_NAVBAR.length;
  assert(contrastIdx > origEnd - 10, "Contrast guard appended after original CSS");
  assert(mobileIdx > origEnd - 10,   "Mobile guard appended after original CSS");
});

// ── Hamburger desktop guard tests ─────────────────────────────────────────────

const CSS_HAMBURGER_NO_DESKTOP_HIDE = `.navbar { position: sticky; background: transparent; }
.hamburger { display: flex; cursor: pointer; }
.nav-links { display: none; }
.nav-links.nav-open { display: flex; flex-direction: column; }
@media (max-width: 768px) {
  .hamburger { display: flex !important; }
}`;

const CSS_HAMBURGER_WITH_DESKTOP_HIDE = `.navbar { position: sticky; }
.hamburger { display: flex; }
.nav-links { display: none; }
@media (min-width: 769px) {
  .hamburger { display: none; }
  .nav-links { display: flex; }
}
@media (max-width: 768px) {
  .hamburger { display: flex !important; }
}`;

const CSS_HAMBURGER_MIN768 = `.navbar { position: sticky; }
.hamburger { display: flex; }
@media (min-width: 768px) { .hamburger { display: none; } .nav-links { display: flex; } }`;

const CSS_NO_HAMBURGER = `.navbar { position: sticky; } .nav-links { display: flex; }`;

run("injects hamburger desktop guard when .hamburger has no min-width hide rule", () => {
  const out = findCss(sanitizeNavbar(css(CSS_HAMBURGER_NO_DESKTOP_HIDE)));
  assert(out.includes("Hamburger desktop guard"), "Hamburger desktop guard marker injected");
  assert(out.includes("display: none !important"), "hamburger hide rule injected");
  assert(out.includes("min-width: 769px"), "@media min-width block injected");
});

run("does NOT inject hamburger guard when min-width hide already present", () => {
  const out = findCss(sanitizeNavbar(css(CSS_HAMBURGER_WITH_DESKTOP_HIDE)));
  assert(!out.includes("Hamburger desktop guard"), "No injection when desktop hide already exists");
});

run("does NOT inject hamburger guard when min-width 768px hide already present", () => {
  const out = findCss(sanitizeNavbar(css(CSS_HAMBURGER_MIN768)));
  assert(!out.includes("Hamburger desktop guard"), "No injection when min-width:768px hide exists");
});

run("does NOT inject hamburger guard when no .hamburger class in CSS", () => {
  const out = findCss(sanitizeNavbar(css(CSS_NO_HAMBURGER)));
  assert(!out.includes("Hamburger desktop guard"), "No injection when no .hamburger class");
});

run("hamburger guard includes nav-links flex show rule", () => {
  const out = findCss(sanitizeNavbar(css(CSS_HAMBURGER_NO_DESKTOP_HIDE)));
  assert(out.includes(".nav-links") && out.includes("display: flex !important"), "nav-links show rule present");
});

run("hamburger guard idempotent: running twice produces same output", () => {
  const input = css(CSS_HAMBURGER_NO_DESKTOP_HIDE);
  const once  = sanitizeNavbar(input);
  const twice = sanitizeNavbar(once);
  assert(findCss(once) === findCss(twice), "Second run identical to first (hamburger guard idempotent)");
  const count = (findCss(once).match(/Hamburger desktop guard/g) ?? []).length;
  assert(count === 1, `Hamburger guard appears exactly once (found ${count})`);
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────────────────`);
console.log(`sanitizeNavbar: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
