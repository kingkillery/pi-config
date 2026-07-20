---
name: browser-harness-medium
description: Medium.com domain reference for the browser-harness skill - URL patterns, import workflow, and draft management. Loaded by browser-harness when working on Medium.com pages.
---

# Medium (medium.com)

## URL patterns

- New story: `https://medium.com/new-story`
- Import story: `https://medium.com/p/import`
- Draft edit: `https://medium.com/p/<id>/edit`
- Story URL: `https://medium.com/@<user>/<slug>-<id>`

## Import workflow (RECOMMENDED)

Medium's import feature is the **most reliable way** to create formatted posts. Import from a publicly accessible URL.

1. Navigate to `https://medium.com/p/import`
2. The URL input is a **contenteditable div** with class `js-importUrl` (NOT a regular input)
3. Focus it with `document.querySelector('.js-importUrl').focus()` then `click()`
4. Clear with `document.execCommand('selectAll'); document.execCommand('delete');`
5. Type URL with `document.execCommand('insertText', false, url)`
6. Submit with `press_key("Enter")` — the Import button is at approximately (909, 456)
7. Medium creates a draft and redirects to `/p/<id>/edit`

**Important:** The source URL must return valid HTML with proper `<title>`, `<h1>`, `<p>`, `<h2>`, `<h3>`, `<ul>`, `<ol>`, `<blockquote>`, `<a>` tags. Medium's importer parses these into its editor format.

## Editor gotchas

- **Medium uses a React-based contenteditable editor** that tracks state internally. Direct DOM manipulation (`innerHTML`, `insertNode`, `insertHTML`) is **silently ignored** — changes appear in the DOM briefly but are reverted by React's state management.
- `document.execCommand('insertText')` works for **plain text** input in Medium's editor.
- `document.execCommand('insertHTML')` reports success but **content is discarded** by Medium's state model.
- `document.execCommand('paste')` returns `false` — browsers block programmatic paste for security.
- `navigator.clipboard.write()` + Ctrl+V paste: clipboard write works when document is focused, but CDP `Input.dispatchKeyEvent` for Ctrl+V does not trigger a real browser paste. Only actual keyboard input triggers paste.
- **Never use `selectAll`** in Medium's editor — it selects the entire story, not just the current paragraph.
- **The title suffix**: Medium imports the page `<title>` as the story title. If your page title includes a site name suffix like `" | Traffic Teardown"`, it appears in the Medium title. Fix this manually (triple-click the suffix, delete).

## Reliable approaches (ranked)

1. **URL Import** — best for full articles. Serve your article as HTML, import the URL.
2. **`execCommand('insertText')`** paragraph by paragraph — works for plain text, but no formatting (no bold, italic, links, lists). Medium treats each `Enter` as a new paragraph.
3. **Manual editing** — for title fixes and small adjustments.

## Editor element selectors

- Title: `[data-testid="editorTitleParagraph"]` or `.graf--title` or `.graf--h3.graf--leading`
- Subtitle: `.graf--subtitle` or `.graf--h4` after title
- Body paragraphs: `.graf--p`
- Headers: `.graf--h2`, `.graf--h3`
- Blockquotes: `.graf--blockquote`
- List items: `.graf--li`
- Import URL input: `.js-importUrl`

## Document focus

`navigator.clipboard.write()` requires document focus. Before clipboard operations:
1. Call `cdp("Page.bringToFront")`
2. Click somewhere on the page with `click(x, y)`
3. Then do the clipboard operation

## Draft management

- Multiple imports create multiple drafts. Check tabs with `list_tabs()` for `/p/<id>/edit` URLs.
- Drafts are auto-saved. No need to manually save.
- To publish, use the "Publish" button in the editor header.