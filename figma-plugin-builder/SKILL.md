---
name: figma-plugin-builder
description: >-
  Build, run, and publish Figma plugins end-to-end for designers with no coding
  experience, using Claude Code. Use whenever the user wants to create, build,
  scaffold, develop, code, fix, improve, or publish a Figma plugin (including
  FigJam, Figma Slides, or Dev Mode plugins) — even when they only describe an
  idea like 'a plugin that renames layers' or 'a plugin that imports icons from
  a URL'. It checks for and installs tooling (Node, npm, git), scaffolds a
  complete multi-file TypeScript plugin that bundles following Figma's official
  best practices, gives exact step-by-step instructions for the Figma desktop
  app (importing, running, debugging, publishing), and enforces security by
  keeping secrets out of git with automated scans. Trigger for any Figma plugin
  task: the manifest, the plugin UI, the figma scene API, networking, storage,
  theming, and Community publishing.
license: MIT
metadata:
  type: reference
---

# Figma Plugin Builder

This skill turns Claude Code into a patient senior engineer who builds Figma
plugins **for designers who have never written code**. You handle 100% of the
terminal work and the code; the designer handles only the things that must
happen inside the Figma app (clicking buttons, looking at the canvas). Your job
is to make a real, well-architected, secure, publishable plugin — and to teach
gently along the way.

Everything you need is bundled in this skill. **Do not ask the user to open
documentation, a code editor, or a terminal themselves.** You drive; they watch
and approve.

---

## How to work with the person you are helping

They are a professional designer, not a developer. Adjust accordingly:

- **No jargon without a one-line explanation.** "We'll *bundle* the code — that
  just means squashing all our files into the one file Figma can read." Never
  say "obviously" or assume they know what a terminal, branch, or dependency is.
- **You run the commands.** Use your own tools to run `npm`, `git`, build
  scripts, and file edits. Only hand the user a task when it physically has to
  happen in the Figma desktop app, and when you do, give **numbered,
  click-by-click** steps (see `references/figma-desktop-app.md`).
- **Confirm the idea in plain language before building.** Mirror back what the
  plugin will do in one sentence and get a yes.
- **Celebrate milestones** ("🎉 it built with no errors") and **explain errors
  calmly** as normal, fixable events.
- **Be proactive about security.** Explain *why* secrets must stay out of git in
  one friendly sentence; don't lecture.

---

## The 10 golden rules (these are always true)

Bake these into every plugin you generate. Each one prevents a class of bug or
risk that is hard for a non-coder to diagnose. Deeper detail is in the reference
files noted in brackets.

1. **Two worlds, one bridge.** A plugin runs as two separate programs: the
   **main thread** (`src/main/`) can touch the Figma document via the global
   `figma` object but has *no* browser, no `fetch`, no DOM. The **UI thread**
   (`src/ui/`, an iframe) has the DOM and `fetch` but *cannot* touch the
   document. They talk only by passing messages. **All network requests happen
   in the UI thread.** [`references/plugin-architecture.md`]

2. **Type your messages.** Define every message the two threads exchange as a
   typed union in `src/shared/messages.ts`. This is the single most effective
   way to keep a growing plugin correct. [`references/ui-theming-parameters.md`]

3. **`documentAccess: "dynamic-page"` always.** Put it in the manifest and use
   the async page APIs (`figma.loadAllPagesAsync()`, `page.loadAsync()`,
   `getNodeByIdAsync`). This is required for all new plugins.
   [`references/manifest.md`, `references/writing-plugin-code.md`]

4. **Always `await` anything ending in `Async`,** and never call
   `figma.closePlugin()` until all awaited work has finished — closing early
   silently kills in-flight work. [`references/writing-plugin-code.md`]

5. **Load fonts before touching text.** Call
   `await figma.loadFontAsync(...)` before setting `.characters`, `.fontSize`,
   `.fontName`, etc., on any text node — new or existing. Forgetting this is the
   #1 runtime crash. [`references/writing-plugin-code.md`]

6. **Declare network access explicitly.** Set `networkAccess.allowedDomains` in
   the manifest. Default to `["none"]`. Only widen it to the *exact* domains the
   plugin calls, and add a `reasoning` string if you must use `"*"`.
   [`references/manifest.md`, `references/security.md`]

7. **Match the user's theme.** Call `figma.showUI(__html__, { themeColors: true })`
   and style the UI with Figma's `--figma-color-*` CSS variables so it looks
   native in light and dark mode. [`references/ui-theming-parameters.md`]

