# Security by default

A non-technical owner can't easily spot a leaked credential, so the skill makes
safety automatic and explains it plainly. Read this before any work involving
tokens, APIs, or committing code.

## The one threat model to internalize

**A published plugin's bundle is shipped to every user and is fully
inspectable.** Anything you put in `dist/code.js`, `dist/ui.html`, or
`manifest.json` is effectively public. So:

> **Never put a secret (API key, client secret, password, private token) in the
> plugin code, the UI, or the manifest.** There is no such thing as "hidden" in
> a shipped plugin.

Explain it to the user like this: *"A plugin is like a printed recipe we hand
out — anyone can read every line. So we never write passwords on the recipe; we
keep them in a locked drawer (the user's device or our server) instead."*

## Where secrets are allowed to live (in priority order)

This mirrors standard org security policy — an API key is the **last resort**,
only after every alternative is ruled out:

1. **Environment variables** loaded from the host (for any backend you build).
2. **A secrets manager** (AWS Secrets Manager, HashiCorp Vault, GCP Secret
   Manager, Azure Key Vault).
3. **OAuth / service-account credentials** (see the OAuth pattern below).
4. **IAM roles / instance profiles** for cloud backends.
5. **SDK-native / credential-helper auth** (e.g. Application Default Credentials).
6. **A raw API key** — only if 1–5 are genuinely impossible. If so: never
   hardcode it; load it from an environment variable or secrets manager on a
   **backend**, and keep the file out of git.

For data that legitimately belongs on the user's machine — their *own* login
token, their preferences — use **`figma.clientStorage`** at runtime. It's
per-user, per-device, not synced, and never part of the bundle. It is private
but not encrypted, so it's right for "this user's own token," wrong for "a
secret the user shouldn't see."

**Never** store secrets in `node.setPluginData` / `setSharedPluginData` /
`figma.root.setPluginData` — those are saved inside the file and sync to every
collaborator (and shared plugin data is readable by any plugin).

## If the plugin needs to authenticate to a service (OAuth)

Plugins can't safely hold a client secret, so use a backend:

1. The UI opens the provider's login page in an external browser window.
2. Your **backend** does the token exchange (it holds the client secret, over
   **HTTPS**, using **PKCE** when available).
3. The plugin polls a backend endpoint to retrieve the resulting access token,
   then stores *that token* in `figma.clientStorage`.
4. Lock down CORS on your backend so other plugins can't call your endpoints.

The client secret stays on the server, loaded from an env var / secrets manager
— never in the plugin.

## Network access is allow-listed

`manifest.networkAccess.allowedDomains` is enforced by Content-Security-Policy.
Least privilege:
- Default `["none"]` (the template default).
- Otherwise list the **exact** domains/paths the plugin calls. Avoid `"*"`
  (it requires a `reasoning` string and is scrutinized in review).
- The UI iframe has a **`null` origin**, so requests are subject to CORS — the
  endpoint must allow it, or route through a backend you control. Details:
  `references/manifest.md`.

## Keeping secrets out of git (automatic)

The template wires up three layers:

1. **`.gitignore`** excludes `.env`, `.env.*` (except `.env.example`),
   `node_modules/`, and `dist/`. So local-only config in a `.env` file is never
   committed. `.env.example` (placeholders only) *is* committed as a template.
2. **`scripts/check-secrets.mjs`** scans git-tracked files for credential
   patterns (Figma tokens, cloud keys, private-key blocks, JWTs, and
   suspicious `secret = "…"` assignments) and for an accidentally-tracked
   `.env`. Run it with `npm run check:secrets`. It exits non-zero on a finding.
3. **A pre-commit hook** (`hooks/pre-commit`, enabled with
   `git config core.hooksPath hooks`) runs the scanner on **staged** files
   before every commit, so a secret is blocked before it can be recorded.

Always run `npm run check` (typecheck + secret scan) before committing, and tell
the user it passed.

## What to do when the scanner flags something

1. **Stop. Do not commit.**
2. Identify the value. Move it to the right place:
   - a user's own token → `figma.clientStorage` (runtime, not in source);
   - a server secret → a backend env var / secrets manager;
   - local-only config → a `.env` file (already gitignored).
3. Remove the literal from the source file.
4. **If it was already committed in a previous commit,** the secret is in git
   history — tell the user to **rotate/revoke that credential immediately**
   (the safest fix), and offer to help scrub history (e.g. `git filter-repo`).
5. Re-run `npm run check:secrets` to confirm it's clean.
6. Explain, kindly, what was caught and why it mattered.

## Quick do/don't

- ✅ `const token = await figma.clientStorage.getAsync("token")`
- ✅ secrets on a backend, loaded from env vars / a secrets manager
- ✅ `networkAccess.allowedDomains` as narrow as possible
- ❌ `const API_KEY = "…"` anywhere in `src/`
- ❌ committing a `.env` file
- ❌ secrets in `setPluginData` / `setSharedPluginData` / the manifest
- ❌ `allowedDomains: ["*"]` unless truly unavoidable (and then with `reasoning`)
