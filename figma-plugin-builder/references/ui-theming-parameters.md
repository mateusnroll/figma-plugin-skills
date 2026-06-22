# UI, message passing, theming, and parameters

The UI thread (`src/ui/`) is a sandboxed iframe with the DOM and `fetch`. It
talks to the main thread by messages. Sources: creating-ui, css-variables,
plugin-parameters under <https://developers.figma.com/docs/plugins/>.

## Showing the UI

```ts
figma.showUI(__html__, {
  themeColors: true,   // strongly recommended — see Theming below
  width: 280,          // default 300, min 70
  height: 320,         // default 200, min 0
  title: "My Plugin",  // header text; defaults to the plugin name
  visible: true,       // start shown; toggle later with figma.ui.show()/hide()
})
```

- `__html__` is a magic global holding the contents of the manifest's `ui` file.
- For multiple UI files, set `ui` to a `{ name: file }` map in the manifest and
  use `__uiFiles__.main`, etc.
- `position: { x, y }` (canvas coords) is also available.

### `figma.ui` methods (main side)

`show()`, `hide()` (keeps running — handy for background fetches),
`resize(w, h)`, `reposition(x, y)`, `getPosition()`, `close()` (destroys the
iframe; the plugin keeps running until `figma.closePlugin()`),
`postMessage(payload)`, `onmessage = handler`, and the
`on('message', cb)` / `once(...)` / `off(...)` variants.

### Resize-to-content pattern

```ts
// UI: measure and ask main to resize
const h = Math.ceil(document.body.getBoundingClientRect().height)
parent.postMessage({ pluginMessage: { type: "resize", height: h } }, "*")
// main:
case "resize": figma.ui.resize(msg.width ?? 280, msg.height); break
```

## Message passing — use a typed contract

Define every message in `src/shared/messages.ts` as a discriminated union, then
`switch` on `type`. This is the backbone of a maintainable plugin.

```ts
// src/shared/messages.ts
export type UiToMain =
  | { type: "create-shapes"; shape: ShapeKind; count: number; color: string }
  | { type: "cancel" }

export type MainToUi =
  | { type: "init"; settings: Settings }
  | { type: "created"; count: number }
```

Wrap the raw `postMessage` asymmetry (see `plugin-architecture.md`) in a tiny
typed helper so the rest of the UI code stays clean:

```ts
// src/ui/lib/messenger.ts
import type { UiToMain, MainToUi } from "../../shared/messages"

export function send(msg: UiToMain) {
  parent.postMessage({ pluginMessage: msg }, "*")
}
export function onMessage(handler: (msg: MainToUi) => void) {
  window.onmessage = (e: MessageEvent) => handler(e.data.pluginMessage)
}
```

On the main side, type the handler against `UiToMain` and `switch`:

```ts
figma.ui.onmessage = async (msg: UiToMain) => {
  switch (msg.type) {
    case "create-shapes": /* ... */ break
    case "cancel": figma.closePlugin(); break
  }
}
```

### Send initial state with a "ready" handshake

`figma.showUI()` returns immediately, but the iframe loads and attaches its
`window.onmessage` listener a moment later. If the main thread posts a message
**synchronously** right after `showUI()`, the UI may not be listening yet and the
message is silently dropped. Don't rely on timing.

The robust pattern: the UI sends a `ui-ready` message once its listener is wired
up, and the main thread sends initial state only in response.

```ts
// UI (after onMessage(...) is set):
send({ type: "ui-ready" })
```
```ts
// main:
figma.ui.onmessage = async (msg: UiToMain) => {
  if (msg.type === "ui-ready") {
    const settings = await loadSettings()
    figma.ui.postMessage({ type: "init", settings })
  }
  // ...other cases
}
```

The template uses exactly this handshake. (An `await` before the first send
happens to hide the race, but new code that removes the await would hit it —
prefer the handshake so initial state is never dropped.)

## Theming (make it look native)

Pass `themeColors: true` to `showUI`. Figma then:
- adds a `figma-light` or `figma-dark` class to `<html>`, and
- injects all `--figma-color-*` CSS variables, updating live when the user
  switches themes.