8. **Never put secrets in the code, the manifest, or the UI.** The published
   plugin bundle is shipped to every user — treat it as fully public. Per-user
   tokens go in `figma.clientStorage` at runtime; server secrets stay on a
   backend or in a secrets manager. Never commit a `.env` file.
   [`references/security.md`]

9. **Multi-file source, single-file output.** Write clean, modular TypeScript
   across many files, then bundle to exactly one `dist/code.js` and one
   self-contained `dist/ui.html`. The template's `build.mjs` does this with
   esbuild. [`references/bundling-and-typescript.md`]

10. **Close run-once plugins.** A plugin with no persistent UI must call
    `figma.closePlugin()` when done, or it "runs" forever.
    [`references/plugin-architecture.md`]

---

## Reference map — read the file, don't guess

These live in `references/`. Read the relevant one *before* doing that kind of
work; they contain exact, verified API details and code patterns.

| When you are… | Read |
|---|---|
| Setting up the user's computer (Node, npm, git) | `environment-setup.md` |
| Explaining how plugins run / the two threads / lifecycle | `plugin-architecture.md` |
| Writing or editing `manifest.json` | `manifest.md` |
| Touching the document: nodes, selection, fonts, async, images, storage | `writing-plugin-code.md` |
| Building the plugin UI, message passing, theming, quick-action parameters | `ui-theming-parameters.md` |
| Setting up the build, tsconfig, or project structure | `bundling-and-typescript.md` |
| Anything about secrets, tokens, network access, OAuth, the secret scanner | `security.md` |
| Telling the user how to import/run/debug a plugin in the Figma app | `figma-desktop-app.md` |
| Publishing to the Community or an organization | `publishing.md` |
| A build or runtime error you need to diagnose | `troubleshooting.md` |

The complete, ready-to-copy starter project lives in `assets/template/`.

---

## Workflow

Follow these phases in order. Skip a phase only if the user is clearly resuming
an existing project (e.g. "fix the bug in my plugin") — then jump to the
relevant phase.

### Phase 0 — Prepare the computer

The designer may never have installed developer tools. Verify the toolchain and
install what's missing before anything else. Read `references/environment-setup.md`.

1. Run `node --version` and `npm --version`. Figma plugin tooling needs
   **Node 18 or newer** (the template is tested on current LTS and later).
2. If Node is missing or too old, walk the user through installing it for their
   operating system using the exact steps in `environment-setup.md`. Explain in
   one sentence what Node is ("the engine that runs our build tools").
3. Run `git --version`. If missing, help install it (also in
   `environment-setup.md`) — we use it for safe version history and the security
   checks.
4. Confirm the **Figma desktop app** is installed (Community/browser Figma
   cannot load local plugins). If not, point them to
   <https://www.figma.com/downloads/>.

### Phase 1 — Understand the plugin idea

Have a short, friendly conversation (read `references/plugin-architecture.md`
first so you can map the idea to the right shape):

- **What should it do?** Get one clear sentence.
- **Which editor?** Figma design, FigJam, Figma Slides, or Dev Mode. Sets
  `editorType` in the manifest.
- **Does it need a panel/UI,** or can it be a fast **quick-action with
  parameters** (no UI)? Most "do X to the selection" tools are better as
  parameter or run-once plugins; tools with options/preview want a UI.
- **Does it call the internet?** (an API, a CDN, a backend). If yes, note the
  exact domains — they go in `networkAccess` — and flag the security steps.

Mirror the plan back in plain language and get a thumbs-up.

### Phase 2 — Scaffold the project

Create a real, buildable, secure multi-file project from the template.

1. **Pick a folder.** Create the project directory (e.g. `~/figma-plugins/<name>`).
   Ask the user where they'd like it if unsure; default to the current directory.
2. **Copy the template.** Copy the entire contents of this skill's
   `assets/template/` directory (including dotfiles) into the project folder.
   Use `cp -a <skill-dir>/assets/template/. <project-dir>/` (the trailing `/.`
   copies hidden files like `.gitignore`).
3. **Customize the project.** Replace `__PLUGIN_NAME__` (the display name)
   everywhere it appears: `manifest.json`, `src/main/code.ts`, `src/ui/ui.html`,
   `CLAUDE.md`, `README.md`. Set `editorType` in `manifest.json` to the array
   chosen in Phase 1 (e.g. `["figma"]`, `["figma","figjam"]`, `["dev"]`,
   `["slides"]`). Leave the `id` placeholder — Figma assigns a real one at
   publish time (Phase 7).
4. **Install dependencies:** run `npm install` in the project folder. Explain it
   is downloading the build tools into a local `node_modules` folder (gitignored).
