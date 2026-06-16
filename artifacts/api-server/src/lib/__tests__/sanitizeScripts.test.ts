/**
 * Unit tests for sanitizeScripts — run with:
 *   scripts/node_modules/.bin/tsx --test artifacts/api-server/src/lib/__tests__/sanitizeScripts.test.ts
 */
import { sanitizeScripts } from "../openai.js";

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

function findFile(out: Array<{ path: string; content: string }>, path: string): string | undefined {
  return out.find(f => f.path === path)?.content;
}

const BASE_HTML_NO_SCRIPT = `<!DOCTYPE html>
<html><head><title>Test</title></head>
<body>
<header>
  <button class="hamburger">☰</button>
  <nav class="nav-links"><a href="#about">About</a></nav>
</header>
<main><section id="about"><h2>About</h2></section></main>
</body></html>`;

const BASE_HTML_WITH_SCRIPT = `<!DOCTYPE html>
<html><head><title>Test</title></head>
<body>
<main></main>
<script src="script.js" defer></script>
</body></html>`;

const WORKING_SCRIPT = `document.addEventListener('DOMContentLoaded', function () {
  var hamburger = document.querySelector('.hamburger');
  var nav = document.querySelector('.nav-links');
  if (hamburger && nav) {
    hamburger.addEventListener('click', function () {
      nav.classList.toggle('nav-open');
    });
  }
  AOS.init({ duration: 700, once: true });
  lucide.createIcons();
});`;

const EMPTY_SCRIPT = ``;
const WHITESPACE_SCRIPT = `   \n  \t  `;
const WEAK_SCRIPT = `// placeholder\nconsole.log('hello');`;

// ── Tests ────────────────────────────────────────────────────────────────────

