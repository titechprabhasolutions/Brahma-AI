import json
import os
import sys
from pathlib import Path

from google import genai
from google.genai import types


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = get_base_dir()
API_CONFIG_PATH = BASE_DIR / "config" / "api_keys.json"
MODEL_FALLBACKS = {
    "gemini-2.5-flash-lite": ["gemini-2.5-flash", "gemini-2.0-flash"],
    "gemini-2.5-flash": ["gemini-2.0-flash"],
}


def get_api_key() -> str:
    env_key = str(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY") or "").strip()
    if env_key:
        return env_key

    candidates = [
        Path(os.environ.get("BRAHMA_CONFIG_DIR", "")).expanduser() / "api_keys.json"
        if os.environ.get("BRAHMA_CONFIG_DIR")
        else None,
        API_CONFIG_PATH,
        BASE_DIR / "_internal" / "config" / "api_keys.json",
        Path(os.environ.get("LOCALAPPDATA", "")) / "BrahmaAI" / "config" / "api_keys.json"
        if os.environ.get("LOCALAPPDATA")
        else None,
    ]
    for path in candidates:
        if not path or not path.exists():
            continue
        try:
            with open(path, "r", encoding="utf-8") as file:
                key = str(json.load(file).get("gemini_api_key") or "").strip()
            if key:
                return key
        except Exception:
            continue
    raise FileNotFoundError("gemini_api_key not found in any Brahma config location")


def generate_text(
    *,
    model: str,
    prompt: str,
    system_instruction: str | None = None,
    temperature: float | None = None,
    response_mime_type: str | None = None,
) -> str:
    client = genai.Client(
        api_key=get_api_key(),
        http_options={"api_version": "v1beta"},
    )

    config = None
    if system_instruction or temperature is not None:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=temperature,
            response_mime_type=response_mime_type,
        )
    elif response_mime_type is not None:
        config = types.GenerateContentConfig(
            response_mime_type=response_mime_type,
        )

    response = None
    last_error = None

    for candidate_model in [model, *MODEL_FALLBACKS.get(model, [])]:
        try:
            response = client.models.generate_content(
                model=candidate_model,
                contents=prompt,
                config=config,
            )
            break
        except Exception as exc:
            last_error = exc
            message = str(exc)
            if "RESOURCE_EXHAUSTED" in message or "429" in message:
                continue
            raise

    if response is None:
        raise last_error if last_error else RuntimeError("Gemini request failed.")

    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        if not content:
            continue
        parts = getattr(content, "parts", None) or []
        chunks = []
        for part in parts:
            part_text = getattr(part, "text", None)
            is_thought = bool(getattr(part, "thought", False))
            if part_text and not is_thought:
                chunks.append(part_text)
        if chunks:
            return "".join(chunks).strip()

    raise RuntimeError("Gemini returned no text content.")
