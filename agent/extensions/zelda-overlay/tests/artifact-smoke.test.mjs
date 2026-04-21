import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("root contains the expected maintainability artifacts", () => {
  const required = [
    "README.md",
    "package.json",
    "setup.sh",
    "index.ts",
    "zelda-engine.ts",
    "zelda-component.ts",
    "zelda-keys.ts",
    "rom-loader.ts",
    "gl-shim.ts",
    "tests/artifact-smoke.test.mjs",
    "core/README.md",
  ];

  for (const relativePath of required) {
    assert.ok(exists(relativePath), `${relativePath} should exist`);
  }
});

test("package metadata exposes validation and core refresh scripts", () => {
  const pkg = JSON.parse(read("package.json"));

  assert.equal(pkg.name, "zelda-overlay");
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, "module");
  assert.equal(pkg.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(pkg.scripts["setup:core"], "bash ./setup.sh");
  assert.equal(pkg.scripts["refresh:core"], "bash ./setup.sh --force");
});

test("vendored core is explicit and internally consistent", () => {
  assert.ok(exists("core/snes9x_libretro.js"), "vendored JS core should exist");
  assert.ok(exists("core/snes9x_libretro.wasm"), "vendored WASM core should exist");

  const wasmStats = fs.statSync(path.join(root, "core", "snes9x_libretro.wasm"));
  assert.ok(wasmStats.size > 1_000_000, "WASM core should be non-trivial in size");

  const coreReadme = read("core/README.md");
  assert.match(coreReadme, /vendored/i);
  assert.match(coreReadme, /setup\.sh/i);
});

test("README declares project role and validation path", () => {
  const readme = read("README.md");

  assert.match(readme, /Pi extension/i);
  assert.match(readme, /Artifact role/i);
  assert.match(readme, /npm run smoke/i);
  assert.match(readme, /vendored runtime/i);
});
