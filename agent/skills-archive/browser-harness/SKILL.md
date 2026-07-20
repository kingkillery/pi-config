---
name: browser-harness
description: Direct browser control via CDP. Use when the user wants to automate, scrape, test, or interact with web pages. Connects to the user's already-running Chrome or Comet.
---

# browser-harness

Easiest and most powerful way to interact with the browser. **Read this file in full before using or editing the harness** — it has to be in context.

## Fast start

Read `helpers.py` first. For first-time install or reconnect/bootstrap, read `install.md` first.

```bash
browser-harness <<'PY'
new_tab("https://docs.browser-use.com")
wait_for_load()
print(page_info())
PY
```

- Invoke as `browser-harness` — it's on `$PATH`. No `cd`, no `uv run`.
- First navigation is `new_tab(url)`, not `goto(url)` — `goto` runs in the user's active tab and clobbers their work.

The code is the doc.

Available interaction skills:
- `interaction-skills/connection.md` — startup sequence, tab visibility, omnibox popup fix

Available domain skills:
- `tiktok/upload.md`

## Tool call shape

```bash
browser-harness <<'PY'
# any python. helpers pre-imported. daemon auto-starts.
PY
```

`run.py` calls `ensure_daemon()` before `exec` — you never start/stop manually unless you want to.

Local browsers:
- Default is auto-detect.
- If both Chrome and Comet are live, choose explicitly with `BU_BROWSER=chrome` or `BU_BROWSER=comet`.
- `list_local_browsers()` shows the currently live local options and their inspect URLs.

### Remote browsers

Use remote for **parallel sub-agents** (each gets its own isolated browser via a distinct `BU_NAME`) or on a headless server. `BROWSER_USE_API_KEY` must be set. `start_remote_daemon`, `list_cloud_profiles`, `list_local_profiles`, `sync_local_profile` are pre-imported.

```bash
browser-harness <<'PY'
start_remote_daemon("work")                               # default — clean browser, no profile
# start_remote_daemon("work", profileName="my-work")      # reuse a cloud profile (already logged in)
# start_remote_daemon("work", profileId="<uuid>")         # same, but by UUID
# start_remote_daemon("work", proxyCountryCode="de", timeout=120)   # DE proxy, 2-hour timeout
# start_remote_daemon("work", proxyCountryCode=None)      # disable the Browser Use proxy
PY

BU_NAME=work browser-harness <<'PY'
new_tab("https://example.com")
print(page_info())
PY
```

`start_remote_daemon` prints `liveUrl` and auto-opens it in the local browser (if a GUI is detected) so the user can watch along. Headless servers print only — share the URL with the user. The daemon `PATCH`es the cloud browser to `stop` on shutdown, which persists profile state. Running remote daemons bill until timeout.

Profiles (cookies-only login state) live in `interaction-skills/profile-sync.md` — covers `list_cloud_profiles()`, the chat-driven "which profile?" pattern, and `sync_local_profile()` for uploading a local Chrome profile.

## Search first

After cloning the repo, search `domain-skills/` first for the domain you are working on before inventing a new approach.

Only if you start struggling with a specific mechanic while navigating, look in `interaction-skills/` for helpers. The available interaction skills are:
- `cookies.md`
- `cross-origin-iframes.md`
- `dialogs.md`
- `downloads.md`
- `drag-and-drop.md`
- `dropdowns.md`
- `iframes.md`
- `network-requests.md`
- `print-as-pdf.md`
- `profile-sync.md`
- `screenshots.md`
- `scrolling.md`
- `shadow-dom.md`
- `tabs.md`
- `uploads.md`
- `viewport.md`

Useful commands:

```bash
rg --files domain-skills
rg -n "tiktok|upload" domain-skills
```

## Always contribute back

**If you learned anything non-obvious about how a site works, open a PR to `domain-skills/<site>/` before you finish. Default to contributing.** The harness gets better only because agents file what they learn. If figuring something out cost you a few steps, the next run should not pay the same tax.

Examples of what's worth a PR:

- A **private API** the page calls (XHR/fetch endpoint, request shape, auth) — often 10× faster than DOM scraping.
- A **stable selector** that beats the obvious one, or an obfuscated CSS-module class to avoid.
- A **framework quirk** — "the dropdown is a React combobox that only commits on Escape", "this Vue list only renders rows inside its own scroll container, so `scrollIntoView` on the row doesn't work — you have to scroll the container".
- A **URL pattern** — direct route, required query params (`?lang=en`, `?th=1`), a variant that skips a loader.
- A **wait** that `wait_for_load()` misses, with the reason.
- A **trap** — stale drafts, legacy IDs that now return null, unicode quirks, beforeunload dialogs, CAPTCHA surfaces.

