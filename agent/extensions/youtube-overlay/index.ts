import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { YouTubeOverlayComponent } from "./youtube-component.js";
import {
  YouTubeOverlayEngine,
  formatClock,
  loadYouTubePlaylist,
  looksLikeYouTubeUrl,
  searchYouTube,
  type YouTubePlaylistResult,
  type YouTubeSearchResult,
} from "./youtube-engine.js";
import { YouTubeSearchPickerComponent } from "./youtube-picker.js";

interface YouTubeInvocationOptions {
  query: string;
  audioEnabled: boolean;
  muted: boolean;
  volume: number;
  subtitlesEnabled: boolean;
  searchLimit: number;
}

interface PickedVideo {
  url: string;
  isResume: boolean;
  queue: YouTubeSearchResult[];
  index: number;
  queueLabel?: string;
}

interface ActivePlaybackSession {
  engineRef: { current: YouTubeOverlayEngine };
  queue: YouTubeSearchResult[];
  index: number;
  queueLabel?: string;
  options: YouTubeInvocationOptions;
}

let activeSession: ActivePlaybackSession | null = null;

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

function tokenizeArgs(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const char of input.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) tokens.push(current);
  return tokens;
}

function parseInvocationOptions(rawArgs: string): YouTubeInvocationOptions {
  const tokens = tokenizeArgs(rawArgs);
  let audioEnabled = true;
  let muted = false;
  let volume = 70;
  let subtitlesEnabled = true;
  let searchLimit = 8;
  const queryParts: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const next = tokens[i + 1];

    if (token === "--silent" || token === "--no-audio") {
      audioEnabled = false;
      continue;
    }
    if (token === "--audio") {
      audioEnabled = true;
      continue;
    }
    if (token === "--mute") {
      muted = true;
      continue;
    }
    if (token === "--unmute") {
      muted = false;
      continue;
    }
    if (token.startsWith("--volume=")) {
      volume = Math.max(0, Math.min(100, Number(token.split("=")[1])));
      continue;
    }
    if (token === "--volume" && next) {
      volume = Math.max(0, Math.min(100, Number(next)));
      i++;
      continue;
    }
    if (token === "--subs" || token === "--subtitles" || token === "--captions") {
      subtitlesEnabled = true;
      continue;
    }
    if (token === "--no-subs" || token === "--no-subtitles" || token === "--no-captions") {
      subtitlesEnabled = false;
      continue;
    }
    if (token.startsWith("--limit=")) {
      searchLimit = Math.max(1, Math.min(20, Number(token.split("=")[1])) || 8);
      continue;
    }
    if (token === "--limit" && next) {
      searchLimit = Math.max(1, Math.min(20, Number(next)) || 8);
      i++;
      continue;
    }

    queryParts.push(token);
  }

  return {
    query: stripWrappingQuotes(queryParts.join(" ")),
    audioEnabled,
    muted,
    volume,
    subtitlesEnabled,
    searchLimit,
  };
}

function formatResult(result: YouTubeSearchResult, index: number): string {
  const duration = result.durationSec ? ` [${formatClock(result.durationSec)}]` : "";
  const channel = result.channel ? ` — ${result.channel}` : "";
  return `${index + 1}. ${result.title}${channel}${duration}`;
}

async function pickFromResults(title: string, results: YouTubeSearchResult[], ctx: any): Promise<number | null> {
  if (results.length === 0) return null;

  if (!ctx.hasUI) {
    const options = results.map(formatResult);
    const selected = await ctx.ui.select(title, options);
    return selected ? options.indexOf(selected) : null;
  }

  return ctx.ui.custom(
    (tui: any, theme: any, _keybindings: any, done: (value: number | null) => void) => {
      return new YouTubeSearchPickerComponent(tui, theme, title, results, done);
    },
    {
      overlay: true,
      overlayOptions: {
        width: "88%",
        maxHeight: "92%",
        anchor: "center",
      },
    },
  );
}

async function tryLoadPlaylist(url: string, ctx: any): Promise<YouTubePlaylistResult | null> {
  if (!/[?&]list=|\/playlist\b/i.test(url)) return null;
  try {
    ctx.ui.notify("Loading playlist…", "info");
    const playlist = await loadYouTubePlaylist(url, 20);
    return playlist.items.length > 1 ? playlist : null;
  } catch {
    return null;
  }
}

async function pickVideo(args: string, options: YouTubeInvocationOptions, ctx: any): Promise<PickedVideo | null> {
  const trimmed = stripWrappingQuotes(args.trim());

  if (!trimmed) {
    if (activeSession) {
      return {
        url: activeSession.engineRef.current.videoUrl,
        isResume: true,
        queue: activeSession.queue,
        index: activeSession.index,
        queueLabel: activeSession.queueLabel,
      };
    }

    const query = await ctx.ui.input("Search YouTube", "artist, topic, channel, playlist, or URL");
    if (!query?.trim()) return null;
    const nextOptions = { ...options, query: query.trim() };
    return pickVideo(query.trim(), nextOptions, ctx);
  }

  if (looksLikeYouTubeUrl(trimmed)) {
    const playlist = await tryLoadPlaylist(trimmed, ctx);
    if (playlist) {
      const pickerTitle = playlist.title ? `Playlist: ${playlist.title}` : "Pick a playlist video";
      const selectedIndex = await pickFromResults(pickerTitle, playlist.items, ctx);
      if (selectedIndex == null) return null;
      const chosen = playlist.items[selectedIndex]!;
      return {
        url: chosen.url,
        isResume: Boolean(activeSession?.engineRef.current.matchesUrl(chosen.url)),
        queue: playlist.items,
        index: selectedIndex,
        queueLabel: playlist.title || "Playlist",
      };
    }

    return {
      url: trimmed,
      isResume: Boolean(activeSession?.engineRef.current.matchesUrl(trimmed)),
      queue: [{ id: trimmed, title: trimmed, url: trimmed }],
      index: 0,
      queueLabel: "Direct URL",
    };
  }

  ctx.ui.notify(`Searching YouTube for “${trimmed}”…`, "info");
  const results = await searchYouTube(trimmed, options.searchLimit);
  if (results.length === 0) {
    ctx.ui.notify(`No videos found for “${trimmed}”.`, "warning");
    return null;
  }

  const selectedIndex = await pickFromResults(`Results for “${trimmed}”`, results, ctx);
  if (selectedIndex == null) return null;
  const chosen = results[selectedIndex]!;

  return {
    url: chosen.url,
    isResume: Boolean(activeSession?.engineRef.current.matchesUrl(chosen.url)),
    queue: results,
    index: selectedIndex,
    queueLabel: `Search: ${trimmed}`,
  };
}

