import asyncio
import json
import sys
from pathlib import Path

from kasa import Discover


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = get_base_dir()
KASA_CACHE_PATH = BASE_DIR / "config" / "kasa_devices.json"


def _save_devices(devices: list[dict]) -> None:
    KASA_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    KASA_CACHE_PATH.write_text(json.dumps(devices, indent=2, ensure_ascii=False), encoding="utf-8")


def _load_devices() -> list[dict]:
    if not KASA_CACHE_PATH.exists():
        return []
    try:
        data = json.loads(KASA_CACHE_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


async def _discover_devices_async() -> list[dict]:
    found = await Discover.discover(timeout=6)
    devices = []
    for host, device in found.items():
        try:
            await device.update()
            alias = getattr(device, "alias", None) or getattr(device, "device_alias", None) or host
            is_on = bool(getattr(device, "is_on", False))
            model = getattr(device, "model", "unknown")
            devices.append({
                "host": host,
                "alias": alias,
                "model": model,
                "is_on": is_on,
            })
        except Exception:
            continue
    _save_devices(devices)
    return devices


def _find_target(devices: list[dict], name: str) -> dict | None:
    target = name.strip().lower()
    if not target:
        return devices[0] if devices else None
    for device in devices:
        alias = str(device.get("alias", "")).lower()
        host = str(device.get("host", "")).lower()
        if target in alias or alias in target or target == host:
            return device
    return None


async def _control_device_async(action: str, target: dict) -> str:
    host = target["host"]
    device = await Discover.discover_single(host)
    await device.update()

    if action == "on":
        await device.turn_on()
        return f"Turned on {target['alias']}."
    if action == "off":
        await device.turn_off()
        return f"Turned off {target['alias']}."
    if action == "toggle":
        if getattr(device, "is_on", False):
            await device.turn_off()
            return f"Turned off {target['alias']}."
        await device.turn_on()
        return f"Turned on {target['alias']}."

    state = "on" if getattr(device, "is_on", False) else "off"
    return f"{target['alias']} is currently {state}."


def kasa_control(parameters: dict, response=None, player=None, session_memory=None) -> str:
    action = str((parameters or {}).get("action") or "discover").strip().lower()
    device_name = str((parameters or {}).get("device_name") or "").strip()

    if action == "discover":
        devices = asyncio.run(_discover_devices_async())
        if not devices:
            return "No Kasa devices found on the local network."
        lines = [
            f"{index}. {device['alias']} ({device['model']}) - {'on' if device['is_on'] else 'off'}"
            for index, device in enumerate(devices, start=1)
        ]
        return "Kasa devices found:\n" + "\n".join(lines)

    devices = _load_devices()
    if not devices:
        devices = asyncio.run(_discover_devices_async())
    if not devices:
        return "No Kasa devices found. Try discovery first."

    target = _find_target(devices, device_name)
    if not target:
        return f"I couldn't find a Kasa device matching '{device_name}'."

    result = asyncio.run(_control_device_async(action, target))
    refreshed = asyncio.run(_discover_devices_async())
    if player:
        try:
            player.write_log(f"[kasa] {result}")
        except Exception:
            pass
    return result
