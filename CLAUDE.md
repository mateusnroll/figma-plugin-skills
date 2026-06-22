# Repo guide for Claude Code (contributors)

This repository **is a Claude Code skill**, not a Figma plugin. The skill helps
non-technical designers build Figma plugins. Keep that audience in mind: the
skill's voice should explain jargon and never assume coding experience.

## Layout

- `figma-plugin-builder/SKILL.md` — the skill's entry point: the workflow and
  the 10 golden rules. Keep it under ~500 lines; push detail into references.
- `figma-plugin-builder/references/*.md` — verified Figma API/process docs the
  skill reads on demand. Each cites its official source URL. Keep them accurate
  against <https://developers.figma.com/docs/plugins/>.
- `figma-plugin-builder/assets/template/` — the starter plugin that gets copied
  into a user's project. It must always stay buildable.
- `tools/package_skill.py` — rebuilds `figma-plugin-builder.skill` (stdlib only).

## Working rules

- **Keep the template green.** After changing anything in `assets/template/`,
  verify it from a clean copy:
  ```sh
  cp -a figma-plugin-builder/assets/template /tmp/t && cd /tmp/t
  npm install && npm run build && npm run typecheck && npm run check:secrets
  ```
  All four must pass. The build must produce `dist/code.js` and a self-contained
  `dist/ui.html`.
- **Don't embed real-looking secrets in any file** (including reference docs and
  the template). The scanner in the template matches patterns like cloud keys
  and tokens; a realistic example string would trip it when the skill is copied
  into a user's repo. Use obvious placeholders and ellipses instead.
- **Repackage after edits:** `python3 tools/package_skill.py`, then commit the
  updated `figma-plugin-builder.skill`.
- **Frontmatter limits** (enforced by the packager and the installer): allowed
  keys are `name, description, license, allowed-tools, metadata, compatibility`;
  `name` is kebab-case (≤64 chars); `description` has no angle brackets (≤1024
  chars).

## Don't

- Don't add a second `SKILL.md` anywhere under `figma-plugin-builder/` — the
  installer rejects multiple. The template uses `CLAUDE.md`, not `SKILL.md`.
- Don't introduce heavy build dependencies into the template; esbuild +
  TypeScript keeps it approachable for a non-developer to own.
