# Troubleshooting (common errors and fixes)

Match the user's symptom to a row, apply the fix, rebuild, and have them re-run.
Most runtime errors show in the console (`references/figma-desktop-app.md`).

## Runtime errors

| Symptom / console message | Cause | Fix |
|---|---|---|
| `Cannot write to node with unloaded font "…"` | Set text before loading its font. | `await figma.loadFontAsync(fontName)` before setting `.characters`/`.fontSize`/`.fontName`. For existing text, load all fonts via `getRangeAllFontNames` + `Promise.all`. See `writing-plugin-code.md`. |
| Nothing happens / values are `undefined` / "promise" in logs | Missing `await` on an `*Async` call. | Add `await`. The function holding it must be `async`. |
| Plugin shows a perpetual "Running…" toast | `figma.closePlugin()` never called (run-once), or called too early so work was cut off. | Call `closePlugin()` once, **after** all awaits resolve. |
| `…findAll/findOne is not a function` or "load pages" error on `figma.root` | Document-wide search without loading pages (dynamic-page model). | `await figma.loadAllPagesAsync()` first, or scope the search to a loaded page. |
| `figma.currentPage = …` throws / page nav fails | Sync page APIs under `documentAccess: "dynamic-page"`. | Use `await figma.setCurrentPageAsync(page)` and `await page.loadAsync()`. |
| `Cannot assign to read only property …` on `fills`/`strokes` | Mutating a readonly array in place. | Clone → modify → reassign the whole property. See `writing-plugin-code.md`. |
| `Refused to connect to '…' Content Security Policy` | The domain isn't in `networkAccess.allowedDomains` (or path mismatch). | Add the exact domain/path to the manifest, rebuild, re-import. Remember `…/get` ≠ `…/post`. |
| `fetch is not defined` (in main) | Network call in the main thread. | Move the `fetch` to the UI thread and message the result to main. See `ui-theming-parameters.md`. |
| CORS error on a `fetch` that's allow-listed | The iframe's `null` origin isn't permitted by the server. | Use an endpoint that allows it, or route through a backend proxy. |
| `setTimeout is not defined` (in main) | No timers in the sandbox. | Do timing in the UI thread, or restructure to event-driven code. |

## Build / tooling errors

| Symptom | Cause | Fix |
|---|---|---|
| `node`/`npm` "command not found" | Node not installed or PATH not refreshed. | See `environment-setup.md`; open a new terminal after installing. |
| `esbuild: command not found` / module errors in build | Dependencies not installed. | Run `npm install` in the project folder. |
| `tsc` reports DOM errors in `src/main` (or `figma` errors in `src/ui`) | Wrong tsconfig in scope. | Keep the split tsconfigs; main has no DOM lib, UI has no `@figma` typings. See `bundling-and-typescript.md`. |
| `Cannot find name 'figma'` / `__html__` | `@figma/plugin-typings` not in `typeRoots`. | Ensure `src/main/tsconfig.json` lists `node_modules/@figma` in `typeRoots` and that the package is installed. |
| Build succeeds but Figma runs old code | Looking at stale output, or watch not running. | Run `npm run build` (or keep `npm run watch` on) and re-run the plugin; consider enabling hot reload. |
| UI panel shows static text but buttons/inputs are dead | The inlined `<script>` landed inside an HTML comment in `dist/ui.html`, so it never runs. Usually a stray `</body>`/`</head>` in a comment or copy earlier in `src/ui/ui.html` that the injector matched first. | The template's `build.mjs` injects before the **last** tag occurrence to avoid this; keep that helper. Verify: `grep -qE '<!--.*<script>' dist/ui.html && echo BROKEN \|\| echo OK`. Keep literal closing tags out of comments in `ui.html`. |
| UI opens but never receives the first message / initial state missing | The main thread posted to the UI before the iframe attached its listener (a race). | Use the `ui-ready` handshake: the UI sends `{ type: "ui-ready" }` once listening, and main sends initial state only in response. See `ui-theming-parameters.md`. |
| `dist/ui.html` is blank / script missing | UI build didn't inline, or `ui.html` lacks `</head>`/`</body>` for injection. | Confirm `src/ui/ui.html` has both tags; re-run `npm run build`. |

## Import / run errors (in Figma)

| Symptom | Cause | Fix |
|---|---|---|
| No "Development" menu | Using browser Figma. | Use the **desktop app**. |
| Import fails immediately | `manifest.json` JSON syntax error, or `main`/`ui` point to missing files. | Fix JSON; run `npm run build` so `dist/` files exist; re-import. |
| Plugin missing from the menu for this file | `editorType` doesn't include this editor. | Add the editor (e.g. `["figma","figjam"]`) and re-import. |
| UI doesn't match light/dark theme | `themeColors` off, or hardcoded colors. | `figma.showUI(__html__, { themeColors: true })` and use `--figma-color-*` variables. |

## Security check failures

| Symptom | Fix |
|---|---|
| `npm run check:secrets` flags a value | Don't commit. Move it to `clientStorage`/backend, remove the literal, rerun. If already committed earlier, **rotate the credential** and scrub history. See `security.md`. |
| Pre-commit hook didn't run | Run `git config core.hooksPath hooks` and `chmod +x hooks/pre-commit`. |

When a fix isn't here, read the relevant reference file, then the live docs at
<https://developers.figma.com/docs/plugins/>. Reproduce, read the console, and
change one thing at a time.
