import os
import re
from datetime import datetime, timedelta
from pathlib import Path


SEARCH_ROOTS = [
    Path.home() / "Desktop",
    Path.home() / "Downloads",
    Path.home() / "Documents",
]
SKIP_DIR_NAMES = {".git", ".venv", "venv", "node_modules", "__pycache__"}

KIND_EXTENSIONS = {
    "pdf": [".pdf"],
    "image": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"],
    "video": [".mp4", ".mkv", ".mov", ".avi"],
    "music": [".mp3", ".wav", ".flac"],
    "code": [".py", ".js", ".ts", ".java", ".cpp", ".html", ".css", ".json"],
    "document": [".pdf", ".doc", ".docx", ".txt", ".ppt", ".pptx", ".xls", ".xlsx"],
}


def _extract_date_filter(query: str):
    lower = query.lower()
    now = datetime.now()
    if "today" in lower:
        start = datetime(now.year, now.month, now.day)
        return start.timestamp()
    if "yesterday" in lower:
        start = datetime(now.year, now.month, now.day) - timedelta(days=1)
        end = start + timedelta(days=1)
        return (start.timestamp(), end.timestamp())
    if "last week" in lower:
        return (now - timedelta(days=7)).timestamp()
    return None


def _extract_kind(query: str) -> list[str]:
    lower = query.lower()
    matched = []
    for kind, extensions in KIND_EXTENSIONS.items():
        if kind in lower:
            matched.extend(extensions)
    return matched


def _extract_terms(query: str) -> list[str]:
    cleaned = re.sub(r"[^a-zA-Z0-9._ -]", " ", query.lower())
    stop_words = {"find", "file", "files", "about", "the", "a", "an", "my", "edited", "open"}
    return [part for part in cleaned.split() if len(part) > 1 and part not in stop_words]


def desktop_search(parameters: dict, response=None, player=None, session_memory=None) -> str:
    query = str((parameters or {}).get("query") or "").strip()
    if not query:
        return "Search query is required."

    roots = []
    requested_path = str((parameters or {}).get("path") or "").strip()
    if requested_path:
        roots = [Path(requested_path).expanduser()]
    else:
        roots = [root for root in SEARCH_ROOTS if root.exists()]

    extensions = _extract_kind(query)
    terms = _extract_terms(query)
    date_filter = _extract_date_filter(query)

    matches = []
    for root in roots:
        if not root.exists():
            continue
        for current_root, _, files in os.walk(root):
            parts = {part.lower() for part in Path(current_root).parts}
            if parts & SKIP_DIR_NAMES:
                continue
            for filename in files:
                path = Path(current_root) / filename
                lower_name = filename.lower()
                if terms and not all(term in lower_name for term in terms):
                    continue
                if extensions and path.suffix.lower() not in extensions:
                    continue
                modified = path.stat().st_mtime
                if isinstance(date_filter, tuple):
                    start, end = date_filter
                    if not (start <= modified < end):
                        continue
                elif isinstance(date_filter, float):
                    if modified < date_filter:
                        continue
                matches.append(path)
                if len(matches) >= 12:
                    break
            if len(matches) >= 12:
                break
        if len(matches) >= 12:
            break

    if not matches:
        return f"No files found for '{query}'."

    lines = []
    for index, path in enumerate(matches, start=1):
        stamp = datetime.fromtimestamp(path.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
        lines.append(f"{index}. {path} (modified {stamp})")
    return "\n".join(lines)
