"""Every third-party import must be declared in requirements.txt.

Written after removing `google-generativeai` and `google-auth` as "unused". They
were not unused. The check that cleared them grepped `*.py`, and this backend is
assembled at import time from `backend/main_parts/*.part` - so the two files
that actually import them were never searched. `from google.oauth2 import
id_token` sits in `001_imports_db.part`, and `ask_gemini` is called four times
from `040_agent_a.part`.

Nothing failed locally, because the packages were already absent here and
`backend.main` already could not import. The break would have surfaced on the
next deploy, in a dependency install, far from the commit that caused it.

So the rule is enforced rather than remembered: collect imports from every file
the backend is actually built from - `.part` included - and require each
third-party one to be declared. A grep can forget about `.part` files. This
cannot.
"""

import ast
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Import name -> distribution name, where the two differ.
DISTRIBUTION = {
    "sklearn": "scikit-learn",
    "google": "google-auth",          # also satisfied by google-generativeai
    "jose": "python-jose",
    "multipart": "python-multipart",
    "yaml": "pyyaml",
    "dotenv": "python-dotenv",
    "PIL": "pillow",
    "dateutil": "python-dateutil",
}

# Shipped with Python, or ours.
LOCAL_PREFIXES = ("backend", "scripts", "tests")


def source_files():
    """Everything the backend is built from, including the .part files.

    The .part files are the reason this test exists - they are Python that no
    Python-file glob will ever match.
    """
    files = sorted((ROOT / "backend").rglob("*.py"))
    files += sorted((ROOT / "backend" / "main_parts").glob("*.part"))
    return [f for f in files if "__pycache__" not in f.parts]


def top_level_imports(path: Path) -> set[str]:
    text = path.read_text(encoding="utf-8", errors="replace")
    try:
        tree = ast.parse(text)
    except SyntaxError:
        # A .part is a fragment; it need not parse on its own. Fall back to a
        # line scan rather than skipping the file, since skipping it silently
        # is the exact failure this module exists to prevent.
        found = set()
        for line in text.splitlines():
            match = re.match(r"\s*(?:from|import)\s+([A-Za-z_][\w.]*)", line)
            if match:
                found.add(match.group(1).split(".")[0])
        return found

    found = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            found.add(node.module.split(".")[0])
    return found


def declared_distributions() -> set[str]:
    text = (ROOT / "requirements.txt").read_text(encoding="utf-8")
    names = set()
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        names.add(re.split(r"[\[<>=!;\s]", line, 1)[0].lower())
    return names


def third_party_imports() -> dict[str, list[str]]:
    """Imported name -> files importing it, excluding stdlib and our own code."""
    stdlib = sys.stdlib_module_names
    result: dict[str, list[str]] = {}
    for path in source_files():
        for name in top_level_imports(path):
            if name in stdlib or name.startswith(LOCAL_PREFIXES) or name.startswith("_"):
                continue
            result.setdefault(name, []).append(str(path.relative_to(ROOT)))
    return result


@pytest.fixture(scope="module")
def imports():
    return third_party_imports()


class TestDependenciesAreDeclared:
    def test_every_third_party_import_is_in_requirements(self, imports):
        declared = declared_distributions()
        missing = {
            name: files for name, files in imports.items()
            if DISTRIBUTION.get(name, name).lower() not in declared
        }
        assert not missing, (
            "imported but not declared in requirements.txt - this breaks the "
            f"next deploy, not the next test run: {missing}"
        )

    def test_the_part_files_are_actually_searched(self, imports):
        """The bug was a search that never looked here. Pin that it does."""
        searched = {f for files in imports.values() for f in files}
        assert any(f.endswith(".part") for f in searched), (
            "no .part file contributed an import - the scan is not covering the "
            "files the backend is assembled from, which is how google-auth was "
            "removed while in use"
        )

    @pytest.mark.parametrize("package", ["google", "openai", "pandas", "sklearn"])
    def test_known_dependencies_are_still_found(self, imports, package):
        """A positive control: if the scan finds nothing, it proves nothing."""
        assert package in imports, f"{package} should be imported somewhere"


class TestGoogleDependenciesSpecifically:
    """The regression that prompted this file."""

    def test_google_auth_is_imported_by_the_backend(self, imports):
        assert any("main_parts" in f for f in imports.get("google", []))

    def test_google_is_declared(self):
        declared = declared_distributions()
        assert "google-auth" in declared
        assert "google-generativeai" in declared

    def test_the_gemini_disable_switch_is_read_somewhere(self):
        """A QA script sets this. Removing the reader silently re-enables calls."""
        readers = [
            path for path in source_files()
            if "MODEL_MATE_DISABLE_GEMINI" in path.read_text(encoding="utf-8", errors="replace")
        ]
        assert readers, "nothing reads MODEL_MATE_DISABLE_GEMINI, so setting it does nothing"
