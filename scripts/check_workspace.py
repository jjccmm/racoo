"""Check local documentation links offline."""

import os
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SKIP = {
    ".git",
    ".venv",
    ".uv-cache",
    ".cache",
    ".pytest_cache",
    ".ruff_cache",
    "__pycache__",
    "node_modules",
    "dist",
}
LINK = re.compile(r"\[[^\]]*\]\(([^)]+)\)")


def main() -> int:
    errors = []
    documents = 0
    for directory, children, files in os.walk(ROOT):
        children[:] = [name for name in children if name not in SKIP]
        for name in files:
            if not name.endswith(".md"):
                continue
            path = Path(directory) / name
            documents += 1
            for target in LINK.findall(path.read_text(encoding="utf-8")):
                url = urlsplit(target)
                if url.scheme or not url.path:
                    continue
                if not (path.parent / unquote(url.path)).is_file():
                    errors.append(f"{path.relative_to(ROOT)}: missing link {target}")
    for error in errors:
        print(error)
    if errors:
        return 1
    print(f"Checked {documents} Markdown files; no broken local links.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
