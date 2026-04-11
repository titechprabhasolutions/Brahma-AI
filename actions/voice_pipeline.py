import ctypes
import importlib.util
import json
import os
import shutil
import subprocess
import tempfile
import time
import sys
from pathlib import Path

import pyaudio
import requests


BASE_DIR = Path(__file__).resolve().parent.parent
VOICE_SETTINGS_PATH = BASE_DIR / "config" / "voice_settings.json"

DEFAULT_SETTINGS = {
    "profile": "jarvis",
    "providerOrder": ["elevenlabs", "edge_tts", "piper"],
    "elevenLabsApiKey": "",
    "elevenLabsVoiceId": "",
    "elevenLabsModel": "eleven_turbo_v2_5",
    "edgeVoice": "en-US-GuyNeural",
    "edgeRate": "-6%",
    "edgePitch": "-2Hz",
    "piperExecutable": "",
    "piperModel": "",
}

PROFILE_PRESETS = {
    "jarvis": {
        "providerOrder": ["elevenlabs", "edge_tts", "piper"],
        "edgeVoice": "en-US-GuyNeural",
        "edgeRate": "-6%",
        "edgePitch": "-2Hz",
    },
    "friendly": {
        "providerOrder": ["elevenlabs", "edge_tts", "piper"],
        "edgeVoice": "en-US-ChristopherNeural",
        "edgeRate": "+0%",
        "edgePitch": "+0Hz",
    },
    "minimal": {
        "providerOrder": ["edge_tts", "piper", "elevenlabs"],
        "edgeVoice": "en-US-GuyNeural",
        "edgeRate": "-10%",
        "edgePitch": "-2Hz",
    },
}


def _merge_settings(raw=None):
    merged = dict(DEFAULT_SETTINGS)
    if raw:
        merged.update(raw)
    preset = PROFILE_PRESETS.get(merged.get("profile", "jarvis"), {})
    for key, value in preset.items():
        if not raw or not raw.get(key):
            merged[key] = value
    return merged


def load_voice_settings():
    if not VOICE_SETTINGS_PATH.exists():
        return _merge_settings()
    try:
        with open(VOICE_SETTINGS_PATH, "r", encoding="utf-8") as f:
            return _merge_settings(json.load(f))
    except Exception:
        return _merge_settings()


def save_voice_settings(next_settings):
    current = load_voice_settings()
    merged = _merge_settings({**current, **(next_settings or {})})
    VOICE_SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(VOICE_SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2)
    return merged


def detect_voice_capabilities(settings=None):
    settings = settings or load_voice_settings()
    return {
        "elevenlabs": bool(settings.get("elevenLabsApiKey") and settings.get("elevenLabsVoiceId")),
        "edge_tts": bool(shutil.which("edge-tts") or importlib.util.find_spec("edge_tts")),
        "piper": _resolve_piper_executable(settings) and bool(settings.get("piperModel")),
    }


def _resolve_piper_executable(settings):
    configured = str(settings.get("piperExecutable") or "").strip()
    if configured and Path(configured).exists():
        return configured
    return shutil.which("piper") or shutil.which("piper.exe")


def _play_media_file(path):
    alias = f"Brahma AI_{int(time.time() * 1000)}"
    mci = ctypes.windll.winmm.mciSendStringW
    if mci(f'open "{path}" alias {alias}', None, 0, 0) != 0:
        raise RuntimeError("Could not open generated audio file.")
    try:
        if mci(f"play {alias} wait", None, 0, 0) != 0:
            raise RuntimeError("Could not play generated audio file.")
    finally:
        mci(f"close {alias}", None, 0, 0)


def _play_pcm(audio_bytes, sample_rate=24000):
    pya = pyaudio.PyAudio()
    stream = pya.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=sample_rate,
        output=True,
    )
    try:
        stream.write(audio_bytes)
    finally:
        stream.stop_stream()
        stream.close()
        pya.terminate()


def _speak_with_elevenlabs(text, settings):
    api_key = str(settings.get("elevenLabsApiKey") or "").strip()
    voice_id = str(settings.get("elevenLabsVoiceId") or "").strip()
    if not api_key or not voice_id:
        raise RuntimeError("ElevenLabs API key or voice ID is missing.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
    response = requests.post(
        url,
        params={"output_format": "pcm_24000"},
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/octet-stream",
        },
        json={
            "text": text,
            "model_id": settings.get("elevenLabsModel", "eleven_turbo_v2_5"),
            "voice_settings": {
                "stability": 0.45,
                "similarity_boost": 0.78,
                "style": 0.12,
                "use_speaker_boost": True,
            },
        },
        timeout=45,
    )
    response.raise_for_status()
    _play_pcm(response.content, sample_rate=24000)


def _speak_with_edge(text, settings):
    voice = settings.get("edgeVoice", "en-US-GuyNeural")
    rate = settings.get("edgeRate", "-6%")
    pitch = settings.get("edgePitch", "-2Hz")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        temp_path = tmp.name
    try:
        edge_binary = shutil.which("edge-tts")
        base_cmd = [
            "--voice",
            voice,
            "--text",
            text,
            "--format",
            "riff-24khz-16bit-mono-pcm",
            "--write-media",
            temp_path,
        ]
        if edge_binary:
            cmd = [edge_binary, *base_cmd]
        else:
            cmd = [sys.executable, "-m", "edge_tts", *base_cmd]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "edge-tts failed.")
        _play_media_file(temp_path)
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


def _speak_with_piper(text, settings):
    piper_exe = _resolve_piper_executable(settings)
    model_path = str(settings.get("piperModel") or "").strip()
    if not piper_exe or not model_path:
        raise RuntimeError("Piper executable or model is not configured.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        temp_path = tmp.name
    try:
        cmd = [
            piper_exe,
            "--model",
            model_path,
            "--output_file",
            temp_path,
        ]
        result = subprocess.run(
            cmd,
            input=text,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "Piper failed.")
        _play_media_file(temp_path)
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


def speak_text(text, settings=None, player=None):
    payload = str(text or "").strip()
    if not payload:
        return {"ok": False, "provider": None, "message": "Nothing to speak."}

    settings = settings or load_voice_settings()
    provider_order = settings.get("providerOrder") or DEFAULT_SETTINGS["providerOrder"]
    errors = []

    for provider in provider_order:
        try:
            if provider == "elevenlabs":
                _speak_with_elevenlabs(payload, settings)
            elif provider == "edge_tts":
                _speak_with_edge(payload, settings)
            elif provider == "piper":
                _speak_with_piper(payload, settings)
            else:
                continue

            if player:
                try:
                    player.start_speaking()
                    player.stop_speaking()
                except Exception:
                    pass
            return {"ok": True, "provider": provider, "message": f"Voice response played with {provider}."}
        except Exception as exc:
            errors.append(f"{provider}: {exc}")

    return {
        "ok": False,
        "provider": None,
        "message": "No configured TTS provider succeeded.",
        "errors": errors,
    }
