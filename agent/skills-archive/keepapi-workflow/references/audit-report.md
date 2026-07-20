# KeepAPI Workflow Audit Report

Date: 2026-05-14
Skill: keepapi-workflow
Version under audit: v1.1.0

---

## VERIFIED Failures (Direct Evidence)

| # | Failure | Evidence | Root Cause | Status |
|---|---|---|---|---|
| 1 | Direct API auth blocked | gkeepapi.exception.LoginException: BadAuthentication | Google deprecated direct password auth | RESOLVED -- using CDP browser automation |
| 2 | gpsoauth master token failed | BadAuthentication from gpsoauth.perform_master_login() | Same root cause | RESOLVED -- using CDP browser automation |
| 3 | browser_cookie3 DPAPI failure | RuntimeError: Failed to decrypt cipher text with DPAPI | Chrome encrypts cookies with Windows DPAPI | RESOLVED -- using CDP with persistent profile |
| 4 | Profile copy lost auth | Screenshot showed Google sign-in page after copying profile | Chrome profile encryption prevents portable auth | RESOLVED -- using persistent profile directly |
| 5 | PowerShell Unicode corruption | The string is missing the terminator on arrow chars | WriteFile tool wrote UTF-8 but PS parsed as ANSI | RESOLVED -- replaced Unicode with ASCII equivalents |
| 6 | Port 9222 conflict | Test-NetConnection showed port 9222 owned by comet.exe | Perplexity Comet browser uses default Chrome debug port | RESOLVED -- changed default to 9333 |
| 7 | Playwright networkidle timeout | Page.reload: Timeout 30000ms exceeded | Google Keep SPA never reaches networkidle | RESOLVED -- using domcontentloaded instead |
| 8 | Initial selector miss | Found 0 notes with [role='listitem'] | Google Keep uses minified CSS classes | RESOLVED -- added class-agnostic fallback selectors |
| 9 | Textbox-only extraction lost content | MCP note missing URL, Telegram token | URLs and embeds are in <a> tags, not textboxes | RESOLVED -- using innerText for full card content |
| 10 | Composer bar included | Card 0 was Take a note input bar | No filter existed | RESOLVED -- filtering cards starting with Take a note |
| 11 | Masonry duplicates | Same note at y=710, 1251, 1282 | Google Keep renders card in multiple layout positions | RESOLVED -- deduplicating by first 200 chars of innerText |
| 12 | Archive notes not extracted | User said save ALL notes but only main was covered | extract_keep_cdp.py only scraped main view | RESOLVED -- extract_all_keep.py navigates Main, Archive, Trash |
| 13 | Chrome persisted after exit | User reported browser sessions broken | Scripts left Chrome running after completion | RESOLVED -- try/finally cleanup, preflight zombie kill, cleanup-chrome.ps1 |

## INFERRED Risks

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| 1 | Google changes minified CSS classes | High over 6-12 months | 4 fallback selectors tried in priority order |
| 2 | Chrome profile session expires | Medium | Session health check with clear re-auth prompt |
| 3 | Images/attachments ignored | Certain | Documented limitation |
| 4 | List checkbox extraction fragile | Medium | Tested on available list notes |
| 5 | Headless detection by Google | Low | Using real Chrome profile, not headless |

## Design Decisions

### On-Demand Only (NOT Scheduled)

The tool is explicitly designed as a **single-shot, on-demand invocation**.

Rationale:
- Chrome launch/kill per run is expensive (~5s overhead)
- Scheduled tasks would leave Chrome running or require complex lifecycle management
- User explicitly requested: "not scheduled or in a loop. just when someone calls a skill"
- A clean run-exit-run-exit model is simpler, safer, and easier to debug

If a user wants periodic sync, they should invoke the skill explicitly when they remember to, not via background automation.

## Chrome Lifecycle Guarantees

1. **Preflight** -- before ANY launch, check port 9333. If occupied, kill the process.
2. **Launch** -- start hidden Chrome with dedicated profile.
3. **Self-healing** -- if Chrome does not respond within 20s, run cleanup and retry once.
4. **Finally** -- regardless of success/failure, kill Chrome in a finally block.
5. **Post-flight** -- verify no Chrome processes remain using the automation profile.

## Change Control Log

| Version | Date | Patch | Evaluation |
|---|---|---|---|
| v1.1.0 | 2026-05-14 | Added Archive/Trash extraction, source_section frontmatter, extract_all_keep.py, preflight cleanup, self-healing retry, finally-block Chrome kill, cleanup-chrome.ps1 | 16 total notes found (4 main + 12 archive + 0 trash); 12 newly saved; 18.56s duration; 0 zombie Chrome left behind |
