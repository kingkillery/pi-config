import type { Component, TUI } from "@mariozechner/pi-tui";
import { Image, matchesKey } from "@mariozechner/pi-tui";
import { formatClock, type YouTubeSearchResult } from "./youtube-engine.js";

function truncate(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text;
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

function asBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

export class YouTubeSearchPickerComponent implements Component {
  private selectedIndex = 0;
  private thumbnailCache = new Map<number, { base64: string; mimeType: string } | null>();
  private thumbnailImage: Image | null = null;
  private loadingThumbnail = false;

  constructor(
    private tui: TUI,
    private theme: any,
    private heading: string,
    private results: YouTubeSearchResult[],
    private done: (index: number | null) => void,
  ) {
    void this.ensureThumbnail(this.selectedIndex);
  }

  private get current(): YouTubeSearchResult {
    return this.results[this.selectedIndex]!;
  }

  private async ensureThumbnail(index: number): Promise<void> {
    if (this.thumbnailCache.has(index)) {
      const cached = this.thumbnailCache.get(index);
      this.thumbnailImage = cached
        ? new Image(cached.base64, cached.mimeType, this.theme, { maxWidthCells: 42, maxHeightCells: 12 })
        : null;
      this.tui.requestRender();
      return;
    }

    const url = this.results[index]?.thumbnailUrl;
    if (!url) {
      this.thumbnailCache.set(index, null);
      this.thumbnailImage = null;
      this.tui.requestRender();
      return;
    }

    this.loadingThumbnail = true;
    this.tui.requestRender();

    try {
      const response = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0" },
      });
      if (!response.ok) throw new Error(`thumbnail ${response.status}`);
      const mimeType = response.headers.get("content-type") || "image/jpeg";
      const base64 = asBase64(await response.arrayBuffer());
      const entry = { base64, mimeType };
      this.thumbnailCache.set(index, entry);
      if (index === this.selectedIndex) {
        this.thumbnailImage = new Image(base64, mimeType, this.theme, { maxWidthCells: 42, maxHeightCells: 12 });
      }
    } catch {
      this.thumbnailCache.set(index, null);
      if (index === this.selectedIndex) {
        this.thumbnailImage = null;
      }
    } finally {
      if (index === this.selectedIndex) {
        this.loadingThumbnail = false;
      }
      this.tui.requestRender();
    }
  }

  private async moveSelection(delta: number): Promise<void> {
    const next = Math.max(0, Math.min(this.results.length - 1, this.selectedIndex + delta));
    if (next === this.selectedIndex) return;
    this.selectedIndex = next;
    this.loadingThumbnail = false;
    await this.ensureThumbnail(next);
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
      this.done(null);
      return;
    }

    if (matchesKey(data, "return")) {
      this.done(this.selectedIndex);
      return;
    }

    if (matchesKey(data, "up") || data === "k" || data === "K") {
      void this.moveSelection(-1);
      return;
    }

    if (matchesKey(data, "down") || data === "j" || data === "J") {
      void this.moveSelection(1);
      return;
    }

    if (/^[1-9]$/.test(data)) {
      const index = Number(data) - 1;
      if (index >= 0 && index < this.results.length) {
        this.done(index);
      }
    }
  }

  render(width: number): string[] {
    const selected = this.current;
    const title = this.theme.fg("accent", truncate(` ${this.heading}`, width));
    const divider = this.theme.fg("border", "─".repeat(Math.max(1, width)));
    const lines: string[] = [title, divider];

    if (this.thumbnailImage) {
      lines.push(...this.thumbnailImage.render(Math.max(20, width)));
    } else if (this.loadingThumbnail) {
      lines.push(this.theme.fg("dim", truncate(" Loading thumbnail…", width)));
      lines.push("");
    } else {
      lines.push(this.theme.fg("dim", truncate(" Thumbnail unavailable in this terminal/session.", width)));
      lines.push("");
    }

    lines.push(this.theme.fg("accent", truncate(` ${selected.title}`, width)));
    if (selected.channel) lines.push(truncate(` ${selected.channel}`, width));
    if (selected.durationSec) lines.push(this.theme.fg("muted", truncate(` ${formatClock(selected.durationSec)}`, width)));
    lines.push(this.theme.fg("dim", truncate(` ${selected.url}`, width)));
    lines.push(divider);

    for (let i = 0; i < this.results.length; i++) {
      const item = this.results[i]!;
      const prefix = i === this.selectedIndex ? this.theme.fg("accent", "›") : this.theme.fg("dim", " ");
      const duration = item.durationSec ? ` [${formatClock(item.durationSec)}]` : "";
      const channel = item.channel ? ` — ${item.channel}` : "";
      const text = truncate(` ${i + 1}. ${item.title}${channel}${duration}`, Math.max(1, width - 2));
      lines.push(`${prefix}${text}`);
    }

    lines.push(divider);
    lines.push(this.theme.fg("dim", truncate(" ↑/↓ or J/K navigate • Enter select • Esc cancel • 1-9 quick-pick", width)));
    return lines;
  }

  invalidate(): void {
    this.thumbnailImage?.invalidate();
  }
}
