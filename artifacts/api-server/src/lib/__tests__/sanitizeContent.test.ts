/**
 * Unit tests for sanitizeContent — run with:
 *   scripts/node_modules/.bin/tsx --test artifacts/api-server/src/lib/__tests__/sanitizeContent.test.ts
 */
import { sanitizeContent } from "../openai.js";

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

function run(label: string, fn: () => void) {
  console.log(`\n${label}`);
  fn();
}

function findFile(out: Array<{ path: string; content: string }>, path: string): string | undefined {
  return out.find((f) => f.path === path)?.content;
}

const RICH_HTML = `<!DOCTYPE html><html><head><title>T</title></head><body>
<section id="hero"><h1>Real Hero</h1></section>
<section id="features"><h2>Features</h2></section>
<section id="cta"><h2>Get started</h2></section>
</body></html>`;

run("replaces Lorem ipsum filler in html", () => {
  const out = sanitizeContent([
    { path: "index.html", content: RICH_HTML.replace("Real Hero", "Lorem ipsum dolor sit amet") },
  ]);
  const html = findFile(out, "index.html") || "";
  assert(!/lorem\s+ipsum/i.test(html), "no 'Lorem ipsum' remains");
});

run("replaces TODO / PLACEHOLDER / bracket stubs", () => {
  const out = sanitizeContent([
    { path: "index.html", content: RICH_HTML.replace("Features", "TODO") .replace("Get started", "[placeholder]") },
  ]);
  const html = findFile(out, "index.html") || "";
  assert(!/\bTODO\b/.test(html), "no 'TODO' token remains");
  assert(!/\[placeholder\]/i.test(html), "no '[placeholder]' remains");
});

run("leaves clean real content untouched (idempotent)", () => {
  const input = [{ path: "index.html", content: RICH_HTML }];
  const out = sanitizeContent(input);
  assert(out[0] === input[0], "clean file returns same reference (no needless copy)");
  const out2 = sanitizeContent(out);
  assert(findFile(out2, "index.html") === RICH_HTML, "running twice yields identical output");
});

run("does not touch non-html files", () => {
  const css = "body { content: 'Lorem ipsum'; }";
  const out = sanitizeContent([{ path: "style.css", content: css }]);
  assert(findFile(out, "style.css") === css, "style.css with 'Lorem ipsum' unchanged");
});

run("never throws on weird input", () => {
  let threw = false;
  try {
    sanitizeContent([{ path: "index.html", content: "" }]);
    sanitizeContent([]);
  } catch {
    threw = true;
  }
  assert(!threw, "no exception thrown on empty content / empty array");
});

// ── Summary ──────────────────────────────────────────────────────────────
console.log(`\n────────────────────────────────────────`);
console.log(`sanitizeContent: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
