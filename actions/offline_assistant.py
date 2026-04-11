import os

from actions.clipboard_manager import clipboard_manager
from actions.desktop_search import desktop_search
from actions.file_controller import file_controller, organize_downloads
from actions.open_app import open_app
from actions.system_health import system_health
from actions.workflow_manager import workflow_manager
from actions.kasa_control import kasa_control


def offline_assistant(command: str, player=None) -> str:
    text = (command or "").strip()
    lower = text.lower()

    if not text:
        return "No offline command provided."

    if lower.startswith(("open ", "launch ", "start ")):
        return open_app(parameters={"app_name": text.split(" ", 1)[1]}, player=player) or "Opened."

    if "clipboard" in lower:
        action = "search" if "search" in lower else "show"
        query = text.split("search", 1)[1].strip() if action == "search" and "search" in lower else ""
        return clipboard_manager(parameters={"action": action, "query": query}, player=player)

    if "system health" in lower or "cpu" in lower or "ram" in lower or "memory" in lower:
        return system_health(parameters={"action": "summary"}, player=player)

    if "organize downloads" in lower:
        return organize_downloads("by_type")

    if lower.startswith("find ") or "search files" in lower:
        return desktop_search(parameters={"query": text}, player=player)

    if "workflow" in lower and "list" in lower:
        return workflow_manager(parameters={"action": "list"}, player=player)

    if "list desktop" in lower:
        return file_controller(parameters={"action": "list", "path": "desktop"}, player=player)

    if "kasa" in lower:
        action = "discover"
        if "turn on" in lower:
            action = "on"
        elif "turn off" in lower:
            action = "off"
        elif "toggle" in lower:
            action = "toggle"
        elif "status" in lower:
            action = "status"
        device_name = text.lower().replace("kasa", "").replace("turn on", "").replace("turn off", "").replace("toggle", "").replace("status", "").strip()
        return kasa_control(parameters={"action": action, "device_name": device_name}, player=player)

    # Fallback: if API key is present, use text-only Gemini call to keep basic chat working.
    # Lightweight fallback: try cloud text model if key is available.
    api_key = os.environ.get("GOOGLE_API_KEY", "").strip()
    if api_key:
        try:
            from google import genai

            client = genai.Client(api_key=api_key, http_options={"api_version": "v1"})
            resp = client.models.generate_content(
                model="models/gemini-2.5-flash",
                contents=text,
            )
            return (resp.text or "").strip() or "..."
        except Exception:
            pass

    # If nothing else, remind supported offline intents.
    return (
        "I'm in offline mode. Try commands like: "
        "'open chrome', 'system health', 'organize downloads', "
        "'search files <name>', or 'list desktop'."
    )
