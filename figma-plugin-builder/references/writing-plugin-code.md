# Writing the plugin code (the `figma` scene API)

This is the main-thread (`src/main/`) side: reading and changing the document.
Sources: accessing-document, editing-properties, async-tasks, working-with-images,
and the clientStorage reference under
<https://developers.figma.com/docs/plugins/>.

## The document is a tree of nodes

- `figma.root` — the `DocumentNode`. Its children are `PageNode`s.
- `figma.currentPage` — the page the user is looking at.
- `SceneNode` — everything on a page (frames, text, rectangles, instances…).
- `figma.currentPage.selection` — a **readonly** array of the selected nodes.

Different node types have different properties, so **guard before accessing**:

```ts
for (const node of figma.currentPage.selection) {
  if ("opacity" in node) node.opacity *= 0.5
}
```

Handle the none / one / many selection cases explicitly.

### Traversal

```ts
const emptyFrames = figma.currentPage.findAll(
  (n) => n.type === "FRAME" && n.children.length === 0,
)
const firstBigText = figma.currentPage.findOne(
  (n) => n.type === "TEXT" && n.characters.length > 100,
)
```

- Prefer `findAllWithCriteria({ types: ["TEXT"] })` over `findAll` when filtering
  by type — it's much faster.
- Set `figma.skipInvisibleInstanceChildren = true` before a document-wide search
  to skip hidden instance internals (big speedup).
- Don't traverse the whole document unless you must.

## Dynamic-page document access (required model)

Because the manifest uses `documentAccess: "dynamic-page"`, pages load on demand
and several APIs are **async**. Rules:

- Look up a node by id: `await figma.getNodeByIdAsync(id)` (not the old sync
  `getNodeById`).
- Navigate pages: `await figma.setCurrentPageAsync(page)` (not assigning
  `figma.currentPage = page`).
- Before touching a page that isn't current, load it: `await page.loadAsync()`.
- To traverse the **whole document** (e.g. `figma.root.findAll(...)`), first
  `await figma.loadAllPagesAsync()`. These `DocumentNode` methods **throw**
  otherwise: `findAll`, `findOne`, `findAllWithCriteria`,
  `findWidgetNodesByWidgetId`, and registering the `documentchange` event.

```ts
await figma.loadAllPagesAsync()
for (const page of figma.root.children) {
  // safe to read page.children now
}
```

## Creating nodes

`figma.create*` calls are **synchronous** and the new node is added to
`figma.currentPage` automatically.

```ts
const rect = figma.createRectangle()
rect.x = 50
rect.y = 50
rect.resize(200, 100)                 // size via resize(), not width/height =
rect.fills = [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }]
```

Others: `createFrame`, `createEllipse`, `createText`, `createLine`,
`createComponent`, `createPolygon`, `createStar`, `createVector`, `createPage`.
Re-parent with `frame.appendChild(node)` or `frame.insertChild(0, node)`.

After creating nodes, it's friendly to reveal them:

```ts
figma.currentPage.selection = nodes
figma.viewport.scrollAndZoomIntoView(nodes)
```

## Editing properties: the readonly-array trap

`fills`, `strokes`, `effects`, and `selection` are **readonly**. You cannot
mutate them in place (`node.fills[0].color.r = 0.5` throws). **Clone, change,
reassign:**

```ts
const fills = clone(node.fills)        // deep copy
fills[0].color = { r: 0.31, g: 0.27, b: 0.9 }
node.fills = fills                     // reassign the whole array
```

For solid colors, Figma's helper avoids hand-cloning:

```ts
if (node.fills[0]?.type === "SOLID") {
  const fills = clone(node.fills)
  fills[0] = figma.util.solidPaint("#4F46E5", fills[0])
  node.fills = fills
}
```

`figma.util.rgb("#4F46E5")` and `figma.util.rgba(...)` convert hex to the
`{ r, g, b }` (0–1) objects Figma expects. When you build a brand-new array (as
in the create example above) no clone is needed — the trap is only about
*mutating an existing* readonly array.

## Text: load fonts first (the #1 crash)

You **must** load a font before setting any property that changes rendered text:

```ts
const text = figma.createText()
await figma.loadFontAsync({ family: "Inter", style: "Regular" })
text.fontName = { family: "Inter", style: "Regular" }
text.characters = "Hello world"
text.fontSize = 18
```

- `loadFontAsync` only loads fonts already available in the Figma editor — it
  does not download fonts from the internet.
- Load each font **once**, not in a loop. For several fonts:
  `await Promise.all(fonts.map(figma.loadFontAsync))`.
- **Editing existing text** that may mix fonts: load every font it uses first.

```ts
const fonts = node.getRangeAllFontNames(0, node.characters.length)
await Promise.all(fonts.map(figma.loadFontAsync))
node.characters = "new text"
```

Forgetting this throws "Cannot write to node with unloaded font…".

## Async rules

- Anything ending in **`Async` must be `await`ed.** Common ones:
  `loadFontAsync`, `loadAllPagesAsync`, `page.loadAsync`, `setCurrentPageAsync`,
  `getNodeByIdAsync`, `getStyleByIdAsync`, `exportAsync`, `createImageAsync`,
  `image.getBytesAsync`, `image.getSizeAsync`, all `figma.clientStorage.*Async`,
  `getLocalVariablesAsync`, the `set*StyleIdAsync` setters.
- **Never `figma.closePlugin()` before your awaits finish** — closing kills
  pending promises. Put `closePlugin()` as the last line of the awaited chain.
- There are **no timers** (`setTimeout`/`setInterval`) in the main thread. If you
  need timing, do it in the UI thread.
- A safe pattern for top-level async work:

```ts
async function run() {
  try {
    await doWork()
  } catch (err) {
    figma.notify("Something went wrong")
    console.error(err)
  } finally {
    figma.closePlugin()
  }
}
run()
```

## Storing data — pick the right place

| Need | Use | Scope |
|---|---|---|
| Per-user prefs, last-used settings, a user's own auth token | `figma.clientStorage` | Local to that user's device, per-plugin, **not** synced. 5 MB. Async. |
| Data attached to a node, private to your plugin | `node.setPluginData(key, value)` | Saved in the file, synced to collaborators. Strings only; ≤100 kB/entry. |
| Data on a node meant for other plugins to read | `node.setSharedPluginData(ns, key, value)` | Same, but any plugin can read it. `ns` ≥3 chars. |
| File-wide settings | `figma.root.setPluginData(key, value)` | Saved in the file, synced. |

```ts
await figma.clientStorage.setAsync("settings", { theme: "dark", count: 3 })
const settings = await figma.clientStorage.getAsync("settings") // undefined if unset
// also: deleteAsync(key), keysAsync()
```

Plugin-data values are strings — `JSON.stringify` / `JSON.parse` for objects.

**Security:** `clientStorage` is private but not encrypted — fine for a user's
own token, never for secrets you want hidden from the user. `setPluginData` /
`setSharedPluginData` live **inside the file and sync to everyone with access**,
so never store secrets there. See `references/security.md`.

## Images

- From a URL (main thread, async; subject to the remote server's CORS):
  ```ts
  const image = await figma.createImageAsync("https://example.com/pic.png")
  const node = figma.createRectangle()
  const { width, height } = await image.getSizeAsync()
  node.resize(width, height)
  node.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }]
  ```
- From raw bytes you already have (sync): `figma.createImage(bytes)` returns an
  `Image`; apply it via the same `imageHash` fill. Formats PNG/JPG/GIF, max
  4096×4096.
- If `createImageAsync` is blocked by CORS, fetch the bytes in the **UI thread**
  and send them to main: UI does `fetch(...) → arrayBuffer → Uint8Array →
  parent.postMessage({ pluginMessage: { type: "image", bytes } }, "*")`, then
  main calls `figma.createImage(bytes)`. See the networking pattern in
  `references/ui-theming-parameters.md`.

## Networking

The main thread has no `fetch`. **All network calls happen in the UI thread**,
gated by the manifest's `networkAccess.allowedDomains`. The UI fetches, then
posts the result to main, which updates the scene. Full pattern + the CORS
"null origin" gotcha are in `references/security.md`.

## Feedback to the user

`figma.notify("Created 3 shapes")` shows a toast. `figma.notify(msg, { error: true })`
styles it as an error. Keep messages short and human.
