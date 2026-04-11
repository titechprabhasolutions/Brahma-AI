import json
import subprocess
import sys
from pathlib import Path

from actions.browser_control import browser_control
from actions.cmd_control import cmd_control
from actions.computer_settings import computer_settings
from actions.file_controller import organize_downloads
from actions.open_app import open_app
from actions.youtube_video import youtube_video


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = get_base_dir()
WORKFLOWS_PATH = BASE_DIR / "config" / "workflows.json"


def _load_workflows() -> dict:
    if not WORKFLOWS_PATH.exists():
        return {}
    try:
        return json.loads(WORKFLOWS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_workflows(data: dict) -> None:
    WORKFLOWS_PATH.parent.mkdir(parents=True, exist_ok=True)
    WORKFLOWS_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _split_steps(parameters: dict) -> list[str]:
    steps = parameters.get("steps")
    if isinstance(steps, list):
        return [str(step).strip() for step in steps if str(step).strip()]

    raw = str(parameters.get("commands") or parameters.get("description") or "").strip()
    if not raw:
        return []

    normalized = raw.replace(";", "\n")
    parts = []
    for line in normalized.splitlines():
        cleaned = line.strip().lstrip("-").strip()
        if cleaned:
            parts.append(cleaned)
    return parts


def _normalize_name(name: str) -> str:
    return name.strip().lower().replace(" ", "_")


def _open_url(url: str) -> str:
    if sys.platform == "win32":
        subprocess.Popen(["cmd", "/c", "start", "", url], shell=False)
        return f"Opened {url}"
    return browser_control(parameters={"action": "go_to", "url": url}, player=None) or f"Opened {url}"


def _run_step(step: str, player=None) -> str:
    text = step.strip()
    lower = text.lower()

    if lower.startswith(("open ", "launch ", "start ")):
        app_name = text.split(" ", 1)[1].strip()
        return open_app(parameters={"app_name": app_name}, player=player) or f"Opened {app_name}"

    if lower.startswith(("website ", "go to ", "visit ")):
        url = text.split(" ", 1)[1].strip()
        return _open_url(url)

    if "youtube" in lower and ("playlist" in lower or "play " in lower):
        query = text.replace("play", "", 1).strip()
        return youtube_video(parameters={"action": "play", "query": query}, player=player) or "Started YouTube playback."

    if "mute notifications" in lower or "turn off notifications" in lower or "focus mode" in lower:
        return computer_settings(
            parameters={
                "action": "do_not_disturb",
                "description": "Turn on do not disturb and mute notifications",
            },
            player=player,
        ) or "Notifications muted."

    if "organize downloads" in lower:
        return organize_downloads("by_type")

    if lower.startswith("cmd:") or lower.startswith("command:"):
        command = text.split(":", 1)[1].strip()
        return cmd_control(parameters={"task": command, "visible": False, "command": command}, player=player)

    return cmd_control(parameters={"task": text, "visible": False}, player=player)


def workflow_manager(parameters: dict, response=None, player=None, session_memory=None) -> str:
    action = str((parameters or {}).get("action") or "list").strip().lower()
    name = str((parameters or {}).get("name") or "").strip()
    workflows = _load_workflows()

    if action == "list":
        if not workflows:
            return "No workflows saved yet."
        names = ", ".join(sorted(workflows.keys()))
        return f"Saved workflows: {names}"

    if action == "create":
        if not name:
            return "Workflow name is required."
        steps = _split_steps(parameters or {})
        if not steps:
            return "Workflow steps are required."
        key = _normalize_name(name)
        workflows[key] = {"name": name, "steps": steps}
        _save_workflows(workflows)
        return f"Workflow '{name}' saved with {len(steps)} steps."

    if action == "show":
        key = _normalize_name(name)
        workflow = workflows.get(key)
        if not workflow:
            return f"Workflow '{name}' not found."
        lines = [f"{index}. {step}" for index, step in enumerate(workflow.get('steps', []), start=1)]
        return f"Workflow '{workflow.get('name', name)}':\n" + "\n".join(lines)

    if action == "delete":
        key = _normalize_name(name)
        if key not in workflows:
            return f"Workflow '{name}' not found."
        deleted = workflows.pop(key)
        _save_workflows(workflows)
        return f"Deleted workflow '{deleted.get('name', name)}'."

    if action == "run":
        key = _normalize_name(name)
        workflow = workflows.get(key)
        if not workflow:
            return f"Workflow '{name}' not found."
        step_runner = (parameters or {}).get("step_runner")
        results = []
        for index, step in enumerate(workflow.get("steps", []), start=1):
            try:
                if callable(step_runner):
                    result = step_runner(step)
                else:
                    result = _run_step(step, player=player)
            except Exception as exc:
                result = f"Failed: {exc}"
            results.append(f"{index}. {step} -> {result}")
        return f"Workflow '{workflow.get('name', name)}' executed.\n" + "\n".join(results)

    return "Unknown workflow action."
