import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = get_base_dir()
CONFIG_DIR = BASE_DIR / "config"
ALIASES_PATH = CONFIG_DIR / "app_aliases.json"
USAGE_PATH = CONFIG_DIR / "app_usage.json"


def _load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def normalize_alias(name: str) -> str:
    return (name or "").strip().lower()


def resolve_alias(name: str) -> str:
    aliases = _load_json(ALIASES_PATH, {})
    return aliases.get(normalize_alias(name), name)


def learn_alias(alias: str, app_name: str) -> str:
    if not alias or not app_name:
        return "Alias and app name are required."
    aliases = _load_json(ALIASES_PATH, {})
    aliases[normalize_alias(alias)] = app_name.strip()
    _save_json(ALIASES_PATH, aliases)
    return f"Learned that '{alias}' means '{app_name}'."


def record_app_launch(app_name: str) -> None:
    usage = _load_json(USAGE_PATH, {"events": []})
    events = usage.setdefault("events", [])
    events.insert(
        0,
        {
            "app": app_name,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        },
    )
    usage["events"] = events[:250]
    _save_json(USAGE_PATH, usage)


def usage_summary() -> dict:
    usage = _load_json(USAGE_PATH, {"events": []})
    events = usage.get("events", [])
    counts = Counter(event.get("app", "Unknown") for event in events if event.get("app"))
    top_apps = [{"app": app, "count": count} for app, count in counts.most_common(5)]
    return {
        "topApps": top_apps,
        "recent": events[:8],
    }


def suggestions_for(app_name: str = "", last_text: str = "", conversation_mode: bool = False) -> list[str]:
    app = (app_name or "").lower()
    text = (last_text or "").lower()
    suggestions = []

    if "code" in app or "visual studio" in app or "vscode" in app:
        suggestions.extend(["Run your project", "Open terminal here", "Explain current error"])
    elif "chrome" in app or "browser" in app or "edge" in app:
        suggestions.extend(["Search something", "Summarize this page", "Analyze what's on screen"])
    elif "notion" in app:
        suggestions.extend(["Open study mode", "Create notes template", "Start focus session"])
    elif "capcut" in app or "premiere" in app or "editing" in app:
        suggestions.extend(["Open last project", "Start creator mode", "Mute notifications"])

    if "system health" in text or "cpu" in text:
        suggestions.extend(["Show top processes", "Organize downloads", "Open task manager"])

    if "workflow" in text:
        suggestions.extend(["List workflows", "Run study mode", "Create work mode"])

    if conversation_mode and not suggestions:
        suggestions.extend(["What should I do next?", "Show clipboard history", "Check system health"])

    deduped = []
    seen = set()
    for item in suggestions:
        key = item.lower()
        if key not in seen:
            deduped.append(item)
            seen.add(key)
    return deduped[:4]
