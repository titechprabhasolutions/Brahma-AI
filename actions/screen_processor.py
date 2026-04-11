"""
actions/screen_processor.py — Gemini Live API — IMAGE-ONLY SESSION v8
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v8 Changes:
  - Auto camera detection on first use — saves to config
  - No hardcoded camera index
  - mic_loop removed (no double response issue)
  - Image-only session, no conflict with main.py
"""

import asyncio
import base64
import io
import json
import re
import os
import sys
import time
import threading
import cv2
import mss
import mss.tools
import pyaudio
from pathlib import Path

try:
    import PIL.Image
    _PIL_OK = True
except ImportError:
    _PIL_OK = False

from google import genai
from google.genai import types

def get_base_dir():
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent

BASE_DIR        = get_base_dir()
CONFIG_DIR      = Path(os.environ.get("BRAHMA_CONFIG_DIR", BASE_DIR / "config"))
API_CONFIG_PATH = CONFIG_DIR / "api_keys.json"

LIVE_MODEL          = "gemini-1.5-flash"
USE_LIVE_WS         = False  # disable live WS to avoid 1007 errors
FORMAT              = pyaudio.paInt16
CHANNELS            = 1
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE          = 1024

IMG_MAX_W = 640
IMG_MAX_H = 360
JPEG_Q    = 55

SYSTEM_PROMPT = (
    "You are Brahma AI from Iron Man movies. "
    "Analyze images with technical precision and intelligence. "
    "Help the user in a way they can understand — don't be overly complex. "
    "Be concise, smart, and helpful like Tony Stark's AI assistant. "
    "Respond in maximum 2 short sentences. Speed is priority. "
    "Address the user as 'sir' for a tone of respect. "
    "Ask if the user needs any further help with their problem."
)

VISION_DIRECT_PROMPT = (
    "You are Brahma AI, a desktop AI assistant. "
    "Analyze the provided image carefully and answer the user's question directly. "
    "Be concise, specific, and helpful. "
    "If the user asks what they are holding or what is visible, identify the object or scene clearly. "
    "Respond in at most 2 short sentences."
)


def _get_api_key() -> str:
    try:
        env_key = os.environ.get("GOOGLE_API_KEY", "").strip()
        if env_key:
            return env_key
        # primary local config
        if API_CONFIG_PATH.exists():
            with open(API_CONFIG_PATH, "r", encoding="utf-8") as f:
                key = json.load(f).get("gemini_api_key", "")
                if key:
                    return key
        # fallback to AppData
        alt = Path(os.environ.get("LOCALAPPDATA", "")) / "BrahmaAI" / "config" / "api_keys.json"
        if alt.exists():
            with open(alt, "r", encoding="utf-8") as f:
                key = json.load(f).get("gemini_api_key", "")
                if key:
                    return key
        raise ValueError("gemini_api_key not found")
    except Exception as e:
        raise RuntimeError(f"Could not load API key: {e}")


def _get_camera_index() -> int:
    """
    Reads camera index from config.
    If not set, auto-detects the best camera and saves it for future use.
    Runs only once — after that, config value is used directly.
    """
    try:
        with open(API_CONFIG_PATH, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        if "camera_index" in cfg:
            return int(cfg["camera_index"])
    except Exception:
        pass

    print("[Camera] 🔍 No camera index in config. Auto-detecting...")
    best_index = 0

    for idx in range(6):
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap.release()
            continue

        for _ in range(5):
            cap.read()

        ret, frame = cap.read()
        cap.release()

        if ret and frame is not None and frame.mean() > 5:
            best_index = idx
            print(f"[Camera] ✅ Camera found at index {idx} — saving to config.")
            break
        else:
            print(f"[Camera] ⚠️  Index {idx}: no valid frame (black or empty).")

    try:
        cfg = {}
        if API_CONFIG_PATH.exists():
            with open(API_CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        cfg["camera_index"] = best_index
        with open(API_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=4)
        print(f"[Camera] 💾 Camera index {best_index} saved to config.")
    except Exception as e:
        print(f"[Camera] ⚠️  Could not save camera index: {e}")

    return best_index


def _to_jpeg(img_bytes: bytes) -> bytes:
    if not _PIL_OK:
        return img_bytes
    img = PIL.Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img.thumbnail([IMG_MAX_W, IMG_MAX_H], PIL.Image.BILINEAR)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_Q, optimize=False)
    return buf.getvalue()


def _capture_screenshot() -> bytes:
    with mss.mss() as sct:
        shot      = sct.grab(sct.monitors[1])
        png_bytes = mss.tools.to_png(shot.rgb, shot.size)
    return _to_jpeg(png_bytes)


def _capture_camera() -> bytes:
    camera_index = _get_camera_index()
    cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        raise RuntimeError(f"Camera could not be opened: index {camera_index}")

    for _ in range(10):
        cap.read()

    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        raise RuntimeError("Could not capture camera frame.")

    if _PIL_OK:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = PIL.Image.fromarray(rgb)
        img.thumbnail([IMG_MAX_W, IMG_MAX_H], PIL.Image.BILINEAR)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=JPEG_Q, optimize=False)
        return buf.getvalue()

    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_Q])
    return buf.tobytes()


