#!/usr/bin/env node
// Secret scanner — keeps credentials out of git.
//
//   node scripts/check-secrets.mjs            # scan all git-tracked files
//   node scripts/check-secrets.mjs --staged   # scan only staged files (pre-commit hook)
//
// Exits non-zero (blocking the commit) when it finds a likely credential or a
// tracked .env file. See .claude/skills/figma-plugin-builder/references/security.md.

import { execSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";

const staged = process.argv.includes("--staged");

// High-confidence credential signatures → always an error.
const RULES = [
  { name: "Figma personal access token", re: /figd_[A-Za-z0-9_-]{20,}/ },
  { name: "OpenAI API key", re: /sk-(proj-)?[A-Za-z0-9]{20,}/ },
  { name: "AWS access key id", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "GitHub fine-grained token", re: /github_pat_[A-Za-z0-9_]{30,}/ },
  { name: "Slack token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Stripe secret key", re: /sk_live_[A-Za-z0-9]{20,}/ },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "JSON web token", re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/ },
];

// Generic "secret = value" assignments. Flagged only when the value looks real,
// to keep false positives low.
const ASSIGN_RE =
  /\b(api[_-]?key|secret|client[_-]?secret|password|passwd|access[_-]?token|auth[_-]?token|private[_-]?key)\b\s*[:=]\s*['"]([^'"]{8,})['"]/i;

const PLACEHOLDER_RE =
  /^(your[_-]|example|changeme|placeholder|xxx+|\.\.\.|\$\{|test|dummy|none|null|undefined|sample|todo|fixme|insert|put[_-])/i;

const SKIP_DIR = /(^|\/)(node_modules|dist|build|\.git|\.claude)\//;
const BINARY_EXT =
  /\.(png|jpe?g|gif|webp|svg|ico|pdf|zip|gz|tgz|woff2?|ttf|otf|mp4|mov|skill|lock)$/i;

function listFiles() {
  try {
    const cmd = staged
      ? "git diff --cached --name-only --diff-filter=ACM"
      : "git ls-files";
    return execSync(cmd, { encoding: "utf8" })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return []; // not a git repo yet — nothing to scan
  }
}

function looksPlaceholder(value) {
  const v = value.trim();
  if (PLACEHOLDER_RE.test(v)) return true;
  if (/^(.)\1+$/.test(v)) return true; // all the same character
  return false;
}

const findings = [];

for (const file of listFiles()) {
  if (SKIP_DIR.test(file) || BINARY_EXT.test(file)) continue;
  if (!existsSync(file)) continue;

  // A tracked .env file (other than the shareable .env.example) is itself a leak.
  const isEnv = /(^|\/)\.env(\.[^/]+)?$/.test(file);
  if (isEnv && !file.endsWith(".env.example")) {
    findings.push({ file, line: 0, name: "Committed .env file" });
    continue;
  }
  if (file.endsWith(".env.example")) continue; // placeholders allowed

  try {
    if (statSync(file).size > 2 * 1024 * 1024) continue;
  } catch {
    continue;
  }

  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  text.split("\n").forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        findings.push({ file, line: i + 1, name: rule.name, snippet: line.trim().slice(0, 100) });
      }
    }
    const m = ASSIGN_RE.exec(line);
    if (m && !looksPlaceholder(m[2])) {
      findings.push({ file, line: i + 1, name: `Hardcoded ${m[1]}`, snippet: line.trim().slice(0, 100) });
    }
  });
}

if (findings.length === 0) {
  console.log("✔ Secret scan passed — no credentials found in tracked files.");
  process.exit(0);
}

console.error("\n✖ Potential secrets detected:\n");
for (const f of findings) {
  console.error(`  ${f.file}${f.line ? ":" + f.line : ""}  [${f.name}]`);
  if (f.snippet) console.error(`     ${f.snippet}`);
}
console.error(`\n${findings.length} issue(s) found. Move the value somewhere safe:`);
console.error("  • A user's own token  → figma.clientStorage at runtime (never bundled)");
console.error("  • A server secret     → a backend env var / a secrets manager");
console.error("  • Local-only config   → a .env file (already gitignored)");
console.error("If a previous commit already contains it, rotate/revoke that credential now.\n");
process.exit(1);
