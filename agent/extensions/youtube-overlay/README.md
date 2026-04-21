# youtube-overlay v2.1

Play **YouTube videos inside Pi** as a terminal overlay.

Like the Doom and Zelda overlays, this renders animated frames directly in the Pi UI using half-block Unicode (`▀`) with 24-bit ANSI color.

## New in v2.1

- `/youtube` command is the primary entrypoint
- **Windows audio playback** with mute and volume controls
- **Subtitle / caption overlay** with auto-track detection
- **Search preview picker** with thumbnail previews when supported
- **Queue / playlist navigation** with next and previous controls
- Better flag parsing with quoted queries and explicit media options

## Features

- `/youtube <youtube-url>` — direct playback
- `/youtube <search query>` — search + interactive preview picker
- `/youtube <playlist-url>` — playlist picker + queue navigation
- `/youtube` — resume current video, or prompt for a search query
- `/youtube-overlay ...` — legacy alias
- Re-opening the same video resumes from the last paused position

## Examples

```text
/youtube https://www.youtube.com/watch?v=dQw4w9WgXcQ
/youtube Griselda
/youtube "lofi hip hop" --mute --volume=40
/youtube "Griselda live" --no-subs
/youtube "MF DOOM" --silent
/youtube "Alchemist type beats" --limit=12
```

## Controls

| Key | Action |
|-----|--------|
| `Space` | Play / pause |
| `J` | Seek back 10s |
| `L` | Seek forward 10s |
| `0` | Restart |
| `A` | Toggle audio on / off |
| `M` | Mute / unmute |
| `+` / `-` | Volume up / down |
| `C` | Toggle subtitles |
| `N` | Next video in queue / playlist |
| `P` | Previous video in queue / playlist |
| `Q` | Pause and close overlay |

## Flags

- `--audio` — force audio on
- `--silent` or `--no-audio` — disable audio
- `--mute` / `--unmute`
- `--volume=75` or `--volume 75`
- `--subs`, `--subtitles`, `--captions`
- `--no-subs`, `--no-subtitles`, `--no-captions`
- `--limit=12` — number of search results to fetch for picker / queue

## Notes

- Audio currently works on **Windows**. Other platforms fall back to silent playback.
- Subtitles are loaded from available manual or automatic caption tracks when YouTube exposes them.
- On first run, the extension downloads a local `yt-dlp` binary into `extensions/youtube-overlay/bin/`.
- `ffmpeg-static` is bundled in the extension’s `node_modules` and used for frame decoding.
- Windows audio is driven by `wmplayer-audio.ps1`, which controls the built-in Windows Media Player COM object in the background.

## Files

```text
youtube-overlay/
├── index.ts              # Pi command registration + queue handling
├── youtube-engine.ts     # yt-dlp + ffmpeg playback engine + audio + subtitles
├── youtube-component.ts  # Overlay renderer + playback controls
├── youtube-picker.ts     # Search / playlist preview picker
├── wmplayer-audio.ps1    # Windows audio helper
├── package.json          # Local dependencies
└── README.md
```
