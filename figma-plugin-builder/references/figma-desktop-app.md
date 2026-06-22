# Driving the Figma desktop app (give the user exact clicks)

The designer does everything that must happen inside Figma; you do everything
else. Always give **numbered, click-by-click** steps and ask them to report back
what they see. Source: plugin quickstart + debugging guides under
<https://developers.figma.com/docs/plugins/>.

> The **Figma desktop app is required** for development — the browser version
> cannot load a plugin from local files. Download:
> <https://www.figma.com/downloads/>.

## Import the plugin (once per project)

1. Open the **Figma desktop app** and open (or create) a file in the right
   editor — a **Figma design** file, a **FigJam** board, etc., matching the
   plugin's `editorType`.
2. Open the main menu (the Figma logo, top-left) → **Plugins** →
   **Development** → **Import plugin from manifest…**
3. In the file picker, choose the project's **`manifest.json`**.
4. The plugin now appears under **Plugins → Development → <plugin name>**.

If they don't see "Development", they're likely in the browser, not the desktop
app.

## Run the plugin

- Main menu → **Plugins → Development → <plugin name>**, **or**
- Right-click the canvas → **Plugins → Development → <plugin name>**, **or**
- Use the quick-action bar (the search box) and type the plugin name.

For a UI plugin, the panel opens. For a run-once/parameter plugin, it does its
work and closes.

## See logs and errors (the developer console)

When something doesn't work, the console is where the answer is:

1. Main menu → **Plugins → Development → Open console…** (shortcut **⌥⌘I** on
   macOS, **Ctrl+Alt+I** on Windows).
2. Click the **Console** tab.
3. Ask the user to **copy anything in red** and paste it to you. `console.log(...)`
   output from the plugin appears here too.

Tips you can use:
- Add `console.log(value)` in the code to inspect values.
- Add a `debugger;` line to pause execution on that line with devtools open.
- **Plugins → Development → Use Developer VM** runs the plugin in the browser's
  JS engine for fuller devtools — but turn it **off** for final/performance
  testing because timing differs from the real sandbox.

## See your code changes

You rebuild for them; they just re-run:

- Keep `npm run watch` running so the build updates on every save.
- After a change, the user re-runs the plugin (Plugins → Development → name).
- **Hot reload:** in the development plugin's menu there's an option to enable
  hot reload, which auto-restarts the plugin when the build output changes — a
  nice quality-of-life toggle to offer once things are working.

## Common "it won't import/run" causes

- Using browser Figma instead of the desktop app (no "Development" menu).
- `manifest.json` has a syntax error → the import fails. Re-check JSON.
- `main`/`ui` point at files that don't exist yet → run `npm run build` first so
  `dist/code.js` and `dist/ui.html` exist.
- Wrong `editorType` for the open file (e.g. a FigJam-only plugin in a design
  file). See `references/troubleshooting.md`.
