# Publishing a plugin

Guide the user step by step in the **Figma desktop app**. Sources: Figma Help
Center "Publish plugins to the Figma Community" and the developer publishing
checklist under <https://developers.figma.com/docs/plugins/>.

## Before you publish (you handle these)

- The project builds cleanly: `npm run build` produces `dist/code.js` and
  `dist/ui.html`, and `npm run typecheck` passes.
- `npm run check:secrets` passes — no credentials anywhere.
- The manifest is publish-ready (see the checklist in `references/manifest.md`):
  `documentAccess: "dynamic-page"`, a narrow `networkAccess`, no
  `enableProposedApi`, minimal `permissions`, latest `api`.
- Quick readiness pass (Figma's own checklist): the plugin handles an empty
  selection gracefully, doesn't crash on large/edge-case documents, and shows a
  helpful message if a network call fails.

## Prerequisites the user needs

- The **Figma desktop app** (you can only submit from it).
- **Two-factor authentication enabled** on their Figma account.
- **Approved creator status** — only required if charging for the plugin.

## Step 1 — Generate the plugin ID

1. Start the publish flow (Step 2 below) far enough to reach the plugin's info
   screen, or open **Plugins → Development → <plugin> → Manage…**
2. Click **Generate ID**.
3. You (Claude) paste that id into `manifest.json`'s `id` field, replacing the
   placeholder, then run `npm run build` again.

## Step 2 — Open the publish dialog

Main menu → **Plugins → Manage plugins…** → select the plugin → **Publish**.
(Alternatively: left sidebar **Community** → **Publish** → **Plugins** tab →
pick the project.)

## Step 3 — Fill in the listing (required fields)

- **Name** — searchable; clear and descriptive.
- **Tagline** — one-line summary.
- **Description** — what it does and how to use it.
- **Category** — e.g. "Design tools".
- **Tags / keywords** — up to **12**.
- **Support contact** — required (email, website, or help link).

## Step 4 — Add images (exact sizes)

- **Icon:** **128 × 128px**.
- **Cover / thumbnail:** **1920 × 1080px** (image or video).
- **Carousel:** up to **9** images/videos.

Tip for the designer: in Figma's right sidebar, the **Community** frame-preset
dropdown has presets for plugin icon and plugin cover sized correctly — use
those frames to design the assets.

## Step 5 — Choose audience and submit

- **Publish to:** **Community (public)** or **Organization (private)** (private
  keeps it internal to the org; no public review).
- **Publish as:** yourself, a team, or an organization.
- Complete the **data-security / network-access** disclosure — the
  `networkAccess.reasoning` you wrote is reviewed here.
- Submit. The listing shows an **"In review"** badge.

## Step 6 — Review and approval

- Figma reviews public submissions (the data-security review can take up to ~2
  weeks).
- They email the account's address with the result. On approval the listing
  gets a **"Published"** badge and a public URL like
  `https://www.figma.com/community/plugin/<id>/<name>`.

## Updating a published plugin

1. You make and build the changes; run `npm run check`.
2. User: **Plugins → Manage plugins…** → select the plugin → **Publish** again.
3. The `id` in `manifest.json` stays the same — that's what targets the existing
   listing. Updates also go through review.

## Paid plugins (optional)

Requires approved creator status and `"payments"` in manifest `permissions`.
Minimum price **$2.00 USD**, whole numbers. Gate features on
`figma.payments.status` and handle trials. See
<https://developers.figma.com/docs/plugins/requiring-payment/>.
