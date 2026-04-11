import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = get_base_dir()
CLIPBOARD_PATH = BASE_DIR / "config" / "clipboard_history.json"
MAX_ITEMS = 40


def _load_history() -> list[dict]:
    if not CLIPBOARD_PATH.exists():
        return []
    try:
        data = json.loads(CLIPBOARD_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _save_history(items: list[dict]) -> None:
    CLIPBOARD_PATH.parent.mkdir(parents=True, exist_ok=True)
    CLIPBOARD_PATH.write_text(json.dumps(items[:MAX_ITEMS], indent=2, ensure_ascii=False), encoding="utf-8")


def _read_clipboard() -> str:
    if sys.platform != "win32":
        return ""
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "Get-Clipboard -Raw"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=5,
    )
    return result.stdout.strip()


def _record_clipboard() -> tuple[str, list[dict]]:
    text = _read_clipboard()
    history = _load_history()
    if not text:
        return "", history

    if not history or history[0].get("text") != text:
        history.insert(
            0,
            {
                "text": text,
                "timestamp": datetime.now().isoformat(timespec="seconds"),
            },
        )
        _save_history(history)
    return text, history


def clipboard_manager(parameters: dict, response=None, player=None, session_memory=None) -> str:
    action = str((parameters or {}).get("action") or "show").strip().lower()
    query = str((parameters or {}).get("query") or "").strip().lower()

    if action in {"capture", "record"}:
        text, _ = _record_clipboard()
        return "Clipboard captured." if text else "Clipboard is empty."

    if action == "clear":
        _save_history([])
        return "Clipboard history cleared."

    _, history = _record_clipboard()
    if not history:
        return "Clipboard history is empty."

    if action == "search":
        matches = [item for item in history if query and query in item.get("text", "").lower()]
        if not matches:
            return f"No clipboard entries matched '{query}'."
        lines = [
            f"{idx}. [{item['timestamp']}] {item['text'][:120]}"
            for idx, item in enumerate(matches[:10], start=1)
        ]
        return "\n".join(lines)

    lines = [
        f"{idx}. [{item['timestamp']}] {item['text'][:120]}"
        for idx, item in enumerate(history[:10], start=1)
    ]
    return "\n".join(lines)
