/**
 * Unit tests for sanitizeMobile (mobile/responsive CSS guarantees) — run with:
 *   scripts/node_modules/.bin/tsx --test artifacts/api-server/src/lib/__tests__/sanitizeMobile.test.ts
 */
import { sanitizeMobile } from "../openai.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  \u2713 ${label}`);
    passed++;
  } else {
    console.error(`  \u2717 ${label}`);
    failed++;
  }
}

function css(content: string) {
  return [
    { path: "index.html", content: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>' },
    { path: "style.css", content },
  ];
}
function getCss(files: Array<{ path: string; content: string }>): string {
  return files.find((f) => f.path === "style.css")!.content;
}

// Case A: CSS with NO media query at all -> full 768px fallback + 480px block injected.
{
  const out = getCss(sanitizeMobile(css(".features-grid { grid-template-columns: repeat(3, 1fr); }")));
  assert(/@media\s*\(\s*max-width:\s*768px\s*\)/.test(out), "A: 768px fallback injected when no MQ present");
  assert(out.includes("/* zeus:mobile-480 */"), "A: 480px block injected (marker present)");
  assert(/@media\s*\(\s*max-width:\s*480px\s*\)/.test(out), "A: 480px media query present");
}

// Case B: CSS already has a 768px MQ but NO grid-collapse -> grid-collapse + 480px added.
{
  const input = "@media (max-width: 768px) { body { padding: 0; } }";
  const out = getCss(sanitizeMobile(css(input)));
  assert(out.includes("/* zeus:grid-collapse */"), "B: grid-collapse guard added when MQ exists without grid rule");
  assert(out.includes("/* zeus:mobile-480 */"), "B: 480px block still guaranteed when 768px MQ pre-exists");
  assert((out.match(/grid-template-columns:\s*1fr\s*!important/g) || []).length >= 1, "B: collapses grid to 1fr !important");
}

// Case C: 480px block present already -> not duplicated (idempotent), no second injection.
{
  const input = "@media (max-width: 480px) { /* zeus:mobile-480 */ .grid { grid-template-columns: 1fr; } }";
  const out = getCss(sanitizeMobile(css(input)));
  assert((out.match(/\/\* zeus:mobile-480 \*\//g) || []).length === 1, "C: 480px marker not duplicated (idempotent)");
}

// Case D: running twice is a no-op the second time (full idempotency).
{
  const once = sanitizeMobile(css(".grid { grid-template-columns: repeat(2, 1fr); }"));
  const twice = sanitizeMobile(once);
  assert(getCss(once) === getCss(twice), "D: sanitizeMobile is idempotent (second run is a no-op)");
}

// Case E: never throws and returns files even on degenerate input.
{
  let threw = false;
  let result: any;
  try {
    result = sanitizeMobile([{ path: "style.css", content: "" }]);
  } catch {
    threw = true;
  }
  assert(!threw, "E: never throws on empty css");
  assert(Array.isArray(result) && result.length === 1, "E: returns files array");
}

console.log(`\nsanitizeMobile: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
