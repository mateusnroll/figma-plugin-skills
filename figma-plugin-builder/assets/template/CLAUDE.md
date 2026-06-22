# __PLUGIN_NAME__ — project guide for Claude Code

This is a Figma plugin owned by a designer who is **not** a developer. Do the
technical work for them and explain things in plain language. A full copy of the
authoring skill lives in **`.claude/skills/figma-plugin-builder/`** — read its
`SKILL.md` and `references/` before non-trivial changes; they contain verified
Figma API details and the workflow.

## What this project is

A bundled, multi-file **TypeScript** Figma plugin. Source lives in `src/`; the
build produces the two files Figma actually loads: `dist/code.js` and
`dist/ui.html`.

## Architecture (never break these)

- **Two threads.** `src/main/` (the sandbox) has the global `figma` API but no
  DOM and no network. `src/ui/` (an iframe) has the DOM and `fetch` but cannot
  touch `figma`. They communicate only through messages.
- **Network only in the UI.** Any `fetch` happens in `src/ui/`; results are sent
  to `src/main/` to change the document.
- **Typed messages.** Every message is declared in `src/shared/messages.ts` and
  imported by both sides. Add to those unions when you add features.

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install build tools (first time / after pulling). |
| `npm run watch` | Rebuild on every save while developing. |
| `npm run build` | One production build. |
| `npm run typecheck` | Type-check both threads. |
| `npm run check` | Typecheck + secret scan (run before every commit). |

After a change, the user re-runs the plugin in the Figma desktop app:
**Plugins → Development → __PLUGIN_NAME__**. First time only, import it:
**Plugins → Development → Import plugin from manifest…** → pick `manifest.json`.

## Golden rules (these prevent the most common crashes)

1. Always `await` anything ending in `Async`; never `figma.closePlugin()`
   before awaited work finishes.
2. `await figma.loadFontAsync(...)` **before** setting any text property.
3. Keep `documentAccess: "dynamic-page"` in the manifest and use the async page
   APIs (`getNodeByIdAsync`, `loadAllPagesAsync`, `setCurrentPageAsync`).
4. `fills`/`strokes` on existing nodes are readonly — clone, edit, reassign.
5. Keep `figma.showUI(__html__, { themeColors: true })` and style with
   `--figma-color-*` variables.
6. Declare `networkAccess` narrowly (default `["none"]`).

## Security (non-negotiable)

- **Never** put a secret (API key, client secret, password, token) in the code,
  the UI, or `manifest.json` — the published bundle ships to every user and is
  fully readable.
- A user's own token → `figma.clientStorage` at runtime. Server secrets → a
  backend (env vars / a secrets manager). Local-only config → `.env` (gitignored).
- **Never** commit `.env`. Run `npm run check:secrets` before committing; a
  pre-commit hook also blocks secrets. If a secret was ever committed, rotate it.
- See `.claude/skills/figma-plugin-builder/references/security.md`.

## Publishing

Follow `.claude/skills/figma-plugin-builder/references/publishing.md`. Remember:
Generate ID into `manifest.json`, icon **128×128**, cover **1920×1080**.
