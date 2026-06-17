/**
 * Unit tests for trimContinuation — run with:
 *   scripts/node_modules/.bin/tsx --test artifacts/api-server/src/lib/__tests__/trimContinuation.test.ts
 */
import { trimContinuation } from "../openai.js";

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

run("strips leading json fence", () => {
  assert(trimContinuation('```json\n{"a":1}') === '{"a":1}', "```json + newline removed");
  assert(trimContinuation('```json {"a":1}') === '{"a":1}', "```json + space removed");
});

run("strips leading bare fence", () => {
  assert(trimContinuation('```\n{"a":1}') === '{"a":1}', "bare ``` + newline removed");
  assert(trimContinuation('```{"a":1}') === '{"a":1}', "bare ``` no space removed");
});

run("strips leading whitespace before fence", () => {
  assert(trimContinuation('   ```json\n{"a":1}') === '{"a":1}', "leading spaces + fence removed");
  assert(trimContinuation('\n\n```\n{"a":1}') === '{"a":1}', "leading newlines + fence removed");
});

run("leaves clean continuation untouched", () => {
  assert(trimContinuation('"content": "x"}') === '"content": "x"}', "no fence -> unchanged");
  assert(trimContinuation('}]}') === '}]}', "plain JSON tail unchanged");
});

run("does not strip fences in the middle", () => {
  const mid = 'text ```json still here';
  assert(trimContinuation(mid) === mid, "non-leading fence left intact");
});

run("handles empty and whitespace-only input", () => {
  assert(trimContinuation("") === "", "empty string -> empty");
  assert(trimContinuation("   ") === "   ", "whitespace-only without fence -> unchanged");
});

run("case-insensitive JSON label", () => {
  assert(trimContinuation('```JSON\n{"a":1}') === '{"a":1}', "uppercase JSON label removed");
});

run("idempotent", () => {
  const once = trimContinuation('```json\n{"a":1}');
  assert(trimContinuation(once) === once, "second pass changes nothing");
});

// ── Summary ──────────────────────────────────────────────────────────────
console.log(`\n────────────────────────────────────────`);
console.log(`trimContinuation: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