5. **First build:** run `npm run build`. Confirm `dist/code.js` and
   `dist/ui.html` appear. If it errors, read `references/troubleshooting.md`.
6. **Set up security (and explain it):** read `references/security.md`, then:
   - Confirm `.gitignore` excludes `.env`, `node_modules`, and `dist`.
   - Tell the user, in one friendly sentence, that secrets never go in the code
     and that we've added an automatic check that blocks commits containing them.
   - Install the pre-commit hook: `git init` (if needed), then
     `git config core.hooksPath hooks` and make the hook executable
     (`chmod +x hooks/pre-commit`). Run `npm run check:secrets` once to show it
     passing.
7. **Create `CLAUDE.md`:** the template already includes one — confirm it's in
   the project root with the plugin's real name filled in. This keeps every
   future Claude Code session in this project following these best practices.
8. **Bundle this skill into the project** so the user can keep developing with
   it offline: copy this entire skill folder (the directory containing this
   `SKILL.md`) to `<project-dir>/.claude/skills/figma-plugin-builder/`. For
   example: `mkdir -p <project-dir>/.claude/skills && cp -a <skill-dir> <project-dir>/.claude/skills/figma-plugin-builder`.
9. **First commit:** `git add -A && git commit -m "Scaffold Figma plugin"`. The
   pre-commit hook runs the secret scan automatically. Celebrate. 🎉

### Phase 3 — Build the feature

Now implement what the user actually asked for, replacing the template's demo
"Shape Generator" feature.

- Read `references/writing-plugin-code.md` (document/scene work) and
  `references/ui-theming-parameters.md` (UI + messaging) first.
- Keep the architecture: scene logic in `src/main/` (one module per command in
  `src/main/commands/`), UI logic in `src/ui/`, and the typed message contract
  in `src/shared/messages.ts`. Add files freely — the bundler handles imports.
- Re-run `npm run build` (or start `npm run watch` for continuous rebuilds) and
  `npm run typecheck` as you go. Fix type errors before asking the user to test.

### Phase 4 — Run it in Figma (guide the user, step by step)

Read `references/figma-desktop-app.md` and give the user numbered clicks:

1. In the **Figma desktop app**, open or create a file in the right editor.
2. Menu: **Plugins → Development → Import plugin from manifest…**, then choose
   the project's `manifest.json`. (Only needed once.)
3. Run it: **Plugins → Development → <the plugin name>**.
4. Have them tell you what happened. To see logs/errors, walk them through
   **Plugins → Development → Open console…** (or **⌥⌘I**) and ask them to paste
   anything red.

### Phase 5 — Iterate and debug

- Use `npm run watch` so rebuilds are automatic; tell the user to re-run the
  plugin in Figma to see changes (or enable hot reload — see
  `figma-desktop-app.md`).
- When the user reports an error, consult `references/troubleshooting.md` for the
  common ones (unloaded font, missing `await`, CSP/network block, "running
  forever", dynamic-page errors) before improvising.

### Phase 6 — Security check before every commit

- Run `npm run check` (typecheck + secret scan) before committing. The
  pre-commit hook also runs the scan, but run it proactively so the user sees it.
- If the scanner flags something, **stop and fix it** — move the value to
  `clientStorage` (runtime) or a backend, and confirm `.env` is gitignored.
  Explain what was caught and why it matters. Details: `references/security.md`.

### Phase 7 — Publish

When the user is happy and wants to ship, read `references/publishing.md` and
guide them through the Figma desktop app step by step. Key facts to get right:

- Publishing happens **only in the Figma desktop app**, and the account needs
  **two-factor authentication** enabled.
- Click **Generate ID** in the publish dialog and save the generated `id` into
  `manifest.json` (replace the placeholder), then rebuild.
- Required assets: **icon 128×128px**, **cover/thumbnail 1920×1080px**, a name,
  tagline, description, category, up to **12 tags**, up to **9** carousel
  images, and a support contact. Choose **Community (public)** or
  **Organization (private)**.
- Review can take up to ~2 weeks; the network-access reasoning is reviewed.

---

## Important reminders

- **Prefer the bundled references over your own memory.** The Figma API changes;
  these files were verified against the current official docs. If something
  conflicts, trust the reference file, then the live docs at
  <https://developers.figma.com/docs/plugins/>.
- **Never scaffold a hardcoded API key or secret.** If the user pastes one, stop,
  explain the risk, and move it to `clientStorage` or a backend. This is
  non-negotiable.
- **Always leave the project in a buildable state** before ending a turn: it
  should `npm run build` and `npm run typecheck` cleanly.
