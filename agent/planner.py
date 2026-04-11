import json
import re
import sys
from pathlib import Path

from agent.genai_client import generate_text


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = get_base_dir()
API_CONFIG_PATH = BASE_DIR / "config" / "api_keys.json"


PLANNER_PROMPT = """You are the planning module of Brahma AI, a personal assistant.
Your job: break any user goal into a sequence of steps using ONLY the tools listed below.

ABSOLUTE RULES:
- NEVER use generated_code or write Python scripts. It does not exist.
- NEVER reference previous step results in parameters. Every step is independent.
- Use web_search for ANY information retrieval, research, or current data.
- Use file_controller to save content to disk.
- Use cmd_control to open files or run system commands.
- Max 5 steps. Use the minimum steps needed.

AVAILABLE TOOLS AND THEIR PARAMETERS:

open_app
  app_name: string (required)

web_search
  query: string (required) - write a clear, focused search query
  mode: "search" or "compare" (optional, default: search)
  items: list of strings (optional, for compare mode)
  aspect: string (optional, for compare mode)

browser_control
  action: "go_to" | "search" | "click" | "type" | "scroll" | "get_text" | "press" | "close" (required)
  url: string (for go_to)
  query: string (for search)
  text: string (for click/type)
  direction: "up" | "down" (for scroll)

file_controller
  action: "write" | "create_file" | "read" | "list" | "delete" | "move" | "copy" | "find" | "disk_usage" (required)
  path: string - use "desktop" for Desktop folder
  name: string - filename
  content: string - file content (for write/create_file)

cmd_control
  task: string (required) - natural language description of what to do
  visible: boolean (optional)

computer_settings
  action: string (required)
  description: string - natural language description
  value: string (optional)

computer_control
  action: "type" | "click" | "hotkey" | "press" | "scroll" | "screenshot" | "screen_find" | "screen_click" (required)
  text: string (for type)
  x, y: int (for click)
  keys: string (for hotkey, e.g. "ctrl+c")
  key: string (for press)
  direction: "up" | "down" (for scroll)
  description: string (for screen_find/screen_click)

screen_process
  text: string (required) - what to analyze or ask about the screen
  angle: "screen" | "camera" (optional)

send_message
  receiver: string (required)
  message_text: string (required)
  platform: string (required)

reminder
  date: string YYYY-MM-DD (required)
  time: string HH:MM (required)
  message: string (required)

desktop_control
  action: "wallpaper" | "organize" | "clean" | "list" | "task" (required)
  path: string (optional)
  task: string (optional)

workflow_manager
  action: "create" | "list" | "show" | "run" | "delete" (required)
  name: string (optional)
  steps: list of strings (optional)
  commands: string (optional)

clipboard_manager
  action: "show" | "search" | "capture" | "clear" (required)
  query: string (optional)

system_health
  action: "summary" | "processes" (optional)

desktop_search
  query: string (required)
  path: string (optional)

kasa_control
  action: "discover" | "on" | "off" | "toggle" | "status" (required)
  device_name: string (optional)

youtube_video
  action: "play" | "summarize" | "trending" (required)
  query: string (for play)

weather_report
  city: string (required)

flight_finder
  origin: string (required)
  destination: string (required)
  date: string (required)

code_helper
  action: "write" | "edit" | "run" | "explain" (required)
  description: string (required)
  language: string (optional)
  output_path: string (optional)
  file_path: string (optional)

dev_agent
  description: string (required)
  language: string (optional)

OUTPUT - return ONLY valid JSON, no markdown, no explanation, no code blocks:
{
  "goal": "...",
  "steps": [
    {
      "step": 1,
      "tool": "tool_name",
      "description": "what this step does",
      "parameters": {},
      "critical": true
    }
  ]
}
"""


def _sanitize_model_json(text: str) -> str:
    return re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()


def _normalize_plan(plan: dict, goal: str) -> dict:
    if "steps" not in plan or not isinstance(plan["steps"], list):
        raise ValueError("Invalid plan structure")

    for index, step in enumerate(plan["steps"], start=1):
        step.setdefault("step", index)
        step.setdefault("description", goal)
        step.setdefault("parameters", {})
        step.setdefault("critical", True)

        if step.get("tool") == "generated_code":
            print(
                f"[Planner] generated_code detected in step {step.get('step')} - replacing with web_search"
            )
            step["tool"] = "web_search"
            step["parameters"] = {"query": step.get("description", goal)[:200]}

    return plan


def create_plan(goal: str, context: str = "") -> dict:
    user_input = f"Goal: {goal}"
    if context:
        user_input += f"\n\nContext: {context}"

    try:
        text = generate_text(
            model="gemini-2.5-flash-lite",
            prompt=user_input,
            system_instruction=PLANNER_PROMPT,
            temperature=0,
            response_mime_type="application/json",
        )
        plan = json.loads(_sanitize_model_json(text))
        plan = _normalize_plan(plan, goal)

        print(f"[Planner] Plan ready: {len(plan['steps'])} steps")
        for step in plan["steps"]:
            print(f"  Step {step['step']}: [{step['tool']}] {step['description']}")
        return plan

    except json.JSONDecodeError as error:
        print(f"[Planner] JSON parse failed: {error}")
        return _fallback_plan(goal)
    except Exception as error:
        print(f"[Planner] Planning failed: {error}")
        return _fallback_plan(goal)


def _fallback_plan(goal: str) -> dict:
    print("[Planner] Using fallback plan")
    return {
        "goal": goal,
        "steps": [
            {
                "step": 1,
                "tool": "web_search",
                "description": f"Search for: {goal}",
                "parameters": {"query": goal},
                "critical": True,
            }
        ],
    }


def replan(goal: str, completed_steps: list, failed_step: dict, error: str) -> dict:
    completed_summary = "\n".join(
        f"  - Step {step['step']} ({step['tool']}): DONE" for step in completed_steps
    )

    prompt = f"""Goal: {goal}

Already completed:
{completed_summary if completed_summary else '  (none)'}

Failed step: [{failed_step.get('tool')}] {failed_step.get('description')}
Error: {error}

Create a REVISED plan for the remaining work only. Do not repeat completed steps."""

    try:
        text = generate_text(
            model="gemini-2.5-flash",
            prompt=prompt,
            system_instruction=PLANNER_PROMPT,
            temperature=0,
            response_mime_type="application/json",
        )
        plan = json.loads(_sanitize_model_json(text))
        plan = _normalize_plan(plan, goal)

        print(f"[Planner] Revised plan: {len(plan['steps'])} steps")
        return plan
    except Exception as replan_error:
        print(f"[Planner] Replan failed: {replan_error}")
        return _fallback_plan(goal)