### What a domain skill should capture

The *durable* shape of the site — the map, not the diary. Focus on what the next agent on this site needs to know before it starts:

- URL patterns and query params.
- Private APIs and their payload shape.
- Stable selectors (`data-*`, `aria-*`, `role`, semantic classes).
- Site structure — containers, items per page, framework, where state lives.
- Framework/interaction quirks unique to this site.
- Waits and the reasons they're needed.
- Traps and the selectors that *don't* work.

### Do not write

- **Raw pixel coordinates.** They break on viewport, zoom, and layout changes. Describe how to *locate* the target (selector, `scrollIntoView`, `aria-label`, visible text) — never where it happened to be on your screen.
- **Run narration** or step-by-step of the specific task you just did.
- **Secrets, cookies, session tokens, user-specific state.** `domain-skills/` is shared and public.

## What actually works

- **Screenshots first**: use `screenshot()` to understand the current page quickly, find visible targets, and decide whether you need a click, a selector, or more navigation.
- **Clicking**: `screenshot()` → look → `click(x, y)` → `screenshot()` again to verify the result. Coordinate clicks pass through iframes/shadow/cross-origin at the compositor level.
- **Bulk HTTP**: `http_get(url)` + `ThreadPoolExecutor`. No browser for static pages (249 Netflix pages in 2.8s).
- **After goto**: `wait_for_load()`.
- **Wrong/stale tab**: `ensure_real_tab()`. Use it when the current tab is stale or internal; the daemon also auto-recovers from stale sessions on the next call.
- **Verification**: `print(page_info())` is the simplest "is this alive?" check, but screenshots are the default way to verify whether a visible action actually worked.
- **DOM reads**: use `js(...)` for inspection and extraction when the screenshot shows that coordinates are the wrong tool.
- **Iframe sites** (Azure blades, Salesforce): `click(x, y)` passes through; only drop to iframe DOM work when coordinate clicks are the wrong tool.
- **Auth wall**: redirected to login → stop and ask the user. Don't type credentials from screenshots.
- **Raw CDP** for anything helpers don't cover: `cdp("Domain.method", **params)`.

## Design constraints

- **Coordinate clicks default.** `Input.dispatchMouseEvent` goes through iframes/shadow/cross-origin at the compositor level.
- **Connect to the user's running Chrome or Comet.** Don't launch your own browser.
- **`cdp-use` is only for `CDPClient.send_raw`.** Prefer raw CDP strings over typed wrappers.
- **`run.py` stays tiny.** No argparse, subcommands, or extra control layer.
- **Helpers stay short.** Browser primitives in `helpers.py`; daemon/bootstrap and remote session admin live in `admin.py`.
- **Don't add a manager layer.** No retries framework, session manager, daemon supervisor, config system, or logging framework.

## Architecture

```text
Chrome / Comet / Browser Use cloud -> CDP WS -> daemon.py -> /tmp/bu-<NAME>.sock -> run.py
```

- Protocol is one JSON line each way.
- Requests are `{method, params, session_id}` for CDP or `{meta: ...}` for daemon control.
- Responses are `{result}` / `{error}` / `{events}` / `{session_id}`.
- `BU_NAME` namespaces socket, pid, and log files.
- `BU_CDP_WS` overrides local browser discovery for remote browsers.
- `BU_BROWSER` selects a local browser family (`chrome`, `comet`, `edge`, `chromium`) when more than one is live.
- `BU_BROWSER_ID` + `BROWSER_USE_API_KEY` lets the daemon stop a Browser Use cloud browser on shutdown.

## Gotchas (field-tested)

