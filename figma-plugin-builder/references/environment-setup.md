# Environment setup (for a non-technical user)

Goal: get **Node.js (18+)**, **npm**, and **git** working, and confirm the
**Figma desktop app** is installed. You (Claude) run the checks and the
installs. Explain each tool in one friendly sentence.

> One-liners you can reuse:
> - Node/npm = "the engine and package manager that run our build tools."
> - git = "a safety net that records versions of our work."
> - The Figma **desktop app** is required — the browser version cannot load a
>   plugin from local files.

## 1. Check what's already there

```sh
node --version   # want v18.x or higher (the template is happy on the latest LTS+)
npm --version
git --version
```

If all three print versions, skip to confirming the Figma desktop app.

## 2. Install Node.js + npm

npm ships with Node, so installing Node gives you both.

### macOS
- **Easiest (recommended):** download the "LTS" installer `.pkg` from
  <https://nodejs.org/> and double-click through it. No terminal needed.
- **If Homebrew is installed** (`brew --version` works): `brew install node`.
- **Version-manager route (optional, for users who want it):** install `nvm`
  from <https://github.com/nvm-sh/nvm>, then `nvm install --lts`.

### Windows
- **Easiest (recommended):** download the "LTS" `.msi` installer from
  <https://nodejs.org/> and click through it. Keep "Add to PATH" checked.
- **If winget is available:** `winget install OpenJS.NodeJS.LTS`.
- After install, open a **new** terminal window so PATH changes take effect.

### Linux
- **Recommended:** use `nvm` (<https://github.com/nvm-sh/nvm>), then
  `nvm install --lts`. This avoids the often-outdated system packages.
- **Debian/Ubuntu via NodeSource** (needs sudo): follow
  <https://github.com/nodesource/distributions>.

**Verify:** open a new terminal and run `node --version` && `npm --version`.

## 3. Install git

- **macOS:** running `git --version` once will offer to install the Xcode
  Command Line Tools — accept it. Or `brew install git`.
- **Windows:** download from <https://git-scm.com/download/win> and install with
  defaults.
- **Linux:** `sudo apt install git` (Debian/Ubuntu) or the distro equivalent.

Set the user's identity once (use their real name/email; ask if unknown):

```sh
git config --global user.name  "Their Name"
git config --global user.email "their@email"
```

## 4. Confirm the Figma desktop app

Plugin development **requires** the desktop app (it reads plugin files from
disk). If it's not installed, send them to <https://www.figma.com/downloads/>.
Browser Figma is fine for *using* published plugins, not for developing them.

## 5. Editor note

The user does **not** need to install or open VS Code or any code editor — you
edit files for them with your own tools. If they happen to have VS Code, the
`@figma/plugin-typings` package the template installs will give them nice
autocomplete, but it's optional.

## Troubleshooting installs

- **`node`/`npm` "command not found" right after installing:** open a brand-new
  terminal window (PATH updates don't apply to already-open shells). On Windows,
  fully reopen the terminal app.
- **Permission errors from `npm install`:** never recommend `sudo npm`. Prefer
  `nvm`-managed Node, which installs into the user's home directory.
- **Corporate machine blocks installers:** suggest the `nvm` route, or ask their
  IT for Node LTS. The plugin can still be developed once Node is available.
