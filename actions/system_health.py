from pathlib import Path
import subprocess

try:
    import psutil
except ImportError:
    psutil = None


def _windows_fallback() -> str:
    commands = [
        (
            "cpu",
            ["powershell", "-NoProfile", "-Command", "(Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples.CookedValue"],
        ),
        (
            "memory",
            ["powershell", "-NoProfile", "-Command", "$os=Get-CimInstance Win32_OperatingSystem; [math]::Round((($os.TotalVisibleMemorySize-$os.FreePhysicalMemory)/$os.TotalVisibleMemorySize)*100,0)"],
        ),
        (
            "disk",
            ["powershell", "-NoProfile", "-Command", "$d=Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='C:'\"; [math]::Round((($d.Size-$d.FreeSpace)/$d.Size)*100,0)"],
        ),
    ]

    values = {}
    for key, command in commands:
        result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=5)
        values[key] = result.stdout.strip().splitlines()[-1].strip() if result.stdout.strip() else "unknown"

    return "\n".join(
        [
            f"CPU: {values['cpu'][:5]}%",
            f"Memory: {values['memory']}% used",
            f"Disk: {values['disk']}% used",
        ]
    )


def system_health(parameters: dict, response=None, player=None, session_memory=None) -> str:
    if psutil is None:
        return _windows_fallback()

    action = str((parameters or {}).get("action") or "summary").strip().lower()

    cpu = psutil.cpu_percent(interval=0.3)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage(str(Path.home().anchor or "C:\\")) if Path.home().anchor else psutil.disk_usage("/")
    battery = psutil.sensors_battery()

    if action == "processes":
        processes = []
        for proc in psutil.process_iter(["name", "memory_percent", "cpu_percent"]):
            info = proc.info
            if not info.get("name"):
                continue
            processes.append(info)
        top = sorted(processes, key=lambda item: (item.get("cpu_percent") or 0, item.get("memory_percent") or 0), reverse=True)[:5]
        return "\n".join(
            f"{item['name']}: CPU {item.get('cpu_percent', 0):.0f}% MEM {item.get('memory_percent', 0):.1f}%"
            for item in top
        ) or "No process data available."

    lines = [
        f"CPU: {cpu:.0f}%",
        f"Memory: {memory.percent:.0f}% used ({memory.available / (1024 ** 3):.1f} GB free)",
        f"Disk: {disk.percent:.0f}% used ({disk.free / (1024 ** 3):.1f} GB free)",
    ]
    if battery is not None:
        lines.append(f"Battery: {battery.percent:.0f}% {'charging' if battery.power_plugged else 'on battery'}")
    if cpu >= 85:
        lines.append("Warning: CPU usage is very high right now.")
    if memory.percent >= 85:
        lines.append("Warning: Memory usage is very high right now.")
    return "\n".join(lines)
