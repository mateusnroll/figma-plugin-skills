# __PLUGIN_NAME__

A Figma plugin, built with [Claude Code](https://claude.com/claude-code) using
the **figma-plugin-builder** skill. You don't need to write code — ask Claude to
make changes and it will edit, build, and guide you.

## What's here

```
src/
  shared/messages.ts   Typed messages exchanged between the two halves
  main/                Runs in Figma's sandbox (the `figma` API; no network)
  ui/                  The panel (an iframe with the DOM and `fetch`)
build.mjs              Bundles src/ into dist/code.js + dist/ui.html (esbuild)
manifest.json          The plugin definition Figma reads
```

## Develop

```sh
npm install        # once, to download the build tools
npm run watch      # rebuild automatically while you work
```

Then, in the **Figma desktop app**:

1. **First time only:** Plugins → Development → **Import plugin from manifest…**
   and choose this folder's `manifest.json`.
2. Run it: Plugins → Development → **__PLUGIN_NAME__**.
3. See logs/errors: Plugins → Development → **Open console…** (⌥⌘I).

## Before committing

```sh
npm run check      # type-check + scan for accidentally-included secrets
```

A pre-commit hook runs the secret scan automatically. Enable it once with:

```sh
git config core.hooksPath hooks
```

## Security

A published plugin's code is visible to everyone who installs it. **Never put
real secrets (API keys, passwords, tokens) in the code, the UI, or the
manifest.** Keep a user's own token in `figma.clientStorage` at runtime and any
server secret on a backend. Never commit `.env`. Details:
`.claude/skills/figma-plugin-builder/references/security.md`.

## Publish

Ask Claude to walk you through publishing, or see
`.claude/skills/figma-plugin-builder/references/publishing.md`.