**Style with the variables** and light/dark works for free:

```css
body {
  font-family: Inter, sans-serif;
  font-size: 11px;                 /* Figma UI base size */
  margin: 0; padding: 12px;
  background: var(--figma-color-bg);
  color: var(--figma-color-text);
}
button.brand {
  background: var(--figma-color-bg-brand);
  color: var(--figma-color-text-onbrand);
  border: 0; border-radius: 6px; padding: 6px 12px; cursor: pointer;
}
button.brand:hover { background: var(--figma-color-bg-brand-hover); }
input, select {
  background: var(--figma-color-bg);
  color: var(--figma-color-text);
  border: 1px solid var(--figma-color-border);
  border-radius: 4px; padding: 4px 6px;
}
```

**Starter token set** (there are dozens; these cover most UIs):
`--figma-color-bg`, `--figma-color-bg-secondary`, `--figma-color-bg-hover`,
`--figma-color-bg-brand`, `--figma-color-bg-brand-hover`, `--figma-color-text`,
`--figma-color-text-secondary`, `--figma-color-text-onbrand`,
`--figma-color-border`, `--figma-color-icon`. The naming system is
`--figma-color-{bg|border|icon|text}[-role][-variant][-state]` (roles include
`brand`, `danger`, `success`, `warning`, `selected`, `disabled`, `secondary`,
`on*`; states include `hover`, `pressed`).

Notes:
- For fully custom per-theme styles, branch on the class: `.figma-dark body { … }`.
- **FigJam has no dark mode** — you only get FigJam light-mode variables there.
- **Do not** use `themeColors` if the UI navigates to an external URL.

For richer, ready-made native-looking components without hand-writing CSS, the
community library **Create Figma Plugin** (`@create-figma-plugin/ui`, Preact)
is a good option — mention it if the user wants a polished UI fast. It is not an
official Figma package.

## Networking from the UI (the only place `fetch` works)

```ts
// src/ui/... — runs in the iframe (browser context)
async function loadIcon(url: string) {
  const res = await fetch(url)                 // domain must be in networkAccess
  const bytes = new Uint8Array(await res.arrayBuffer())
  parent.postMessage({ pluginMessage: { type: "icon-bytes", bytes } }, "*")
}
```
```ts
// main — receives bytes, creates the image, no network needed
case "icon-bytes": {
  const image = figma.createImage(msg.bytes)
  const rect = figma.createRectangle()
  rect.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }]
  break
}
```

The iframe has a **`null` origin**, so it is subject to CORS — the endpoint must
allow it (`Access-Control-Allow-Origin: *`) or you need a backend proxy. Keep
secrets out of the UI bundle (see `references/security.md`).

## Plugin parameters (no-UI "quick actions")

For tools that just need a few typed inputs, skip the iframe entirely. Declare
parameters in the manifest:

```json
"parameters": [
  { "name": "Icon name", "key": "icon" },
  { "name": "Size", "key": "size", "allowFreeform": true },
  { "name": "Color", "key": "color", "allowFreeform": true, "optional": true }
],
"parameterOnly": false
```

Respond to input (fires on every keystroke) with suggestions, then do the work
on `run`:

```ts
figma.parameters.on("input", ({ key, query, result }) => {
  if (key === "icon") {
    const all = ["menu", "settings", "search", "logout"]
    result.setSuggestions(all.filter((s) => s.includes(query)))
  }
})

figma.on("run", ({ parameters }) => {
  if (!parameters) return              // launched without the parameter flow
  insertIcon(parameters.icon, parameters.size, parameters.color)
  figma.closePlugin()
})
```

- `result.setSuggestions([...])` — items are strings or `{ name, data?, icon? }`.
- `result.setError("…")` — block progress (not available on `allowFreeform`).
- `result.setLoadingMessage("…")` — while you fetch/compute suggestions.
- `parameterOnly` defaults to `true` (launch only via the parameter bar); set
  `false` to also allow a normal menu launch.
