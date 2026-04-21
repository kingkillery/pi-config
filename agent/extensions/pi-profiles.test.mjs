import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "pi-profiles.ts"), "utf8");

test("pi-profiles.ts exists and is non-empty", () => {
  assert.ok(src.length > 100, "source should be non-trivial");
});

test("exports a default function", () => {
  assert.match(src, /export default function\s*\(/, "missing default export");
});

test("uses ctx.ui.notify instead of pi.notify", () => {
  assert.doesNotMatch(src, /pi\.notify\s*\(/, "pi.notify() is not an ExtensionAPI method — use ctx.ui.notify()");
});

test("session_start handler accepts ctx parameter", () => {
  assert.match(src, /on\s*\(\s*["']session_start["']\s*,\s*async\s*\(\s*\w+\s*,\s*\w+\s*\)/, "session_start handler should accept (event, ctx)");
});

test("registerTool includes required label field", () => {
  assert.match(src, /label\s*:\s*["']/, "registerTool definition must include a label field");
});

test("execute signature matches ExtensionAPI (toolCallId, params, signal, onUpdate, ctx)", () => {
  assert.match(src, /async execute\s*\(\s*\w+\s*,\s*\w+/, "execute must accept (toolCallId, params, ...) per ExtensionAPI");
});
