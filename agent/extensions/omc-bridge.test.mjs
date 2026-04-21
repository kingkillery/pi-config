import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "omc-bridge.ts"), "utf8");

test("omc-bridge.ts exists and is non-empty", () => {
  assert.ok(src.length > 100, "source should be non-trivial");
});

test("exports a default function", () => {
  assert.match(src, /export default function\s*\(/, "missing default export");
});

test("uses pi.sendUserMessage instead of ctx.session.prompt", () => {
  assert.doesNotMatch(src, /ctx\.session\.prompt\s*\(/, "ctx.session.prompt() does not exist on ExtensionCommandContext — use pi.sendUserMessage()");
  assert.match(src, /pi\.sendUserMessage\s*\(/, "must use pi.sendUserMessage() to trigger agent turns");
});

test("registerCommand uses options-object form (not bare function)", () => {
  assert.match(src, /registerCommand\s*\(\s*\w+\s*,\s*\{/, "registerCommand must receive an options object {description, handler}, not a bare function");
});

test("uses ctx.ui.notify instead of pi.notify", () => {
  assert.doesNotMatch(src, /pi\.notify\s*\(/, "pi.notify() is not an ExtensionAPI method — use ctx.ui.notify()");
});

test("handler type annotations present (ExtensionCommandContext)", () => {
  assert.match(src, /ExtensionCommandContext/, "ExtensionCommandContext type must be imported and used in handler signatures");
});
