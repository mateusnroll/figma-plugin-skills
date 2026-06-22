# Figma Plugin Builder — a Claude Code skill for designers

Build, run, and **publish real Figma plugins without writing code.** This is a
[Claude Code](https://claude.com/claude-code) **skill**: install it, describe
the plugin you want in plain language, and Claude does the engineering —
scaffolding a proper multi-file TypeScript project, bundling it the way Figma
recommends, walking you click-by-click through the Figma desktop app, and
keeping your secrets out of git automatically.

It's built specifically for **designers who have never opened a terminal**.
Claude runs the commands; you watch, approve, and click the buttons inside
Figma.

> [!NOTE]
> You need the **Figma desktop app** (browser Figma can't load local plugins).
> If you don't have Node.js installed yet, that's fine — the skill detects it
> and helps you install it.

## What it does for you

- 🧰 **Sets up tooling** — checks for Node, npm, and git, and installs anything
  missing, with steps for macOS, Windows, and Linux.
- 🏗️ **Scaffolds a complete plugin** — a real, multi-file TypeScript project that
  bundles to the single `code.js` + self-contained `ui.html` Figma loads,
  following the [official bundling guide](https://developers.figma.com/docs/plugins/libraries-and-bundling/).
- 📐 **Bakes in best practices** — the two-thread architecture, typed messages,
  `documentAccess: "dynamic-page"`, font loading, theme-matched UI, and correct
  async handling — so the plugin doesn't crash in the ways beginners' plugins
  usually do.
- 🪜 **Gives exact Figma steps** — importing, running, opening the console, and
  publishing, as numbered clicks. No documentation required.
- 🔒 **Security by default** — a `.gitignore` that protects `.env`, an automated
  secret scanner, and a pre-commit hook that blocks credentials from ever being
  committed. It explains *why* in plain language.
- 🚀 **Walks you through publishing** to the Figma Community or your organization,
  including the exact asset sizes Figma requires.

## Install

### Option A — the packaged skill (easiest)

1. Download [`figma-plugin-builder.skill`](figma-plugin-builder.skill) from this
   repo.
2. In Claude Code, install it (drag it in, or use your client's "install skill"
   flow). The `.skill` file is just a zip of the [`figma-plugin-builder/`](figma-plugin-builder/)
   folder.

### Option B — from source

Copy the [`figma-plugin-builder/`](figma-plugin-builder/) folder into your
Claude Code skills directory:

```sh
# user-level (available in every project)
mkdir -p ~/.claude/skills
cp -a figma-plugin-builder ~/.claude/skills/

# or project-level (just this repo/project)
mkdir -p .claude/skills
cp -a figma-plugin-builder .claude/skills/
```

## Use it

Open Claude Code and just say what you want, for example:

> "I want a Figma plugin that renames all the selected layers to a sequence like
> Item 1, Item 2, Item 3."

> "Make a FigJam plugin that drops a sticky note with today's date."

> "Build a plugin that fills the selected frame with an image from a URL."

Claude will confirm the idea, set up your computer if needed, scaffold the
project, build it, and tell you exactly how to run it in Figma. When you're
ready, it'll walk you through publishing.

When it scaffolds your plugin it also drops a copy of this skill into your
project's `.claude/skills/` and writes a `CLAUDE.md`, so every future session in
that project keeps following the same best practices.

## What's in this repo

```
figma-plugin-builder/            The skill (open for everyone to read)
├── SKILL.md                     Workflow + the 10 golden rules
├── references/                  Verified, detailed Figma docs the skill reads
│   ├── environment-setup.md     Installing Node/npm/git per OS
│   ├── plugin-architecture.md   How plugins run: the two threads, lifecycle
│   ├── manifest.md              Every manifest field
│   ├── writing-plugin-code.md   The figma scene API: nodes, async, fonts, storage, images
│   ├── ui-theming-parameters.md showUI, message passing, theming, quick actions
│   ├── bundling-and-typescript.md  The build, tsconfig, project structure
│   ├── security.md              Secrets, network access, the scanner
│   ├── figma-desktop-app.md     Importing/running/debugging in the Figma app
│   ├── publishing.md            Publishing step-by-step + asset sizes
│   └── troubleshooting.md       Common errors and fixes
└── assets/template/             The complete starter plugin Claude copies
    ├── src/main/                Sandbox thread (the figma API)
    ├── src/ui/                  The iframe UI (themed, typed messaging)
    ├── src/shared/messages.ts   The typed contract between the two threads
    ├── build.mjs                esbuild bundler → dist/code.js + dist/ui.html
    ├── scripts/check-secrets.mjs  The secret scanner
    ├── hooks/pre-commit         Blocks commits containing secrets
    ├── manifest.json, package.json, tsconfig.json, .gitignore, .env.example
    └── CLAUDE.md, README.md
tools/package_skill.py           Rebuilds figma-plugin-builder.skill (stdlib only)
figma-plugin-builder.skill       The packaged, installable skill
```

The starter template is verified end-to-end: it `npm install`s, builds to the
correct bundled output, type-checks both threads, and its secret scanner +
pre-commit hook are tested to catch real credentials.

## Rebuild the `.skill` file

After editing anything in `figma-plugin-builder/`:

```sh
python3 tools/package_skill.py
```

This validates the skill and writes `figma-plugin-builder.skill` to the repo
root. No third-party Python packages required.

## A note on security

A published Figma plugin's code is downloaded by everyone who installs it, so it
is effectively public. This skill treats secrets accordingly: API keys,
passwords, and tokens never go in the plugin code, the UI, or the manifest. A
user's own login token lives in `figma.clientStorage` at runtime; server
secrets stay on a backend (environment variables or a secrets manager). The
bundled scanner and git hook enforce this so a credential can't slip into your
history by accident. See
[`figma-plugin-builder/references/security.md`](figma-plugin-builder/references/security.md).

## Credits & license

Built on Figma's official [plugin documentation](https://developers.figma.com/docs/plugins/).
Released under the [MIT License](LICENSE). Contributions welcome — open an issue
or PR.