run("(a) no script.js → fallback injected + <script> tag added to index.html", () => {
  const input = [
    { path: "index.html", content: BASE_HTML_NO_SCRIPT },
    { path: "style.css",  content: "body { margin: 0; }" },
  ];
  const out = sanitizeScripts(input);

  const scriptContent = findFile(out, "script.js");
  const htmlContent   = findFile(out, "index.html") ?? "";

  assert(scriptContent !== undefined, "script.js was added");
  assert(!!scriptContent && scriptContent.trim().length > 0, "script.js is non-empty");
  assert(!!scriptContent && scriptContent.includes("hamburger"), "fallback contains hamburger toggle");
  assert(!!scriptContent && scriptContent.includes("DOMContentLoaded"), "fallback contains DOMContentLoaded");
  assert(!!scriptContent && scriptContent.includes("scrollIntoView"), "fallback contains smooth scroll");
  assert(!!scriptContent && scriptContent.includes("AOS"), "fallback references AOS");
  assert(/<script\s[^>]*src=["']script\.js["'][^>]*>/i.test(htmlContent), "<script src=\"script.js\"> tag added to index.html");
  assert(htmlContent.lastIndexOf("<script") < htmlContent.lastIndexOf("</body>"), "<script> tag is before </body>");
});

run("(b) empty script.js → fallback injected", () => {
  const input = [
    { path: "index.html", content: BASE_HTML_WITH_SCRIPT },
    { path: "script.js",  content: EMPTY_SCRIPT },
  ];
  const out = sanitizeScripts(input);

  const scriptContent = findFile(out, "script.js") ?? "";
  assert(scriptContent.includes("DOMContentLoaded"), "empty script replaced with fallback (DOMContentLoaded present)");
  assert(scriptContent.includes("hamburger"), "fallback includes hamburger toggle");
});

run("(b2) whitespace-only script.js → fallback injected", () => {
  const input = [
    { path: "index.html", content: BASE_HTML_WITH_SCRIPT },
    { path: "script.js",  content: WHITESPACE_SCRIPT },
  ];
  const out = sanitizeScripts(input);

  const scriptContent = findFile(out, "script.js") ?? "";
  assert(scriptContent.includes("DOMContentLoaded"), "whitespace-only script replaced with fallback");
});

run("(b3) script.js with no hamburger and no DOMContentLoaded → fallback injected", () => {
  const input = [
    { path: "index.html", content: BASE_HTML_WITH_SCRIPT },
    { path: "script.js",  content: WEAK_SCRIPT },
  ];
  const out = sanitizeScripts(input);

  const scriptContent = findFile(out, "script.js") ?? "";
  assert(scriptContent.includes("DOMContentLoaded"), "weak script replaced with fallback");
  assert(scriptContent.includes("hamburger"), "fallback has hamburger toggle");
});

run("(c) working script with hamburger toggle → NOT changed (idempotent)", () => {
  const input = [
    { path: "index.html", content: BASE_HTML_WITH_SCRIPT },
    { path: "script.js",  content: WORKING_SCRIPT },
  ];
  const out = sanitizeScripts(input);

  const scriptContent = findFile(out, "script.js");
  assert(scriptContent === WORKING_SCRIPT, "working script content unchanged");
  assert(out.length === input.length, "no extra files added");
});

run("(c2) working script with DOMContentLoaded (no hamburger keyword) → NOT changed", () => {
  const domScript = `document.addEventListener('DOMContentLoaded', function () {
  // Menu toggle
  var btn = document.querySelector('.menu-btn');
  AOS.init({ once: true });
});`;
  const input = [
    { path: "index.html", content: BASE_HTML_WITH_SCRIPT },
    { path: "script.js",  content: domScript },
  ];
  const out = sanitizeScripts(input);
  assert(findFile(out, "script.js") === domScript, "DOMContentLoaded-containing script preserved unchanged");
});

run("(d) running sanitizeScripts twice does NOT duplicate <script> tag", () => {
  const input = [
    { path: "index.html", content: BASE_HTML_NO_SCRIPT },
    { path: "style.css",  content: "body{}" },
  ];
  const once  = sanitizeScripts(input);
  const twice = sanitizeScripts(once);

  const htmlOnce  = findFile(once,  "index.html") ?? "";
  const htmlTwice = findFile(twice, "index.html") ?? "";

  const countScriptTags = (html: string) =>
    (html.match(/<script\s[^>]*src=["']script\.js["'][^>]*>/gi) ?? []).length;

  assert(countScriptTags(htmlOnce)  === 1, "one <script> tag after first run");
  assert(countScriptTags(htmlTwice) === 1, "still one <script> tag after second run (no duplication)");
  assert(htmlOnce === htmlTwice, "index.html identical after first and second run");
});

run("(d2) running sanitizeScripts twice on missing script.js does NOT add script.js twice", () => {
  const input = [
    { path: "index.html", content: BASE_HTML_NO_SCRIPT },
  ];
  const once  = sanitizeScripts(input);
  const twice = sanitizeScripts(once);

  const scriptFiles = twice.filter(f => f.path === "script.js");
  assert(scriptFiles.length === 1, "exactly one script.js after two runs");
});

run("index.html absent → script.js still injected, no crash", () => {
  const input = [
    { path: "style.css", content: "body{}" },
  ];
  const out = sanitizeScripts(input);
  const scriptContent = findFile(out, "script.js");
  assert(scriptContent !== undefined, "script.js added even when index.html absent");
  assert(!!scriptContent && scriptContent.includes("hamburger"), "fallback content is correct");
});

run("other files not touched", () => {
  const input = [
    { path: "index.html", content: BASE_HTML_NO_SCRIPT },
    { path: "style.css",  content: "body { color: red; }" },
    { path: "about.html", content: "<html><body>About</body></html>" },
  ];
  const out = sanitizeScripts(input);
  const css = findFile(out, "style.css");
  const about = findFile(out, "about.html");
  assert(css === "body { color: red; }", "style.css unchanged");
  assert(about === "<html><body>About</body></html>", "about.html unchanged");
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────────────────`);
console.log(`sanitizeScripts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
