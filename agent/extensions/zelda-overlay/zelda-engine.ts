/**
 * zelda-engine.ts — SNES emulator engine for Zelda: A Link to the Past.
 *
 * Provides WasmZeldaEngine (real emulation via EmulatorJS snes9x core)
 * with MockZeldaEngine as fallback when the WASM core is not installed.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createGLShim, type FrameCapture } from "./gl-shim.js";

// SNES native resolution
export const SNES_WIDTH = 256;
export const SNES_HEIGHT = 224;

export interface ZeldaEngine {
  init(romData: Uint8Array): Promise<void>;
  tick(buttons: number): void;
  getFrameRGBA(): Uint8Array;
  readonly ready: boolean;
  readonly statusMessage: string;
}

// ---------------------------------------------------------------------------
// WASM engine — real SNES emulation via EmulatorJS snes9x core
// ---------------------------------------------------------------------------

class WasmZeldaEngine implements ZeldaEngine {
  private _module: any = null;
  private _fb: Uint8Array = new Uint8Array(SNES_WIDTH * SNES_HEIGHT * 4);
  private _ready = false;
  private _statusMessage = "Initializing WASM core...";
  private _glShim: ReturnType<typeof createGLShim> | null = null;
  private _currentButtons = 0;
  private _coreDir: string;

  constructor(coreDir: string) {
    this._coreDir = coreDir;
  }

  get ready() { return this._ready; }
  get statusMessage() { return this._statusMessage; }

  async init(romData: Uint8Array): Promise<void> {
    const jsPath = join(this._coreDir, "snes9x_libretro.js");
    const wasmPath = join(this._coreDir, "snes9x_libretro.wasm");

    this._statusMessage = "Loading WASM core...";

    // Read the WASM binary
    const wasmBinary = readFileSync(wasmPath);

    // Create GL shim for framebuffer capture
    this._glShim = createGLShim(SNES_WIDTH, SNES_HEIGHT);

    // Write ROM to a temp location the module can access via its FS
    const romFileName = "game.sfc";

    // Load the Emscripten module
    // The JS file is CJS: module.exports = EJS_Runtime (async factory)
    const jsCode = readFileSync(jsPath, "utf-8");

    // Provide minimal browser shims for the Emscripten module
    const shimGlobals = {
      document: {
        createElement: (tag: string) => {
          if (tag === "canvas") return this._glShim!.canvas;
          return { style: {}, appendChild: () => {}, addEventListener: () => {} };
        },
        createElementNS: () => ({ style: {}, appendChild: () => {}, addEventListener: () => {} }),
        getElementById: () => this._glShim!.canvas,
        body: { appendChild: () => {} },
        addEventListener: () => {},
        removeEventListener: () => {},
        hidden: false,
        visibilityState: "visible",
      },
      window: {
        addEventListener: () => {},
        removeEventListener: () => {},
        innerWidth: SNES_WIDTH,
        innerHeight: SNES_HEIGHT,
        devicePixelRatio: 1,
        performance: globalThis.performance || { now: () => Date.now() },
        requestAnimationFrame: (cb: Function) => setTimeout(cb, 16),
        cancelAnimationFrame: (id: number) => clearTimeout(id),
        location: { href: "file:///zelda-overlay/", protocol: "file:" },
        navigator: { userAgent: "Node.js", language: "en" },
        screen: { width: SNES_WIDTH, height: SNES_HEIGHT },
      },
      navigator: { userAgent: "Node.js", language: "en", languages: ["en"] },
      screen: { width: SNES_WIDTH, height: SNES_HEIGHT },
      AudioContext: class { close() {} },
      webkitAudioContext: class { close() {} },
      performance: globalThis.performance || { now: () => Date.now() },
      requestAnimationFrame: (cb: Function) => setTimeout(cb, 16),
      cancelAnimationFrame: (id: number) => clearTimeout(id),
      alert: () => {},
      confirm: () => true,
      prompt: () => "",
      ResizeObserver: class ResizeObserver {
        private _cb: (entries: any[], observer: any) => void;
        constructor(callback: (entries: any[], observer: any) => void) { this._cb = callback; }
        observe(target: any) {
          try {
            this._cb(
              [{
                target,
                devicePixelContentBoxSize: [{
                  inlineSize: target.width || SNES_WIDTH,
                  blockSize: target.height || SNES_HEIGHT,
                }],
                contentBoxSize: [{
                  inlineSize: target.clientWidth || target.width || SNES_WIDTH,
                  blockSize: target.clientHeight || target.height || SNES_HEIGHT,
                }],
                contentRect: {
                  width: target.clientWidth || target.width || SNES_WIDTH,
                  height: target.clientHeight || target.height || SNES_HEIGHT,
                  x: 0, y: 0, top: 0, left: 0,
                  bottom: target.height || SNES_HEIGHT,
                  right: target.width || SNES_WIDTH,
                },
              }],
              this,
            );
          } catch {}
        }
        unobserve() {}
        disconnect() {}
      },
      // Additional browser API stubs required by the snes9x WASM core
      // (ENVIRONMENT_IS_WEB is true because we shim window, so browser
      // code paths are active and reference these globals directly)
      Image: class Image {
        onload: (() => void) | null = null;
        src = "";
        width = 0;
        height = 0;
      },
      WebSocket: class WebSocket {
        binaryType: string = "arraybuffer";
        constructor() { throw new Error("WebSocket not available in Node.js"); }
      },
      XMLHttpRequest: class XMLHttpRequest {
        open() {}
        send() {}
        setRequestHeader() {}
        responseType: string = "";
        response: any = null;
        status = 0;
        statusText = "";
        onreadystatechange: (() => void) | null = null;
        onerror: (() => void) | null = null;
        onload: (() => void) | null = null;
      },
      fetch: () => Promise.reject(new Error("fetch not available in Node.js")),
      URL: { createObjectURL: () => "blob:stub", revokeObjectURL: () => {} },
      Blob: class Blob { constructor() {} },
    };

    // Build module config
    const moduleConfig: any = {
      canvas: this._glShim.canvas,
      wasmBinary: new Uint8Array(wasmBinary),
      noInitialRun: true,
      print: () => {},
      printErr: () => {},
      locateFile: (path: string) => {
        if (path.endsWith(".wasm")) return wasmPath;
        return join(this._coreDir, path);
      },
      preRun: [(mod: any) => {
        // Create ROM directory and write the ROM
        if (mod.FS_createPath) {
          mod.FS_createPath("/", "rom", true, true);
          mod.FS_createDataFile(
            "/rom", romFileName,
            Array.from(romData),
            true, false,
          );
        } else if (mod.FS) {
          try { mod.FS.mkdir("/rom"); } catch {}
          mod.FS.writeFile("/rom/" + romFileName, romData);
        }
      }],
    };

    this._statusMessage = "Initializing emulator...";

    // Install browser API stubs on globalThis — the WASM core uses bare global
    // references (e.g. `new ResizeObserver(...)`) that don't resolve through the
    // injected var shims in all execution paths.
    for (const key of [
      "ResizeObserver", "Image", "WebSocket", "XMLHttpRequest",
      "fetch", "URL", "Blob",
    ]) {
      if (!(globalThis as any)[key]) {
        (globalThis as any)[key] = (shimGlobals as any)[key];
      }
    }

    try {
      // Execute the module factory
      // Wrap in a Function to inject shim globals
      const wrappedCode = `
        var module = { exports: {} };
        var exports = module.exports;
        var define = undefined;
        ${Object.entries(shimGlobals).map(([k, _]) => `var ${k} = __shims.${k};`).join("\n")}
        ${jsCode}
        return module.exports;
      `;

      const factory = new Function("__shims", "require", "__filename", "__dirname", wrappedCode);
      const EJS_Runtime = factory(shimGlobals, require, jsPath, this._coreDir);
      const ejsFactory = typeof EJS_Runtime === "function" ? EJS_Runtime : EJS_Runtime.default;

      this._module = await ejsFactory(moduleConfig);

      // Wait for WASM to be ready
      if (this._module.ready) {
        await this._module.ready;
      }

      // Call main with ROM path arguments
      if (this._module._main) {
        this._module._main(0, 0);
      }

      // Configure the emulator
      if (this._module._ejs_set_variable) {
        // Set ROM path
        const romPathStr = "/rom/" + romFileName;
        const strPtr = this._allocString(romPathStr);
        if (strPtr) {
          const keyPtr = this._allocString("fileName");
          if (keyPtr) {
            this._module._ejs_set_variable(keyPtr, strPtr);
            this._module._free(keyPtr);
          }
          this._module._free(strPtr);
        }
      }

      this._ready = true;
      this._statusMessage = "SNES emulator running (snes9x WASM)";

    } catch (err: any) {
      this._statusMessage = `WASM init failed: ${err.message}`;
      throw err;
    }
  }

  private _allocString(str: string): number {
    if (!this._module._malloc) return 0;
    const ptr = this._module._malloc(str.length + 1);
    for (let i = 0; i < str.length; i++) {
      this._module.HEAPU8[ptr + i] = str.charCodeAt(i);
    }
    this._module.HEAPU8[ptr + str.length] = 0;
    return ptr;
  }

  tick(buttons: number): void {
    if (!this._module || !this._ready) return;

    this._currentButtons = buttons;

    // Send input via _simulate_input if available
    if (this._module._simulate_input) {
      // EmulatorJS input: _simulate_input(port, device, index, id, value)
      // SNES joypad IDs match libretro RETRO_DEVICE_ID_JOYPAD_*
      const JOYPAD_IDS = [
        [0x0001, 0],  // B
        [0x0002, 1],  // Y
        [0x0004, 2],  // SELECT
        [0x0008, 3],  // START
        [0x0010, 4],  // UP
        [0x0020, 5],  // DOWN
        [0x0040, 6],  // LEFT
        [0x0080, 7],  // RIGHT
        [0x0100, 8],  // A
        [0x0200, 9],  // X
        [0x0400, 10], // L
        [0x0800, 11], // R
      ];
      for (const [mask, id] of JOYPAD_IDS) {
        const pressed = (buttons & mask) ? 1 : 0;
        this._module._simulate_input(0, 1, 0, id, pressed);
      }
    }

    // Advance one frame — _toggleMainLoop runs the emulator loop
    // We need to step one frame if possible
    try {
      if (this._module._main_loop) {
        this._module._main_loop();
      }
    } catch {
      // Frame step may throw on first few frames
    }

    // Capture the framebuffer from the GL shim
    if (this._glShim) {
      const frame = this._glShim.getFrame();
      this._copyFrame(frame);
    }
  }

  private _copyFrame(frame: FrameCapture): void {
    if (frame.width === SNES_WIDTH && frame.height === SNES_HEIGHT) {
      this._fb.set(frame.rgba.subarray(0, SNES_WIDTH * SNES_HEIGHT * 4));
    } else if (frame.width > 0 && frame.height > 0) {
      // Scale to SNES resolution
      const sw = frame.width, sh = frame.height;
      for (let y = 0; y < SNES_HEIGHT; y++) {
        const sy = ((y / SNES_HEIGHT) * sh) | 0;
        for (let x = 0; x < SNES_WIDTH; x++) {
          const sx = ((x / SNES_WIDTH) * sw) | 0;
          const si = (sy * sw + sx) * 4;
          const di = (y * SNES_WIDTH + x) * 4;
          this._fb[di] = frame.rgba[si];
          this._fb[di + 1] = frame.rgba[si + 1];
          this._fb[di + 2] = frame.rgba[si + 2];
          this._fb[di + 3] = 255;
        }
      }
    }
  }

  getFrameRGBA(): Uint8Array {
    return this._fb;
  }
}

// ---------------------------------------------------------------------------
// Mock engine — animated title screen fallback
// ---------------------------------------------------------------------------

class MockZeldaEngine implements ZeldaEngine {
  private _ready = false;
  private _statusMessage = "Loading...";
  private _frame = 0;
  private _fb: Uint8Array = new Uint8Array(SNES_WIDTH * SNES_HEIGHT * 4);
  private _skyTemplate: Uint8Array | null = null;
  private _romName = "";

  get ready() { return this._ready; }
  get statusMessage() { return this._statusMessage; }

  async init(romData: Uint8Array): Promise<void> {
    const loRomChecksum = romData[0x7FDE] + (romData[0x7FDF] << 8);
    const loRomChecksumComplement = romData[0x7FDC] + (romData[0x7FDD] << 8);
    const isLoRom = (loRomChecksum ^ loRomChecksumComplement) === 0xFFFF;
    const titleBytes = isLoRom
      ? romData.subarray(0x7FC0, 0x7FD5)
      : romData.subarray(0xFFC0, 0xFFD5);

    this._romName = Array.from(titleBytes)
      .map(b => (b >= 0x20 && b < 0x7F) ? String.fromCharCode(b) : "")
      .join("").trim() || "ZELDA NO DENSETSU";

    // Pre-compute static sky gradient
    const W = SNES_WIDTH, H = SNES_HEIGHT;
    this._skyTemplate = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      const pct = y / H;
      const r = (24 + 8 * pct) | 0;
      const g = (24 + 56 * pct) | 0;
      const b = (80 + 60 * pct) | 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        this._skyTemplate[i] = r;
        this._skyTemplate[i + 1] = g;
        this._skyTemplate[i + 2] = b;
        this._skyTemplate[i + 3] = 255;
      }
    }

    this._ready = true;
    this._statusMessage = `ROM: ${this._romName} (${(romData.length / 1024) | 0} KB) — mock mode`;
  }

  tick(buttons: number): void {
    this._frame++;
    this._renderMockFrame(buttons);
  }

  getFrameRGBA(): Uint8Array { return this._fb; }

  private _renderMockFrame(buttons: number): void {
    const t = this._frame;
    const fb = this._fb;
    const W = SNES_WIDTH, H = SNES_HEIGHT;

    // Copy static background
    if (this._skyTemplate) fb.set(this._skyTemplate);

    // Animated stars
    const starSeeds = [7, 13, 17, 31, 41, 53, 67, 79, 89, 97, 103, 107, 109, 113, 127];
    for (const seed of starSeeds) {
      if (Math.sin(t * 0.05 + seed) > 0.3) {
        const i = (((seed * 7) % (H / 2)) * W + ((seed * 11) % W)) * 4;
        fb[i] = 255; fb[i + 1] = 255; fb[i + 2] = 200;
      }
    }

    // Triforce
    const tfX = W / 2, tfY = H / 2 - 10, tfSize = 20;
    const glow = Math.sin(t * 0.08) * 0.3 + 0.7;
    const tfR = (220 * glow) | 0, tfG = (180 * glow) | 0;
    const drawTri = (cx: number, cy: number, sz: number) => {
      for (let row = 0; row < sz; row++) {
        const w = row * 2 + 1, sx = cx - (w >> 1), py = (cy - sz + row) | 0;
        if (py < 0 || py >= H) continue;
        for (let col = 0; col < w; col++) {
          const px = (sx + col) | 0;
          if (px >= 0 && px < W) {
            const i = (py * W + px) * 4;
            fb[i] = tfR; fb[i + 1] = tfG; fb[i + 2] = 0;
          }
        }
      }
    };
    drawTri(tfX, tfY, tfSize);
    drawTri(tfX - tfSize, tfY + tfSize, tfSize);
    drawTri(tfX + tfSize, tfY + tfSize, tfSize);

    // Banner
    const pulse = (180 + Math.sin(t * 0.1) * 40) | 0;
    const bannerY = H - 40;
    for (let y = bannerY; y < bannerY + 10; y++) {
      for (let x = 20; x < W - 20; x++) {
        const i = (y * W + x) * 4;
        fb[i] = pulse; fb[i + 1] = (pulse * 0.82) | 0; fb[i + 2] = 0;
      }
    }

    // Blink "Press Start"
    if (((t / 20) | 0) % 2 === 0) {
      for (let y = H - 20; y < H - 14; y++) {
        for (let x = 60; x < W - 60; x++) {
          const i = (y * W + x) * 4;
          fb[i] = 80; fb[i + 1] = 200; fb[i + 2] = 80;
        }
      }
    }

    // Input indicator
    if (buttons) {
      for (let y = 0; y < 8; y++) {
        for (let x = W - 12; x < W; x++) {
          const i = (y * W + x) * 4;
          fb[i] = 255; fb[i + 1] = 100; fb[i + 2] = 0;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function resolveCoreDirFromImportMeta(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    return join(__dirname, "core");
  } catch {
    return join(process.cwd(), "core");
  }
}

export function createZeldaEngine(): ZeldaEngine {
  const coreDir = resolveCoreDirFromImportMeta();
  const wasmPath = join(coreDir, "snes9x_libretro.wasm");
  if (existsSync(wasmPath)) {
    return new WasmZeldaEngine(coreDir);
  }
  return new MockZeldaEngine();
}