class _LiveSession:
    """
    Image-only analysis session.
    No microphone — no conflict with main.py session.
    Sends image + question, plays audio response.
    """

    def __init__(self):
        self._loop:      asyncio.AbstractEventLoop | None = None
        self._thread:    threading.Thread | None          = None
        self._session                                     = None
        self._out_queue: asyncio.Queue | None             = None
        self._audio_in:  asyncio.Queue | None             = None
        self._ready:     threading.Event                  = threading.Event()
        self._player                                      = None
        self._pya                                         = pyaudio.PyAudio()
        self._send_lock: asyncio.Lock | None              = None

    def start(self, player=None):
        if not USE_LIVE_WS:
            return
        if self._thread and self._thread.is_alive():
            return
        self._player = player
        self._thread = threading.Thread(
            target=self._run_loop, daemon=True, name="VisionSessionThread"
        )
        self._thread.start()
        ok = self._ready.wait(timeout=20)
        if not ok:
            raise RuntimeError("Vision session did not start within 20s.")
        print("[ScreenProcess] ✅ Vision session ready (no mic)")

    def _run_loop(self):
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._main())

    async def _main(self):
        self._out_queue = asyncio.Queue(maxsize=30)
        self._audio_in  = asyncio.Queue()
        self._send_lock = asyncio.Lock()

        client = genai.Client(
            api_key=_get_api_key(),
            http_options={"api_version": "v1beta"}
        )

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            output_audio_transcription={},
            system_instruction=SYSTEM_PROMPT,
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Charon"
                    )
                )
            ),
        )

        while True:
            try:
                print("[ScreenProcess] 🔌 Vision session connecting...")
                async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
                    self._session = session
                    self._ready.set()
                    print("[ScreenProcess] ✅ Vision session connected")

                    async with asyncio.TaskGroup() as tg:
                        tg.create_task(self._send_loop())
                        tg.create_task(self._recv_loop())
                        tg.create_task(self._play_loop())

            except Exception as e:
                print(f"[ScreenProcess] ⚠️ Disconnected: {e} — reconnecting...")
                self._session = None
                self._ready.clear()
                await asyncio.sleep(2)
                self._ready.set()

    # ── Send loop ──

    async def _send_loop(self):
        """Sends (image_bytes, mime_type, user_text) tuples from queue."""
        while True:
            item = await self._out_queue.get()
            if self._session:
                image_bytes, mime_type, user_text = item
                try:
                    b64 = base64.b64encode(image_bytes).decode("utf-8")
                    await self._session.send_client_content(
                        turns={
                            "parts": [
                                {"inline_data": {"mime_type": mime_type, "data": b64}},
                                {"text": user_text}
                            ]
                        },
                        turn_complete=True
                    )
                    print("[ScreenProcess] ✅ Image sent")
                except Exception as e:
                    print(f"[ScreenProcess] ⚠️ Send error: {e}")

    async def _recv_loop(self):
        transcript_buf: list[str] = []
        try:
            async for response in self._session.receive():

                if response.data:
                    await self._audio_in.put(response.data)

                sc = response.server_content
                if not sc:
                    continue

                if sc.output_transcription and sc.output_transcription.text:
                    chunk = sc.output_transcription.text.strip()
                    if chunk:
                        transcript_buf.append(chunk)

                if sc.turn_complete:
                    if transcript_buf and self._player:
                        full = re.sub(r'\s+', ' ', " ".join(transcript_buf)).strip()
                        if full:
                            self._player.write_log(f"Brahma AI: {full}")
                            print(f"[ScreenProcess] 💬 {full}")
                    transcript_buf = []

        except Exception as e:
            print(f"[ScreenProcess] ⚠️ Recv error: {e}")
            transcript_buf = []
            await asyncio.sleep(0.3)

    async def _play_loop(self):
        stream = await asyncio.to_thread(
            self._pya.open,
            format=FORMAT, channels=CHANNELS,
            rate=RECEIVE_SAMPLE_RATE, output=True,
        )
        try:
            while True:
                chunk = await self._audio_in.get()
                await asyncio.to_thread(stream.write, chunk)
        finally:
            stream.close()

    def analyze(self, image_bytes: bytes, mime_type: str, user_text: str):
        """Called from main thread — puts image into async queue."""
        if not self._loop:
            return
        asyncio.run_coroutine_threadsafe(
            self._out_queue.put((image_bytes, mime_type, user_text)),
            self._loop
        )

    def is_ready(self) -> bool:
        return self._session is not None

