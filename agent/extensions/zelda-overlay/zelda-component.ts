/**
 * zelda-component.ts
 *
 * Implements the pi-tui Component interface for the Zelda ALTTP overlay.
 *
 * Rendering technique — half-block Unicode (▀):
 *   Each terminal row covers 2 pixel rows.
 *   Foreground color = top pixel row, background color = bottom pixel row.
 *   Escape: \x1b[38;2;R;G;Bm (fg) + \x1b[48;2;R;G;Bm (bg) + ▀
 *
 * SNES native resolution: 256x224 pixels
 * At 30fps (setInterval ~33ms), the overlay runs the emulator frame loop.
 */

import type { Component, TUI } from "@mariozechner/pi-tui";
import type { ZeldaEngine } from "./zelda-engine.js";
import { SNES_WIDTH, SNES_HEIGHT } from "./zelda-engine.js";
import {
  createInputState,
  applyInput,
  clearMomentaryButtons,
  isQuitKey,
  type SnesInputState,
} from "./zelda-keys.js";

// ANSI reset sequence
const RESET = "\x1b[0m";

// Reusable zero buffer for last-row padding (avoids per-frame allocation)
const EMPTY_ROW = new Uint8Array(SNES_WIDTH * 4);

// Footer displayed below the game
const FOOTER =
  " ZELDA: A LINK TO THE PAST  |  Q=Quit  |  WASD=Move  |  Space=A  |  F=B  |  E=X  |  R=Y  |  Enter=Start  |  Tab=Select ";

/**
 * Renders one row of SNES pixels as a string of half-block characters.
 * topRow and bottomRow are slices of the RGBA framebuffer for consecutive
 * pixel rows (each SNES_WIDTH * 4 bytes wide).
 */
function renderRow(
  topRow: Uint8Array,
  bottomRow: Uint8Array,
  targetWidth: number,
  srcXMap: Int32Array,
): string {
  const parts: string[] = new Array(targetWidth + 1);
  for (let col = 0; col < targetWidth; col++) {
    const off = srcXMap[col] * 4;
    const r1 = topRow[off], g1 = topRow[off + 1], b1 = topRow[off + 2];
    const r2 = bottomRow[off], g2 = bottomRow[off + 1], b2 = bottomRow[off + 2];
    parts[col] = `\x1b[38;2;${r1};${g1};${b1}m\x1b[48;2;${r2};${g2};${b2}m\u2580`;
  }
  parts[targetWidth] = RESET;
  return parts.join("");
}

export class ZeldaOverlayComponent implements Component {
  /** Tell pi-tui we want key release events too */
  wantsKeyRelease = true;

  private _tui: TUI;
  private _engine: ZeldaEngine;
  private _done: () => void;
  private _inputState: SnesInputState = createInputState();
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _paused = false;
  private _lines: string[] = [];
  private _lastWidth = 0;
  private _srcXMap: Int32Array | null = null;
  private _srcXMapWidth = 0;

  constructor(tui: TUI, engine: ZeldaEngine, done: () => void, _isResume: boolean) {
    this._tui = tui;
    this._engine = engine;
    this._done = done;
    this._startLoop();
  }

  // ---------------------------------------------------------------------------
  // Component interface
  // ---------------------------------------------------------------------------

  handleInput(data: string): void {
    if (isQuitKey(data)) {
      this._paused = true;
      this._stopLoop();
      this._done();
      return;
    }

    applyInput(this._inputState, data);
  }

  render(width: number): string[] {
    this._lastWidth = width;
    return this._lines;
  }

  invalidate(): void {
    // Intentionally empty — we drive our own invalidation via the game loop
  }

  dispose(): void {
    this._stopLoop();
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private _startLoop(): void {
    // ~30fps
    this._timer = setInterval(() => this._tick(), Math.floor(1000 / 30));
  }

  private _stopLoop(): void {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  private _tick(): void {
    if (this._paused) return;

    // Advance emulator with current input
    this._engine.tick(this._inputState.buttons);

    // Clear momentary button state (terminal gives us key-down only)
    clearMomentaryButtons(this._inputState);

    // Rebuild the line buffer
    this._buildLines();

    // Notify pi-tui to re-render
    if (this._tui && typeof this._tui.requestRender === "function") {
      this._tui.requestRender();
    }
  }

  private _buildLines(): void {
    const fb = this._engine.getFrameRGBA();
    const termWidth = this._lastWidth || 80;
    const displayCols = Math.min(termWidth - 2, SNES_WIDTH);
    const displayRows = Math.ceil(SNES_HEIGHT / 2);

    // Reuse the lines array to reduce GC pressure
    this._lines.length = 0;

    if (!this._engine.ready) {
      this._lines.push("", "  Loading SNES emulator...", `  ${this._engine.statusMessage}`, "");
      return;
    }

    // Pre-compute srcX lookup table (rebuild only when width changes)
    if (!this._srcXMap || this._srcXMapWidth !== displayCols) {
      this._srcXMap = new Int32Array(displayCols);
      for (let col = 0; col < displayCols; col++) {
        this._srcXMap[col] = ((col / displayCols) * SNES_WIDTH) | 0;
      }
      this._srcXMapWidth = displayCols;
    }

    for (let row = 0; row < displayRows; row++) {
      const topY = row * 2;
      const bottomY = topY + 1;
      const topRow = fb.subarray(topY * SNES_WIDTH * 4, (topY + 1) * SNES_WIDTH * 4);
      const bottomRow = bottomY < SNES_HEIGHT
        ? fb.subarray(bottomY * SNES_WIDTH * 4, (bottomY + 1) * SNES_WIDTH * 4)
        : EMPTY_ROW;
      this._lines.push(renderRow(topRow, bottomRow, displayCols, this._srcXMap));
    }

    const footerTruncated = FOOTER.length > termWidth
      ? FOOTER.slice(0, termWidth - 1)
      : FOOTER.padEnd(termWidth);
    this._lines.push(`\x1b[30;47m${footerTruncated}${RESET}`);
  }
}
