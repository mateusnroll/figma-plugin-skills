# Bundling and TypeScript

Source: <https://developers.figma.com/docs/plugins/libraries-and-bundling/> and
<https://developers.figma.com/docs/plugins/typescript/>.

## Why bundling is mandatory

Figma loads **exactly one** JavaScript file (the manifest's `main`) for the
sandbox, and **one** HTML file (`ui`) for the iframe. The sandbox has no module
loader — it cannot `require`/`import` other files or npm packages at runtime,
and the UI HTML cannot reference a separate `<script src>` that won't exist.

So to write a real plugin (multiple files and/or npm libraries) you must
**bundle**: compile all your source files into a single `dist/code.js`, and
inline all the UI's JS/CSS into a single self-contained `dist/ui.html`. This is
why the skill *always* produces a bundled, multi-file project — it's both the
documented best practice and the only way to keep code maintainable.

The official docs demonstrate two bundlers: **webpack** (the `webpack-react`
sample) and **esbuild** (the `esbuild-react` sample) in
<https://github.com/figma/plugin-samples>. The template uses **esbuild** because
it's fast and needs the least configuration — ideal for a non-technical owner.

## How the template builds (`build.mjs`)

The template ships a small, dependency-light esbuild script. It produces the two
artifacts the manifest points at:

1. **Main thread:** bundles `src/main/code.ts` (and everything it imports) into
   `dist/code.js`.
2. **UI:** bundles `src/ui/ui.ts` (+ its `import "./ui.css"`) in memory, then
   injects the JS and CSS into `src/ui/ui.html` to write a single
   `dist/ui.html`.

Key points in the script:
- **Two entry points** because there are two runtimes (sandbox vs iframe).
- `target: "es2017"` keeps modern `async`/`await` native while staying safe in
  the sandbox; esbuild down-levels newer syntax automatically.
- The UI build runs with `write: false` so the output stays in memory and an
  `onEnd` hook inlines it into the HTML — that's what makes `dist/ui.html`
  self-contained (required by Figma).
- `--watch` rebuilds on every save (used by `npm run watch`); production builds
  minify.

You rarely need to touch `build.mjs`. To add an npm library, just
`npm install <lib>` and `import` it in your source — esbuild bundles it in.

## Project structure (multi-file by design)

```
<plugin>/
├── manifest.json            # main: dist/code.js, ui: dist/ui.html
├── package.json             # scripts + devDependencies
├── build.mjs                # the esbuild bundler
├── tsconfig.json            # base TS options (editor + shared)
├── .gitignore               # ignores node_modules, dist, .env
├── .env.example             # template for local-only config (never commit .env)
├── CLAUDE.md                # project rules for future Claude Code sessions
├── README.md
├── hooks/pre-commit         # runs the secret scan before each commit
├── scripts/check-secrets.mjs
└── src/
    ├── shared/
    │   └── messages.ts      # the typed message contract (imported by both sides)
    ├── main/                # SANDBOX: has `figma`, no DOM/network
    │   ├── code.ts          # entry: showUI + message router
    │   ├── tsconfig.json    # es2020 lib, @figma typings, NO DOM
    │   ├── commands/        # one module per feature
    │   └── lib/             # helpers (color, storage, nodes…)
    └── ui/                  # IFRAME: has DOM + fetch, no `figma`
        ├── ui.html          # markup; build injects <style>/<script>
        ├── ui.ts            # entry: wire DOM + messenger
        ├── ui.css
        ├── tsconfig.json    # DOM libs, NO @figma typings
        └── lib/             # UI helpers (messenger…)
```

Cross-file imports work normally once bundled:

```ts
// src/main/code.ts
import { createShapes } from "./commands/create-shapes"
import type { UiToMain } from "../shared/messages"
```

Add files freely. Put scene logic under `src/main/`, UI logic under `src/ui/`,
and anything both sides need (types, constants) under `src/shared/`.

## TypeScript

TypeScript catches mistakes (typos, wrong shapes, missing `await`) before the
user ever runs the plugin — strongly recommended by Figma. Setup:

- **Types package:** `@figma/plugin-typings` provides types for the entire
  `figma` API. It installs under `node_modules/@figma`, so tsconfig must list
  that in `typeRoots`. The `figma` global, `__html__`, `SceneNode`, etc. are
  then available **with no import** (they're part of the host environment).
- **Two tsconfigs, because the two runtimes differ.** The sandbox has the
  `figma` global and *no* DOM; the UI has the DOM and *no* `figma`. Splitting
  prevents you from accidentally using `document` in main code or `figma` in UI
  code.

`src/main/tsconfig.json` (sandbox):
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2020"],
    "typeRoots": ["../../node_modules/@figma", "../../node_modules/@types"]
  },
  "include": ["./**/*.ts", "../shared/**/*.ts"]
}
```

`src/ui/tsconfig.json` (iframe):
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["./**/*.ts", "../shared/**/*.ts"]
}
```

esbuild does **not** type-check (it only transpiles), so the
`npm run typecheck` script runs `tsc --noEmit` against both tsconfigs. Run it
before asking the user to test.

## npm scripts (in the template)

| Script | What it does |
|---|---|
| `npm install` | Install the build tools into `node_modules`. |
| `npm run build` | One production build → `dist/code.js` + `dist/ui.html`. |
| `npm run watch` | Rebuild automatically on every save (use while developing). |
| `npm run typecheck` | Type-check both `src/main` and `src/ui` with `tsc`. |
| `npm run check:secrets` | Scan tracked files for credentials. |
| `npm run check` | `typecheck` + `check:secrets` (run before committing). |

## Adding a UI framework (optional)

Vanilla TypeScript keeps the bundle tiny and is plenty for most plugins. If the
user wants React/Preact, add it (`npm install preact`), set `jsx` in the UI
tsconfig, and point esbuild at a `.tsx` UI entry — esbuild handles JSX with no
extra plugin. The official `webpack-react` and `esbuild-react` samples show
full React setups if you need a reference.
