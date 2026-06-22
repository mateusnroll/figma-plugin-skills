#!/usr/bin/env python3
"""Package the figma-plugin-builder skill into a distributable `.skill` file.

A `.skill` file is just a ZIP of the skill folder (with the folder name as the
top-level entry) — the same format the Claude skill installer expects. This
script is dependency-free (standard library only) so any contributor can
rebuild the artifact:

    python3 tools/package_skill.py                 # packages ./figma-plugin-builder
    python3 tools/package_skill.py path/to/skill   # packages a specific folder
    python3 tools/package_skill.py path/to/skill out/  # custom output dir

It mirrors the validation the installer applies (single SKILL.md, allowed
frontmatter keys, kebab-case name, no angle brackets in the description) so a
bad artifact is caught here rather than on upload.
"""

from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path

EXCLUDE_DIRS = {"__pycache__", "node_modules"}
EXCLUDE_GLOB_SUFFIXES = (".pyc",)
EXCLUDE_FILES = {".DS_Store"}
ROOT_EXCLUDE_DIRS = {"evals"}  # excluded only at the skill root

ALLOWED_FRONTMATTER_KEYS = {
    "name", "description", "license", "allowed-tools", "metadata", "compatibility",
}


def should_exclude(rel_path: Path) -> bool:
    parts = rel_path.parts
    if any(part in EXCLUDE_DIRS for part in parts):
        return True
    # parts[0] is the skill folder name; parts[1] is the first subdir.
    if len(parts) > 1 and parts[1] in ROOT_EXCLUDE_DIRS:
        return True
    if rel_path.name in EXCLUDE_FILES:
        return True
    return rel_path.name.endswith(EXCLUDE_GLOB_SUFFIXES)


def validate(skill_path: Path) -> str | None:
    """Return an error string, or None if the skill is valid."""
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return f"SKILL.md not found in {skill_path}"

    # Exactly one packaged SKILL.md.
    extra = [
        p for p in skill_path.rglob("SKILL.md")
        if not should_exclude(p.relative_to(skill_path.parent))
        and p.resolve() != skill_md.resolve()
    ]
    if extra:
        names = ", ".join(str(p.relative_to(skill_path)) for p in extra)
        return f"Multiple SKILL.md files found (only one allowed). Extra: {names}"

    content = skill_md.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not m:
        return "SKILL.md is missing YAML frontmatter"
    frontmatter = m.group(1)

    keys = set(re.findall(r"^([A-Za-z][\w-]*):", frontmatter, re.MULTILINE))
    unexpected = keys - ALLOWED_FRONTMATTER_KEYS
    if unexpected:
        return (
            f"Unexpected frontmatter key(s): {', '.join(sorted(unexpected))}. "
            f"Allowed: {', '.join(sorted(ALLOWED_FRONTMATTER_KEYS))}"
        )
    if "name" not in keys:
        return "Missing 'name' in frontmatter"
    if "description" not in keys:
        return "Missing 'description' in frontmatter"

    name_match = re.search(r"^name:\s*(.+)$", frontmatter, re.MULTILINE)
    name = name_match.group(1).strip().strip("'\"") if name_match else ""
    if not re.fullmatch(r"[a-z0-9-]+", name):
        return f"Name '{name}' must be kebab-case (lowercase letters, digits, hyphens)"
    if name.startswith("-") or name.endswith("-") or "--" in name:
        return f"Name '{name}' cannot start/end with a hyphen or contain '--'"
    if len(name) > 64:
        return f"Name is too long ({len(name)} chars, max 64)"

    # Description must not contain angle brackets and stay within 1024 chars.
    # Grab everything from `description:` to the next top-level key.
    desc_match = re.search(
        r"^description:\s*(.*?)(?=^[A-Za-z][\w-]*:|\Z)",
        frontmatter, re.MULTILINE | re.DOTALL,
    )
    description = (desc_match.group(1) if desc_match else "")
    description = description.replace(">-", " ").replace(">", " ")  # strip block scalar marker first
    # (Re-check raw for stray angle brackets in the human text.)
    raw_desc = desc_match.group(1) if desc_match else ""
    cleaned = re.sub(r"^\s*>-?\s*$", "", raw_desc, flags=re.MULTILINE)
    if "<" in cleaned or ">" in cleaned:
        return "Description cannot contain angle brackets (< or >)"
    if len(cleaned) > 1024:
        return f"Description is too long ({len(cleaned)} chars, max 1024)"

    return None


def package(skill_path: Path, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_file = output_dir / f"{skill_path.name}.skill"
    count = 0
    with zipfile.ZipFile(out_file, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(skill_path.rglob("*")):
            if not f.is_file():
                continue
            arc = f.relative_to(skill_path.parent)
            if should_exclude(arc):
                continue
            zf.write(f, arc.as_posix())
            count += 1
    print(f"✅ Packaged {count} files → {out_file}")
    return out_file


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    skill_path = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else repo_root / "figma-plugin-builder"
    output_dir = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else repo_root

    if not skill_path.is_dir():
        print(f"❌ Skill folder not found: {skill_path}")
        return 1

    print(f"🔍 Validating {skill_path.name}…")
    error = validate(skill_path)
    if error:
        print(f"❌ Validation failed: {error}")
        return 1
    print("✅ Valid skill")

    package(skill_path, output_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
