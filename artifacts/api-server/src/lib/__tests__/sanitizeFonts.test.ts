/**
 * Unit tests for sanitizeFonts — run with:
 *   scripts/node_modules/.bin/tsx --test artifacts/api-server/src/lib/__tests__/sanitizeFonts.test.ts
 */
import { sanitizeFonts } from "../openai.js";

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

function files(html: string, css: string) {
  return [
    { path: "index.html", content: html },
    { path: "style.css",  content: css },
  ];
}

function findHtml(out: Array<{ path: string; content: string }>): string {
  return out.find(f => f.path === "index.html")?.content ?? "";
}

const BASE_HTML = `<html><head>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  FONTS_PLACEHOLDER
</head><body></body></html>`;

function html(fontLinks: string) {
  return BASE_HTML.replace("FONTS_PLACEHOLDER", fontLinks);
}

const CSS_ROOT_TWO = `:root {
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;
}`;

const CSS_ROOT_ONE = `:root {
  --font-display: 'Inter', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;
}`;

const CSS_NO_FONTS = `:root {
  --color-bg: #fff;
  --color-text: #111;
}`;

const CSS_UNQUOTED = `:root {
  --font-display: Lato, serif;
  --font-body: Lato, sans-serif;
}`;

// ── Test suite ───────────────────────────────────────────────────────────────

run("idempotent: both fonts already loaded → no change", () => {
  const input = files(
    html(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap">`),
    CSS_ROOT_TWO
  );
  const out = sanitizeFonts(input);
  const outHtml = findHtml(out);
  assert(!outHtml.includes("auto-injected") || outHtml === findHtml(input), "Files unchanged when both fonts loaded");
  assert(outHtml === findHtml(input), "HTML content identical (no injection)");
});

run("injects missing Playfair Display when only Inter is linked", () => {
  const input = files(
    html(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&display=swap">`),
    CSS_ROOT_TWO
  );
  const out = sanitizeFonts(input);
  const outHtml = findHtml(out);
  assert(outHtml.includes("Playfair+Display") || outHtml.includes("Playfair Display"), "Playfair Display link injected");
  assert(outHtml.includes("Inter"), "Inter link preserved");
});

run("injects missing Inter when only Playfair Display is linked", () => {
  const input = files(
    html(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400&display=swap">`),
    CSS_ROOT_TWO
  );
  const out = sanitizeFonts(input);
  const outHtml = findHtml(out);
  assert(outHtml.includes("family=Inter"), "Inter link injected");
  assert(outHtml.includes("Playfair"), "Playfair preserved");
});

run("injects both fonts when no GF links exist at all", () => {
  const input = files(
    `<html><head><title>Test</title></head><body></body></html>`,
    CSS_ROOT_TWO
  );
  const out = sanitizeFonts(input);
  const outHtml = findHtml(out);
  assert(outHtml.includes("Playfair+Display") || outHtml.includes("Playfair Display"), "Playfair injected");
  assert(outHtml.includes("Inter"), "Inter injected");
  assert(outHtml.indexOf("</head>") > 0, "Injected before </head>");
});

run("no change when both fonts are same family (Inter + Inter)", () => {
  const input = files(
    html(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap">`),
    CSS_ROOT_ONE
  );
  const out = sanitizeFonts(input);
  assert(findHtml(out) === findHtml(input), "HTML unchanged when single font already loaded");
});

run("no change when CSS has no :root font variables", () => {
  const input = files(
    `<html><head></head><body></body></html>`,
    CSS_NO_FONTS
  );
  const out = sanitizeFonts(input);
  assert(findHtml(out) === findHtml(input), "No injection when no --font-* vars in CSS");
});

run("no change when style.css absent", () => {
  const input = [{ path: "index.html", content: "<html><head></head><body></body></html>" }];
  const out = sanitizeFonts(input);
  assert(out.length === 1, "Returned same file array");
  assert(out[0].content === input[0].content, "HTML unchanged");
});

run("no change when index.html absent", () => {
  const input = [{ path: "style.css", content: CSS_ROOT_TWO }];
  const out = sanitizeFonts(input);
  assert(out.length === 1, "Returned same file array");
  assert(out[0].content === input[0].content, "CSS unchanged");
});

run("handles unquoted font names in CSS", () => {
  const input = files(
    `<html><head></head><body></body></html>`,
    CSS_UNQUOTED
  );
  const out = sanitizeFonts(input);
  const outHtml = findHtml(out);
  assert(outHtml.includes("Lato") || outHtml.includes("lato"), "Lato font link injected for unquoted name");
});

run("combined GF URL with two families covers both fonts", () => {
  const combinedUrl = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400&display=swap";
  const input = files(
    `<html><head><link rel="stylesheet" href="${combinedUrl}"></head><body></body></html>`,
    CSS_ROOT_TWO
  );
  const out = sanitizeFonts(input);
  assert(findHtml(out) === findHtml(input), "No injection when combined URL covers both fonts");
});

run("injected links appear inside <head> before </head>", () => {
  const input = files(
    `<html><head><title>T</title></head><body></body></html>`,
    CSS_ROOT_TWO
  );
  const outHtml = findHtml(sanitizeFonts(input));
  const headClose = outHtml.indexOf("</head>");
  const playfairIdx = outHtml.indexOf("Playfair");
  const interIdx = outHtml.indexOf("Inter");
  assert(playfairIdx !== -1 && playfairIdx < headClose, "Playfair link is inside <head>");
  assert(interIdx !== -1 && interIdx < headClose, "Inter link is inside <head>");
});

run("idempotent: running twice produces same output", () => {
  const input = files(
    `<html><head></head><body></body></html>`,
    CSS_ROOT_TWO
  );
  const once = sanitizeFonts(input);
  const twice = sanitizeFonts(once);
  assert(findHtml(once) === findHtml(twice), "Second run produces identical HTML");
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────────────────`);
console.log(`sanitizeFonts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
