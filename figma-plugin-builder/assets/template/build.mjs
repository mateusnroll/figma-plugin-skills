// Bundles the plugin into the two files Figma loads:
//   • dist/code.js  — the main/sandbox thread (everything src/main imports)
//   • dist/ui.html  — the iframe UI, with its JS + CSS inlined into one file
//
// Why bundle? Figma's sandbox loads a single JS file and a single HTML file and
// cannot `import` other files at runtime, so we compile our multi-file source
// down to those two artifacts. See:
// https://developers.figma.com/docs/plugins/libraries-and-bundling/
//
// Usage:  node build.mjs            (one production build, minified)
//         node build.mjs --watch    (rebuild on every save)

import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, "dist");
const watch = process.argv.includes("--watch");
const minify = !watch; // minify production builds; keep dev builds readable

mkdirSync(dist, { recursive: true });

/** Options shared by both bundles. */
const shared = {
  bundle: true,
  // es2017 keeps async/await native (the sandbox supports it) while letting
  // esbuild safely down-level any newer syntax we use.
  target: "es2017",
  minify,
  // Only surface warnings/errors; the script prints its own success lines so a
  // non-developer isn't confused by in-memory output names that never hit disk.
  logLevel: "warning",
};

// --- Main thread (sandbox) -> dist/code.js ---------------------------------
const mainOptions = {
  ...shared,
  entryPoints: [resolve(root, "src/main/code.ts")],
  outfile: resolve(dist, "code.js"),
};

/**
 * Insert `snippet` immediately before the LAST occurrence of `tag` in `html`.
 * Searching from the end (rather than String.replace, which targets the FIRST
 * match) means a comment or copy that merely mentions "</head>"/"</body>"
 * earlier in ui.html can't swallow the injected <style>/<script>.
 */
function injectBefore(html, tag, snippet) {
  const at = html.lastIndexOf(tag);
  if (at === -1) throw new Error(`build: ${tag} not found in src/ui/ui.html`);
  return html.slice(0, at) + snippet + "\n" + html.slice(at);
}

// --- UI iframe -> a single self-contained dist/ui.html ---------------------
// esbuild bundles the UI's JS + CSS in memory; this plugin then injects them
// into src/ui/ui.html so Figma can load one self-contained file.
const inlineUiPlugin = {
  name: "inline-ui-html",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;
      const out = result.outputFiles ?? [];
      const js = out.find((f) => f.path.endsWith(".js"))?.text ?? "";
      const css = out.find((f) => f.path.endsWith(".css"))?.text ?? "";
      const template = readFileSync(resolve(root, "src/ui/ui.html"), "utf8");
      let html = injectBefore(template, "</head>", `<style>\n${css}\n</style>`);
      html = injectBefore(html, "</body>", `<script>\n${js}\n</script>`);
      writeFileSync(resolve(dist, "ui.html"), html);
      console.log("✔ Wrote dist/ui.html");
    });
  },
};

const uiOptions = {
  ...shared,
  entryPoints: [resolve(root, "src/ui/ui.ts")],
  outdir: dist,
  write: false, // keep outputs in memory so the plugin above can inline them
  loader: { ".svg": "dataurl", ".png": "dataurl" },
  plugins: [inlineUiPlugin],
};

if (watch) {
  const mainCtx = await esbuild.context(mainOptions);
  const uiCtx = await esbuild.context(uiOptions);
  await Promise.all([mainCtx.watch(), uiCtx.watch()]);
  console.log("👀 Watching for changes — re-run the plugin in Figma to see them. (Ctrl+C to stop)");
} else {
  await Promise.all([esbuild.build(mainOptions), esbuild.build(uiOptions)]);
  console.log("✅ Build complete → dist/code.js + dist/ui.html");
}
