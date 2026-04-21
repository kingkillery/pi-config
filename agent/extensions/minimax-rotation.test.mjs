import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "minimax-rotation.ts"), "utf8");

test("minimax-rotation.ts exists and is non-empty", () => {
  assert.ok(src.length > 100, "source should be non-trivial");
});

test("exports a default function", () => {
  assert.match(src, /export default function\s*\(/, "missing default export");
});

test("uses ctx.ui.notify instead of pi.notify", () => {
  assert.doesNotMatch(src, /pi\.notify\s*\(/, "pi.notify() is not an ExtensionAPI method — use ctx.ui.notify()");
});

test("before_completion handler accepts ctx parameter", () => {
  // Match: pi.on("before_completion", async (event[: Type], ctx)
  assert.match(src, /on\s*\(\s*["']before_completion["']\s*,\s*async\s*\([^)]*,\s*ctx\s*\)/, "before_completion handler should accept (event, ctx)");
});

test("registerTool includes required label field", () => {
  assert.match(src, /label\s*:\s*["']/, "registerTool definition must include a label field");
});

test("execute signature matches ExtensionAPI (toolCallId, params, signal, onUpdate, ctx)", () => {
  assert.match(src, /async execute\s*\(\s*\w+\s*,\s*\w+/, "execute must accept (toolCallId, params, ...) per ExtensionAPI");
});