_live       = _LiveSession()
_started    = False
_start_lock = threading.Lock()


def _ensure_started(player=None):
    global _started
    if not USE_LIVE_WS:
        return
    with _start_lock:
        if not _started:
            _live.start(player=player)
            _started = True
        elif player is not None:
            _live._player = player

def screen_process(
    parameters:     dict,
    response:       str | None = None,
    player=None,
    session_memory=None,
) -> bool:
    user_text = (parameters or {}).get("text") or (parameters or {}).get("user_text", "")
    user_text = (user_text or "").strip()
    if not user_text:
        print("[ScreenProcess] ⚠️ No user_text provided.")
        return False

    angle = (parameters or {}).get("angle", "screen").lower().strip()
    print(f"[ScreenProcess] angle={angle!r}  text={user_text!r}")

    if USE_LIVE_WS:
        _ensure_started(player=player)
        try:
            if angle == "camera":
                image_bytes = _capture_camera()
                mime_type   = "image/jpeg"
                print("[ScreenProcess] 📷 Camera captured")
            else:
                image_bytes = _capture_screenshot()
                mime_type   = "image/jpeg" if _PIL_OK else "image/png"
                print("[ScreenProcess] 🖥️ Screen captured")
        except Exception as e:
            import traceback; traceback.print_exc()
            print(f"[ScreenProcess] ❌ Capture error: {e}")
            return False
        print(f"[ScreenProcess] 📦 {len(image_bytes)} bytes → sending")
        _live.analyze(image_bytes, mime_type, user_text)
        return True

    # Non-live fallback: use sync model call
    answer = screen_process_sync(parameters, player=player)
    if player and answer:
        player.write_log(f"[ai] {answer}")
    return bool(answer)


def warmup_session(player=None):
    """
    Optional: pre-warm the session.
    Do NOT call from main.py — causes double session issue.
    Only use when testing screen_processor.py standalone.
    """
    try:
        _ensure_started(player=player)
    except Exception as e:
        print(f"[ScreenProcess] ⚠️ Warmup error: {e}")


def screen_process_sync(parameters: dict, player=None) -> str:
    user_text = (parameters or {}).get("text") or (parameters or {}).get("user_text", "")
    user_text = (user_text or "").strip()
    if not user_text:
        return "I need a visual question to analyze."

    angle = (parameters or {}).get("angle", "screen").lower().strip()
    try:
        if angle == "camera":
            image_bytes = _capture_camera()
            mime_type = "image/jpeg"
        else:
            image_bytes = _capture_screenshot()
            mime_type = "image/jpeg" if _PIL_OK else "image/png"
    except Exception as e:
        return f"I couldn't capture the {angle}. {e}"

    try:
        client = genai.Client(
            api_key=_get_api_key(),
            http_options={"api_version": "v1beta"}
        )
        contents = [
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            f"{VISION_DIRECT_PROMPT}\n\nUser request: {user_text}",
        ]
        result = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
        )
        answer_parts = []
        for candidate in getattr(result, "candidates", []) or []:
            content = getattr(candidate, "content", None)
            for part in getattr(content, "parts", []) or []:
                text = getattr(part, "text", None)
                if text:
                    answer_parts.append(text)
        answer = " ".join(part.strip() for part in answer_parts if part and part.strip()).strip()
        if player and answer:
            try:
                player.write_log(f"Brahma AI: {answer}")
            except Exception:
                pass
        return answer or "I analyzed the image, but I couldn't form a clear answer."
    except Exception as e:
        return f"I captured the image but couldn't analyze it: {e}"


if __name__ == "__main__":
    print("[TEST] screen_processor.py v8 — image-only session")
    print("=" * 50)
    mode    = input("screen / camera (default: screen): ").strip().lower() or "screen"
    request = input("Question (Enter for default): ").strip() or "What do you see? Be brief."

    t0 = time.perf_counter()
    warmup_session()
    print(f"Session ready — {time.perf_counter()-t0:.2f}s\n")

    t1     = time.perf_counter()
    result = screen_process({"angle": mode, "text": request}, player=None)
    print(f"Sent — {time.perf_counter()-t1:.3f}s | audio incoming...")
    time.sleep(8)
    print(f"\n{'✅' if result else '❌'}")
