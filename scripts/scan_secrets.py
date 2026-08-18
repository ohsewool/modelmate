#!/usr/bin/env python3
"""Scan git history for credentials before making a repository public.

Written after two failures worth keeping in mind.

The first: an earlier version of this script used `(?:...)` in a pattern handed
to `git grep -E`. That is PCRE syntax, POSIX ERE rejects it, and git exited with
an error on every invocation. The script read the resulting empty output as
"no secrets found" and reported five clean repositories - one of which was known
to contain four leaked keys. A scanner that cannot distinguish "found nothing"
from "failed to look" is worse than no scanner, because it produces confidence.
Hence `scan()` raises on unexpected stderr, and hence `--control`.

The second: `sk-[A-Za-z0-9_-]{20,}` looked like a reasonable OpenAI key pattern
and matched 175 files, all of them Tailwind CSS variable names like
`sk-image-linear-from-pos` (the tail of `--tw-mask-image-...`). Real keys have no
hyphens after the prefix. A pattern loose enough to flag everything gets muted,
which is how the one real finding gets missed.

Usage:
    python3 scan_secrets.py <repo> [<repo>...] [--control <repo>:<rev>]

Exit status is 1 if anything is found, so it can gate a release.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys

# POSIX ERE only. Verified against git grep -E, not against Python's re.
PATTERNS: dict[str, str] = {
    "Google API key":  r"AIza[A-Za-z0-9_-]{35}",
    "OpenAI key":      r"sk-(proj-)?[A-Za-z0-9]{32,}",
    "Anthropic key":   r"sk-ant-[A-Za-z0-9-]{32,}",
    "GitHub token":    r"gh[pousr]_[A-Za-z0-9]{36}",
    "GitHub PAT":      r"github_pat_[A-Za-z0-9_]{50,}",
    "AWS access key":  r"AKIA[0-9A-Z]{16}",
    "Slack token":     r"xox[baprs]-[A-Za-z0-9-]{10,}",
    "private key":     r"-----BEGIN ([A-Z]+ )?PRIVATE KEY-----",
}
COMBINED = "|".join(PATTERNS.values())
COMPILED = {name: re.compile(pattern) for name, pattern in PATTERNS.items()}


class ScanError(RuntimeError):
    """The search did not run. Distinct from the search finding nothing."""


def scan(repo: str, rev: str) -> list[str]:
    result = subprocess.run(
        ["git", "-C", repo, "grep", "-InIE", COMBINED, rev],
        capture_output=True, text=True,
    )
    # git grep: 0 = matches, 1 = no matches, anything else = it did not look.
    if result.returncode not in (0, 1) or result.stderr.strip():
        raise ScanError(f"{repo}@{rev[:7]}: {result.stderr.strip()[:200]}")
    return result.stdout.splitlines()


def classify(line: str) -> str:
    return next((name for name, p in COMPILED.items() if p.search(line)), "unknown")


def revisions(repo: str) -> list[str]:
    out = subprocess.run(["git", "-C", repo, "rev-list", "--all"],
                         capture_output=True, text=True)
    if out.returncode:
        raise ScanError(f"{repo}: not a git repository?")
    return out.stdout.split()


def check_control(spec: str) -> None:
    """Prove the scanner can find a secret that is known to be there.

    Without this, a clean report is unfalsifiable.
    """
    repo, _, rev = spec.partition(":")
    hits = scan(repo, rev or "HEAD")
    if not hits:
        sys.exit(f"ABORT: positive control {spec} found nothing. "
                 "The scanner is broken; its silence means nothing.")
    print(f"positive control {spec}: {len(hits)} hit(s) - scanner works\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repos", nargs="+")
    parser.add_argument("--control", help="repo:rev known to contain a secret")
    args = parser.parse_args()

    if args.control:
        check_control(args.control)
    else:
        print("warning: no --control given; a clean result is unverified\n")

    found = 0
    for repo in args.repos:
        revs = revisions(repo)
        hits: dict[tuple[str, str], set[str]] = {}
        for rev in revs:
            for line in scan(repo, rev):
                parts = line.split(":", 2)
                path = parts[1] if len(parts) > 1 else "?"
                hits.setdefault((classify(line), path), set()).add(rev[:7])
        if hits:
            print(f"FOUND  {repo}  ({len(revs)} commits)")
            for (kind, path), revset in sorted(hits.items()):
                print(f"         {kind:<16} {path}  - {len(revset)} commit(s)")
            found += len(hits)
        else:
            print(f"clean  {repo:<26} {len(revs):>4} commits")

    if found:
        print(f"\n{found} location(s) need review before this goes public.")
    return 1 if found else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ScanError as error:
        sys.exit(f"scan failed: {error}")
