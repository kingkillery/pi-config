import type { Component, TUI } from "@mariozechner/pi-tui";
import { YouTubeOverlayEngine, formatClock } from "./youtube-engine.js";

const RESET = "\x1b[0m";

interface EngineRef {
  current: YouTubeOverlayEngine;
}

interface YouTubeOverlayComponentOptions {
  resume: boolean;
  getQueueLabel?: () => string | undefined;
  onNext?: () => Promise<boolean>;
  onPrev?: () => Promise<boolean>;
}

function truncate(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text;
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

function renderRow(
  topRow: Uint8Array,
  bottomRow: Uint8Array,
  targetWidth: number,
  srcXMap: Int32Array,
): string {
  const parts: string[] = new Array(targetWidth + 1);
  for (let col = 0; col < targetWidth; col++) {
    const off = srcXMap[col] * 4;
    const r1 = topRow[off] ?? 0;
    const g1 = topRow[off + 1] ?? 0;
    const b1 = topRow[off + 2] ?? 0;
    const r2 = bottomRow[off] ?? 0;
    const g2 = bottomRow[off + 1] ?? 0;
    const b2 = bottomRow[off + 2] ?? 0;
    parts[col] = `\x1b[38;2;${r1};${g1};${b1}m\x1b[48;2;${r2};${g2};${b2}m▀`;
  }
  parts[targetWidth] = RESET;
  return parts.join("");
}

export class YouTubeOverlayComponent implements Component {
  private tui: TUI;
  private engineRef: EngineRef;
  private onExit: () => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private srcXMap: Int32Array | null = null;
  private srcXMapWidth = 0;
  private pendingAction = false;
  private emptyRow: Uint8Array;
  private getQueueLabel?: () => string | undefined;
  private onNext?: () => Promise<boolean>;
  private onPrev?: () => Promise<boolean>;
  private lastVideoId: string;
  private handledEndedVideoId: string | null = null;

  constructor(
    tui: TUI,
    engineRef: EngineRef,
    onExit: () => void,
    options: YouTubeOverlayComponentOptions,
  ) {
    this.tui = tui;
    this.engineRef = engineRef;
    this.onExit = onExit;
    this.getQueueLabel = options.getQueueLabel;
    this.onNext = options.onNext;
    this.onPrev = options.onPrev;
    this.emptyRow = new Uint8Array(this.engineRef.current.frameWidth * 4);
    this.lastVideoId = this.engineRef.current.videoId;

    if (options.resume) {
      void this.engineRef.current.play();
    }

    this.timer = setInterval(() => {
      const engine = this.engineRef.current;
      if (engine.videoId !== this.lastVideoId) {
        this.lastVideoId = engine.videoId;
        this.handledEndedVideoId = null;
        this.emptyRow = new Uint8Array(engine.frameWidth * 4);
      }

      const state = engine.getState();
      if (state.ended && this.onNext && this.handledEndedVideoId !== engine.videoId && !this.pendingAction) {
        this.handledEndedVideoId = engine.videoId;
        this.queue(async () => {
          const advanced = await this.onNext?.();
          if (!advanced) {
            this.handledEndedVideoId = null;
          }
        });
      }

      this.tui.requestRender();
    }, 1000 / Math.max(8, this.engineRef.current.fps));
  }

  private queue(action: () => Promise<void>): void {
    this.pendingAction = true;
    void action().finally(() => {
      this.pendingAction = false;
      this.tui.requestRender();
    });
  }

  handleInput(data: string): void {
    if (data === "q" || data === "Q") {
      void this.engineRef.current.pause().finally(() => {
        this.dispose();
        this.onExit();
      });
      return;
    }

    if (this.pendingAction) return;

    const engine = this.engineRef.current;

    switch (data) {
      case " ":
        this.queue(() => engine.togglePause());
        return;
      case "j":
      case "J":
        this.queue(() => engine.seekBy(-10));
        return;
      case "l":
      case "L":
        this.queue(() => engine.seekBy(10));
        return;
      case "0":
        this.queue(() => engine.restart());
        return;
      case "a":
      case "A":
        this.queue(() => engine.toggleAudioEnabled());
        return;
      case "m":
      case "M":
        this.queue(() => engine.toggleMute());
        return;
      case "+":
      case "=":
        this.queue(() => engine.changeVolumeBy(5));
        return;
      case "-":
      case "_":
        this.queue(() => engine.changeVolumeBy(-5));
        return;
      case "c":
      case "C":
        this.queue(() => engine.toggleSubtitles());
        return;
      case "n":
      case "N":
        if (this.onNext) this.queue(() => this.onNext!().then(() => undefined));
        return;
      case "p":
      case "P":
        if (this.onPrev) this.queue(() => this.onPrev!().then(() => undefined));
        return;
      default:
        return;
    }
  }

  render(width: number): string[] {
    const engine = this.engineRef.current;
    const state = engine.getState();
    const queueLabel = this.getQueueLabel?.();
    const audioBadge = state.audioAvailable
      ? state.audioEnabled
        ? state.audioMuted || state.audioVolume === 0
          ? " [muted]"
          : ` [vol ${state.audioVolume}%]`
        : " [audio off]"
      : " [audio n/a]";
    const subtitleBadge = state.subtitlesEnabled ? " [subs on]" : state.subtitlesAvailable ? " [subs off]" : " [no subs]";

    const titleLine = truncate(
      ` ${state.title}${state.channel ? ` — ${state.channel}` : ""}${audioBadge}${subtitleBadge}`,
      width,
    );

    const progress = `${formatClock(state.currentTimeSec)} / ${formatClock(state.durationSec)}`;
    const footerBase = " Space Play/Pause | J/L seek | 0 restart | A audio | M mute | +/- vol | C subs | N/P next-prev | Q exit ";
    const footer = truncate(
      ` ${state.playing ? "▶" : state.ended ? "■" : "⏸"}  ${progress}  |${footerBase}`,
      width,
    );
    const statusLine = truncate(` ${state.statusMessage}`, width);
    const audioLine = truncate(` Audio: ${state.audioStatus}`, width);
    const subtitleLine = truncate(` Subs: ${state.subtitleStatus}`, width);
    const queueLine = queueLabel ? truncate(` Queue: ${queueLabel}`, width) : "";
    const currentCaption = state.subtitleText ? truncate(` “${state.subtitleText}”`, width) : "";

    if (!state.ready) {
      return [
        titleLine,
        "",
        statusLine,
        audioLine,
        subtitleLine,
        ...(queueLine ? [queueLine] : []),
        "",
        footer,
      ];
    }

    const fb = engine.getFrameRGBA();
    const displayCols = Math.max(1, Math.min(width, engine.frameWidth));
    const terminalAspectRatio = (engine.frameWidth / engine.frameHeight) * 2;
    const displayRows = Math.max(4, Math.floor(displayCols / terminalAspectRatio));
    const srcYMap = new Int32Array(displayRows * 2);

    if (!this.srcXMap || this.srcXMapWidth !== displayCols) {
      this.srcXMap = new Int32Array(displayCols);
      for (let col = 0; col < displayCols; col++) {
        this.srcXMap[col] = ((col / displayCols) * engine.frameWidth) | 0;
      }
      this.srcXMapWidth = displayCols;
    }

    for (let row = 0; row < displayRows * 2; row++) {
      srcYMap[row] = ((row / (displayRows * 2)) * engine.frameHeight) | 0;
    }

    const lines: string[] = [titleLine];
    for (let row = 0; row < displayRows; row++) {
      const topY = srcYMap[row * 2] ?? 0;
      const bottomY = srcYMap[row * 2 + 1] ?? topY;
      const topRow = fb.subarray(
        topY * engine.frameWidth * 4,
        (topY + 1) * engine.frameWidth * 4,
      );
      const bottomRow = bottomY < engine.frameHeight
        ? fb.subarray(bottomY * engine.frameWidth * 4, (bottomY + 1) * engine.frameWidth * 4)
        : this.emptyRow;
      lines.push(renderRow(topRow, bottomRow, displayCols, this.srcXMap!));
    }

    lines.push(statusLine);
    lines.push(audioLine);
    lines.push(subtitleLine);
    if (queueLine) lines.push(queueLine);
    if (currentCaption) lines.push(currentCaption);
    lines.push(footer);
    return lines;
  }

  invalidate(): void {
    // Timer-driven.
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    void this.engineRef.current.pause();
  }
}
