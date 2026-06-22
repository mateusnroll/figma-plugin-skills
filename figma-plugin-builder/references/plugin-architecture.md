# How Figma plugins run (the architecture)

Source: <https://developers.figma.com/docs/plugins/how-plugins-run/> and
<https://developers.figma.com/docs/plugins/creating-ui/>.

Read this before designing a plugin so you map the idea onto the right shape.

## Two execution contexts ("two worlds")

A plugin is **two separate programs** that run at the same time and can only
communicate by passing messages:

### 1. The main thread (sandbox) — `src/main/`, compiled to `dist/code.js`
- Has the global **`figma`** object: the entire scene/document API
  (`figma.currentPage`, `figma.createRectangle()`, variables, styles, etc.).
- Runs modern JavaScript (classes, `async`/`await`, `Map`/`Set`, `Promise`,
  optional chaining, typed arrays, `JSON`, `Math`, `Date`).
- Has a minimal `console`.
- **Does NOT have:** `window`, `document`, the DOM, `fetch`, `XMLHttpRequest`,
  or `setTimeout`/timers. There is **no network and no browser** here.

### 2. The UI thread (iframe) — `src/ui/`, compiled to `dist/ui.html`
- A sandboxed browser window created by `figma.showUI(...)`.
- Has the full DOM and browser APIs, including **`fetch`** — this is the **only**
  place network requests can happen.
- **Cannot** see `figma` or the document at all.

**Design implication:** anything that touches the canvas lives in `main`;
anything that talks to the internet or renders UI lives in `ui`. They cooperate
by sending each other messages.

## The message bridge (exact contract)

**Main → UI:**
```js
// in main (code.ts)
figma.ui.postMessage({ type: "created", count: 5 })
```
```js
// in the UI iframe
window.onmessage = (event) => {
  const msg = event.data.pluginMessage   // note: unwrap .pluginMessage
  // ...
}
```

**UI → Main:**
```js
// in the UI iframe — payload MUST be wrapped in { pluginMessage: ... }
parent.postMessage({ pluginMessage: { type: "create-shapes", count: 5 } }, "*")
```
```js
// in main (code.ts)
figma.ui.onmessage = (msg) => {
  // msg is the unwrapped payload, e.g. { type: "create-shapes", count: 5 }
}
```

The asymmetry trips people up: from the **UI** you wrap outgoing messages in
`{ pluginMessage }` and read incoming ones from `event.data.pluginMessage`; the
**main** side sends/receives the bare object via `figma.ui.postMessage` /
`figma.ui.onmessage`. The template hides this behind a typed `messenger`
(see `references/ui-theming-parameters.md`). Structured data (objects, arrays,
numbers, strings, booleans, `null`, `Date`, `Uint8Array`) crosses the bridge;
functions and class instances do not.

## The three shapes a plugin can take

1. **Run-once (no UI):** do work immediately, then `figma.closePlugin()`. Good
   for "do X to the current selection". Add the menu/relaunch entry in the
   manifest.
2. **Quick action with parameters (no custom UI):** the user types inputs into
   Figma's search/quick-action bar; you respond with suggestions and run on
   submit. Fastest UX for parameterized tools. See
   `references/ui-theming-parameters.md` ("Plugin parameters").
3. **Custom UI panel:** `figma.showUI(__html__, …)` opens an iframe with your
   HTML; it stays open and exchanges messages until `figma.closePlugin()`.
   Good for tools with options, previews, lists, or network calls.

The bundled template is shape #3 (a UI panel) because it demonstrates the most
machinery; collapse it to #1 or #2 when the idea calls for it.

## Lifecycle

- A plugin keeps running until **`figma.closePlugin()`** is called. For a
  run-once plugin, call it when the work finishes. For a UI plugin, call it when
  the user closes/cancels. If you never call it, Figma shows a perpetual
  "Running <plugin>…" toast.
- `figma.closePlugin("Done!")` shows a final notification.
- The user can cancel anytime; Figma then calls `closePlugin()` for you.
- Do **not** call `closePlugin()` before pending `await`s resolve — it kills the
  in-flight work. See `references/writing-plugin-code.md`.

## `editorType` — where the plugin appears

Set in the manifest (`["figma"]`, `["figjam"]`, `["dev"]`, `["slides"]`, and the
combination `["figma","figjam"]`). FigJam and Dev Mode cannot be combined.
`"dev"` = Dev Mode (inspect/codegen plugins). Match the user's intent from
Phase 1. Details: `references/manifest.md`.

## Where to go next

- Manifest fields: `references/manifest.md`
- Scene/document code (nodes, async, fonts, storage, images): `references/writing-plugin-code.md`
- UI, theming, parameters: `references/ui-theming-parameters.md`
- Build/bundle/tsconfig: `references/bundling-and-typescript.md`