- **Chrome 144+ `chrome://inspect/#remote-debugging` does NOT serve `/json/version`.** Read `DevToolsActivePort` instead. Comet works the same way from `comet://inspect/#remote-debugging`.
- **Try attaching before asking for setup.** If `uv run browser-harness` already works, skip the remote-debugging instructions entirely. Decide what to escalate from the harness's error message, not from whether Chrome or Comet is visibly running.
- **The remote-debugging checkbox is per-profile sticky in Chromium browsers.** Once ticked on a profile, every future Chrome or Comet launch auto-enables CDP — only navigate to the inspect page when `DevToolsActivePort` is genuinely missing on a fresh profile.
- **The first connect may block on the browser's Allow dialog.** If setup hangs, explicitly tell the user to click `Allow` if it appears, then keep polling for up to 30 seconds instead of treating follow-on errors as a new failure.
- **`DevToolsActivePort` can exist before the port is actually listening.** Treat connection refused as "still enabling" and keep polling for up to 30 seconds.
- **`DevToolsActivePort` can also be stale after a hard browser exit.** If `ensure_daemon` keeps erroring with "X's remote-debugging page is open, but DevTools is not live yet on 127.0.0.1:`<port>`" but **no browser process is actually running** and **nothing is listening on `<port>`**, the file is a leftover from a crashed or killed previous launch — the harness reads the dead port and trusts it. Recovery:
  1. Confirm no actual browser is running. Windows: `Get-Process chrome,comet -ErrorAction SilentlyContinue`. POSIX: `pgrep -i 'chrome\|comet'`.
  2. Confirm nothing is listening on the port the error names. Windows: `Get-NetTCPConnection -LocalPort <port> -State Listen -ErrorAction SilentlyContinue`. POSIX: `lsof -iTCP:<port> -sTCP:LISTEN`.
  3. Delete the stale file at the browser's profile root — typically `%LOCALAPPDATA%\Google\Chrome\User Data\DevToolsActivePort` (Windows Chrome), `~/Library/Application Support/Google/Chrome/DevToolsActivePort` (macOS Chrome), or `~/.config/google-chrome/DevToolsActivePort` (Linux Chrome). Same path under the Comet / Edge equivalent for those browsers. To find every stale copy on the box: `find ~ -name DevToolsActivePort -type f 2>/dev/null` (POSIX) or `Get-ChildItem -Path $env:LOCALAPPDATA,$env:APPDATA -Recurse -Filter DevToolsActivePort -ErrorAction SilentlyContinue` (Windows).
  4. Re-run `browser-harness`. The next browser launch regenerates the file with the real port.
  Symptom-vs-cause separator: the error message says "open, but DevTools is not live yet" — but if step 1 shows zero browser processes, the page is *not* actually open. The file is lying. Don't keep clicking Allow on a Chrome window that doesn't exist.
- **Chrome or Comet may open the profile picker before any real tab exists.** If the browser opens both a profile picker and the remote-debugging page, tell the user to choose their normal profile first, then tick the checkbox and click `Allow` if shown.
- **On macOS, if Chrome is already running, prefer AppleScript `open location` over `open -a ... URL`.** It reuses the current profile and avoids creating an extra startup path through the profile picker.
- **If both Chrome and Comet are live, pick one explicitly.** Use `BU_BROWSER=chrome` or `BU_BROWSER=comet` instead of guessing which window the user meant.
- **Omnibox popups are fake `page` targets.** Filter `chrome://omnibox-popup...` and other internals when you need a real tab.
- **CDP target order != Chrome's visible tab-strip order.** Use UI automation when the user means "the first/second tab I can see"; `Target.activateTarget` only shows a known target.
- **Default daemon sessions can go stale.** `ensure_real_tab()` re-attaches to a real page.
- **`no close frame received or sent` usually means a stale daemon / websocket.** Restart the daemon once with:
  `uv run python - <<'PY'`
  `from admin import restart_daemon`
  `restart_daemon()`
  `PY`
  before assuming setup is wrong.
- **If `restart_daemon()` also hangs**, kill the chosen browser entirely, clean sockets (`rm -f /tmp/bu-default.sock /tmp/bu-default.pid`), reopen it, wait 5s, then reconnect. This resets all CDP state.
- **Browser Use API is camelCase on the wire.** `cdpUrl`, `proxyCountryCode`, etc.
- **Remote `cdpUrl` is HTTPS, not ws.** Resolve the websocket URL via `/json/version`.
- **Stop cloud browsers with `PATCH /browsers/{id}` + `{\"action\":\"stop\"}`.**
- **After every meaningful action, re-screenshot before assuming it worked.** Use the image to verify changed state, open menus, navigation, visible errors, and whether the page is in the state you expected.
- **Use screenshots to drive exploration.** They are often the fastest way to find the next click target, notice hidden blockers, and decide if a selector is even worth writing.
- **Prefer compositor-level actions over framework hacks.** Try screenshots, coordinate clicks, and raw key input before adding DOM-specific workarounds.
- **If you need framework-specific DOM tricks, check `interaction-skills/` first.** That is where dropdown, dialog, iframe, shadow DOM, and form-specific guidance belongs.

## Interaction notes

- `interaction-skills/` holds reusable UI mechanics such as dialogs, tabs, dropdowns, iframes, and uploads.
- `domain-skills/` holds site-specific workflows and should be updated when you discover reusable patterns for a website.
