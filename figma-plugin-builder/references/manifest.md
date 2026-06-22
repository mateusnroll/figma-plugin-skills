# The plugin manifest (`manifest.json`)

Source: <https://developers.figma.com/docs/plugins/manifest/>.

`manifest.json` is the plugin's definition file. Figma reads it to know what to
run, where it appears, and what it's allowed to do.

## Required fields

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name in the Plugins menu. |
| `id` | string | Assigned by Figma. Click **Generate ID** in the publish dialog and paste it here. A placeholder string is fine for local development. |
| `api` | string | Plugin API version, e.g. `"1.0.0"`. Use the latest. |
| `main` | string | Path to the compiled main-thread file. The template uses `"dist/code.js"`. |
| `editorType` | string[] | Any of `"figma"`, `"figjam"`, `"dev"`, `"slides"`. `"figjam"` and `"dev"` can't be combined with others; `["figma","figjam"]` is allowed. |
| `documentAccess` | string | Always `"dynamic-page"` for new plugins. Omitting it forces slow full-document loading and is effectively deprecated. |

## Common optional fields

| Field | Type | Notes |
|---|---|---|
| `ui` | string \| object | The UI HTML file (`"dist/ui.html"`), or a `{ name: file }` map for multiple UIs (then use the `__uiFiles__` global). |
| `networkAccess` | object | Declares allowed domains. **Always include it.** See below. |
| `permissions` | string[] | Gated capabilities: `"currentuser"`, `"activeusers"`, `"fileusers"`, `"teamlibrary"`, `"payments"`. Request only what you use. |
| `menu` | array | Submenu items: `{ "name", "command" }`, `{ "separator": true }`, or a nested `{ "name", "menu": [...] }`. |
| `parameters` | array | Quick-action inputs. Each: `{ "name", "key", "description"?, "allowFreeform"?, "optional"? }`. See `references/ui-theming-parameters.md`. |
| `parameterOnly` | boolean | If `true` (the default when `parameters` exist), the plugin can launch *only* through the parameter flow. Set `false` to also allow a normal launch. |
| `relaunchButtons` | array | Buttons shown on nodes via `setRelaunchData`: `{ "command", "name", "multipleSelection"? }`. |
| `capabilities` | string[] | `"textreview"`, `"codegen"`, `"inspect"`, `"vscode"`. |
| `codegenLanguages` / `codegenPreferences` | array | Required/used by Dev Mode codegen plugins. |
| `enableProposedApi` | boolean | Dev only — **does not work in published plugins.** Never ship it. |
| `build` | string | Experimental shell command Figma runs before loading the plugin. |

## `networkAccess` (security-critical)

```json
"networkAccess": {
  "allowedDomains": ["none"],
  "reasoning": "Only required if you use a wildcard or a localhost server.",
  "devAllowedDomains": ["http://localhost:3000"]
}
```

- `allowedDomains` is **required** when `networkAccess` is present.
  - `["none"]` — no network at all. **This is the default the template ships
    with; keep it unless the plugin truly calls out.**
  - `["*"]` — any domain. **Requires** a `reasoning` string and looks bad in
    review. Avoid.
  - Specific entries: `"api.example.com"`, a wildcard subdomain
    `"*.example.com"`, a granular path `"api.example.com/v1/icons"`, or
    explicit schemes (`http`, `https`, `ws`, `wss`).
- `reasoning` — required when using `"*"` or listing localhost in production.
  It is shown to reviewers and users.
- `devAllowedDomains` — domains allowed only during development (e.g. a local
  server), not in the published build.
- Enforced via Content-Security-Policy. A blocked call fails with "Refused to
  connect to '…' because it violates the … Content Security Policy directive."
  Note that allowing `api.example.com/get` does **not** allow `…/post` — be
  precise. More in `references/security.md`.

## Minimal manifest (no network, single UI, Figma design)

```json
{
  "name": "__PLUGIN_NAME__",
  "id": "PLACEHOLDER_GENERATE_ID_BEFORE_PUBLISH",
  "api": "1.0.0",
  "editorType": ["figma"],
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "documentAccess": "dynamic-page",
  "networkAccess": { "allowedDomains": ["none"] }
}
```

## Fuller example (menu + parameters + scoped network)

```json
{
  "name": "Icon Inserter",
  "id": "PLACEHOLDER_GENERATE_ID_BEFORE_PUBLISH",
  "api": "1.0.0",
  "editorType": ["figma", "figjam"],
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "documentAccess": "dynamic-page",
  "networkAccess": {
    "allowedDomains": ["https://icons.example.com"],
    "reasoning": "Fetches icon SVGs from the icon CDN."
  },
  "permissions": ["currentuser"],
  "menu": [
    { "name": "Insert icon", "command": "insert" },
    { "separator": true },
    { "name": "Settings", "command": "settings" }
  ],
  "parameters": [
    { "name": "Icon name", "key": "icon", "allowFreeform": true }
  ],
  "parameterOnly": false
}
```

## Checklist before publishing

- [ ] Real `id` generated and pasted (Phase 7).
- [ ] `api` set to the latest version.
- [ ] `editorType` matches where the plugin should appear.
- [ ] `documentAccess: "dynamic-page"` present.
- [ ] `networkAccess` present and as narrow as possible.
- [ ] No `enableProposedApi`.
- [ ] `permissions` limited to what's actually used.