async function startPickedVideo(picked: PickedVideo, options: YouTubeInvocationOptions, ctx: any): Promise<{ session: ActivePlaybackSession; isResume: boolean }> {
  if (activeSession && activeSession.engineRef.current.matchesUrl(picked.url)) {
    activeSession.queue = picked.queue;
    activeSession.index = picked.index;
    activeSession.queueLabel = picked.queueLabel;
    activeSession.options = options;
    await activeSession.engineRef.current.configure(options);
    await activeSession.engineRef.current.play();
    return { session: activeSession, isResume: true };
  }

  const engine = await YouTubeOverlayEngine.fromUrl(picked.url);
  await engine.configure(options);
  await engine.play();

  if (picked.queue[picked.index]) {
    picked.queue[picked.index] = {
      ...picked.queue[picked.index]!,
      title: engine.title,
      url: engine.videoUrl,
    };
  }

  activeSession?.engineRef.current.dispose();
  activeSession = {
    engineRef: { current: engine },
    queue: picked.queue,
    index: picked.index,
    queueLabel: picked.queueLabel,
    options,
  };

  return { session: activeSession, isResume: false };
}

async function shiftQueue(session: ActivePlaybackSession, delta: number, ctx: any): Promise<boolean> {
  const nextIndex = session.index + delta;
  if (nextIndex < 0 || nextIndex >= session.queue.length) {
    ctx.ui.notify(delta > 0 ? "No next video in queue." : "No previous video in queue.", "warning");
    return false;
  }

  const nextItem = session.queue[nextIndex]!;
  ctx.ui.notify(`Loading ${delta > 0 ? "next" : "previous"} video…`, "info");
  const nextEngine = await YouTubeOverlayEngine.fromUrl(nextItem.url);
  await nextEngine.configure(session.options);
  await nextEngine.play();

  const previousEngine = session.engineRef.current;
  session.engineRef.current = nextEngine;
  session.index = nextIndex;
  session.queue[nextIndex] = { ...nextItem, title: nextEngine.title, url: nextEngine.videoUrl };
  previousEngine.dispose();
  return true;
}

export default function (pi: ExtensionAPI) {
  const handler = async (rawArgs: string, ctx: any) => {
    if (!ctx.hasUI) {
      ctx.ui.notify("youtube requires the interactive Pi UI.", "error");
      return;
    }

    try {
      const options = parseInvocationOptions(rawArgs);
      const picked = await pickVideo(options.query, options, ctx);
      if (!picked) return;

      const { session, isResume } = await startPickedVideo(picked, options, ctx);
      const state = session.engineRef.current.getState();
      const audioMode = state.audioEnabled ? (state.audioMuted ? "audio muted" : `audio ${state.audioVolume}%`) : "silent";
      const subsMode = state.subtitlesEnabled ? "subs on" : state.subtitlesAvailable ? "subs off" : "no subs";

      ctx.ui.notify(
        isResume
          ? `Resuming ${session.engineRef.current.title} (${audioMode}, ${subsMode})`
          : `Starting ${session.engineRef.current.title} (${audioMode}, ${subsMode})`,
        "info",
      );

      await ctx.ui.custom(
        (tui: any, _theme: any, _keybindings: any, done: () => void) => {
          return new YouTubeOverlayComponent(tui, session.engineRef, () => done(), {
            resume: isResume,
            getQueueLabel: () => {
              if (session.queue.length <= 1) return session.queueLabel;
              return `${session.index + 1}/${session.queue.length}${session.queueLabel ? ` • ${session.queueLabel}` : ""}`;
            },
            onNext: () => shiftQueue(session, 1, ctx),
            onPrev: () => shiftQueue(session, -1, ctx),
          });
        },
        {
          overlay: true,
          overlayOptions: {
            width: "90%",
            maxHeight: "92%",
            anchor: "center",
          },
        },
      );
    } catch (error: any) {
      ctx.ui.notify(`youtube failed: ${error?.message ?? String(error)}`, "error");
    }
  };

  pi.registerCommand("youtube", {
    description: "Play YouTube in a Pi overlay. URL or query. Flags: --audio --silent --mute --volume=75 --subs --no-subs --limit=12",
    handler,
  });

  pi.registerCommand("youtube-overlay", {
    description: "Alias for /youtube.",
    handler,
  });

  return {
    name: "youtube-overlay",
    version: "2.1.0",
    description: "Search or play YouTube videos as a terminal overlay inside Pi with audio, subtitles, and queue navigation.",
  };
}
