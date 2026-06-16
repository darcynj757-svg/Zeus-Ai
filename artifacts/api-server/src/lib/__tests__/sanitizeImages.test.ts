/**
 * Unit tests for sanitizeImages — run with:
 *   pnpm tsx artifacts/api-server/src/lib/__tests__/sanitizeImages.test.ts
 */
import { sanitizeImages } from "../openai.js";

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

// ── helpers ──────────────────────────────────────────────────────────────────

function html(body: string) {
  return [{ path: "index.html", content: body }];
}

function getContent(files: ReturnType<typeof sanitizeImages>) {
  return files[0]!.content;
}

// ── 1. source.unsplash.com → images.unsplash.com ─────────────────────────────
run("1. Replaces source.unsplash.com with images.unsplash.com", () => {
  const input = html(`<img src="https://source.unsplash.com/random/800x600" alt="Photo">`);
  const out = getContent(sanitizeImages(input));
  assert(!out.includes("source.unsplash.com"), "no source.unsplash.com in output");
  assert(out.includes("images.unsplash.com"), "replaced with images.unsplash.com");
});

// ── 2. onerror fallback added to images.unsplash.com ─────────────────────────
run("2. Adds loremflickr onerror to images.unsplash.com img without one", () => {
  const input = html(
    `<img src="https://images.unsplash.com/photo-abc?w=1200" alt="Barbershop interior" loading="lazy">`
  );
  const out = getContent(sanitizeImages(input));
  assert(/onerror/.test(out), "onerror attribute added");
  assert(/loremflickr\.com/.test(out), "loremflickr used as fallback");
  assert(/barbershop/.test(out), "keyword extracted from alt text");
  assert(!/Math\.random/.test(out), "no Math.random in fallback");
});

// ── 3. onerror NOT added to non-Unsplash images ──────────────────────────────
run("3. Does NOT add onerror to loremflickr or picsum images", () => {
  const input = html(
    `<img src="https://loremflickr.com/800/600/coffee" alt="Coffee" loading="lazy">` +
    `<img src="https://picsum.photos/seed/abc/800/600" alt="Photo" loading="lazy">`
  );
  const out = getContent(sanitizeImages(input));
  assert((out.match(/onerror/g) ?? []).length === 0, "no onerror added to non-Unsplash images");
});

// ── 4. loading="lazy" added when missing ─────────────────────────────────────
run('4. Adds loading="lazy" when missing', () => {
  const input = html(
    `<img src="https://images.unsplash.com/photo-abc?w=800" alt="Team photo" onerror="this.onerror=null;this.src='https://loremflickr.com/1200/800/team'">`
  );
  const out = getContent(sanitizeImages(input));
  assert(/loading="lazy"/.test(out), 'loading="lazy" added');
});

// ── 5. Does NOT override loading="eager" ─────────────────────────────────────
run('5. Does NOT override loading="eager" on hero images', () => {
  const input = html(
    `<img src="https://images.unsplash.com/photo-abc?w=1200" alt="Hero" loading="eager" onerror="this.onerror=null;this.src='https://loremflickr.com/1200/800/hero'">`
  );
  const out = getContent(sanitizeImages(input));
  assert(/loading="eager"/.test(out), 'loading="eager" preserved');
  assert(!/loading="lazy"/.test(out), 'loading="lazy" NOT added when eager present');
});

// ── 6. alt added when missing ────────────────────────────────────────────────
run("6. Adds alt='Photo' when alt is missing", () => {
  const input = html(
    `<img src="https://images.unsplash.com/photo-abc?w=800" loading="lazy">`
  );
  const out = getContent(sanitizeImages(input));
  assert(/alt=/.test(out), "alt attribute added");
});

// ── 7. alt replaced when empty ───────────────────────────────────────────────
run('7. Replaces empty alt="" with alt="Photo"', () => {
  const input = html(
    `<img src="https://images.unsplash.com/photo-abc?w=800" alt="" loading="lazy">`
  );
  const out = getContent(sanitizeImages(input));
  assert(/alt="Photo"/.test(out), 'empty alt replaced with alt="Photo"');
});

// ── 8. Idempotency ───────────────────────────────────────────────────────────
run("8. Idempotent: second pass produces no further changes", () => {
  const input = html(
    `<img src="https://images.unsplash.com/photo-abc?w=1200" alt="Barber shop" loading="lazy">`
  );
  const once = sanitizeImages(input);
  const twice = sanitizeImages(once);
  assert(once[0]!.content === twice[0]!.content, "content identical after second pass");
});

// ── 9. Non-HTML files untouched ───────────────────────────────────────────────
run("9. Non-HTML files (style.css, script.js) are left untouched", () => {
  const cssFile = { path: "style.css", content: `img { max-width: 100%; }` };
  const jsFile = { path: "script.js", content: `const src = "https://source.unsplash.com/test";` };
  const out = sanitizeImages([cssFile, jsFile]);
  assert(out[0]!.content === cssFile.content, "style.css unchanged");
  assert(out[1]!.content === jsFile.content, "script.js unchanged");
});

// ── 10. Keyword from src loremflickr URL (idempotency of keyword) ─────────────
run("10. Extracts keyword from existing loremflickr onerror src when alt is short", () => {
  const input = html(
    `<img src="https://images.unsplash.com/photo-abc?w=800" alt="A" loading="lazy">`
  );
  const out = getContent(sanitizeImages(input));
  assert(/loremflickr\.com\/1200\/800\/photo/.test(out), "falls back to 'photo' keyword when alt too short");
});

// ── 11. source.unsplash.com also gets onerror (after URL fix) ────────────────
run("11. source.unsplash.com img gets URL fixed AND onerror added in one pass", () => {
  const input = html(
    `<img src="https://source.unsplash.com/photo-abc?w=800" alt="Fitness gym">`
  );
  const out = getContent(sanitizeImages(input));
  assert(!out.includes("source.unsplash.com"), "source.unsplash.com replaced");
  assert(/onerror/.test(out), "onerror added");
  assert(/fitness/.test(out), "keyword 'fitness' from alt text");
  assert(/loading="lazy"/.test(out), "loading=lazy added");
});

// ── 12. Multiple img tags in one file ────────────────────────────────────────
run("12. Handles multiple img tags in a single file", () => {
  const input = html(
    `<img src="https://images.unsplash.com/photo-1?w=800" alt="Coffee beans">` +
    `<img src="https://images.unsplash.com/photo-2?w=800" alt="Cafe interior">`
  );
  const out = getContent(sanitizeImages(input));
  // Re-parse into individual img tags to avoid double-counting "this.onerror=null" inside values
  const imgTags = out.match(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*\/?>/gi) ?? [];
  const withOnerror = imgTags.filter((t: string) => /\bonerror\s*=/i.test(t)).length;
  assert(withOnerror === 2, "onerror attr added to both images");
  assert(/coffee/.test(out), "keyword from first img alt");
  assert(/cafe/.test(out), "keyword from second img alt");
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed ✓");
}
