# actions/reminder.py

import subprocess
import os
import sys
import threading
import time
from datetime import datetime, timedelta

_ACTIVE_REMINDERS = {}


def _deliver_reminder(message: str) -> None:
    safe_message = message.replace('"', '').replace("'", "").strip()[:200] or "Reminder"
    try:
        import winsound
        for freq in [800, 1000, 1200]:
            winsound.Beep(freq, 200)
            time.sleep(0.1)
    except Exception:
        pass

    try:
        from win10toast import ToastNotifier
        ToastNotifier().show_toast(
            "Brahma AI Reminder",
            safe_message,
            duration=15,
            threaded=False
        )
        return
    except Exception:
        pass

    try:
        subprocess.run(["msg", "*", "/TIME:30", safe_message], shell=True)
    except Exception:
        pass


def _schedule_local_reminder(task_name: str, target_dt: datetime, message: str) -> None:
    delay = max(1.0, (target_dt - datetime.now()).total_seconds())

    def _run():
        try:
            _deliver_reminder(message)
        finally:
            _ACTIVE_REMINDERS.pop(task_name, None)

    timer = threading.Timer(delay, _run)
    timer.daemon = True
    _ACTIVE_REMINDERS[task_name] = timer
    timer.start()


def reminder(
    parameters: dict,
    response: str | None = None,
    player=None,
    session_memory=None
) -> str:
    """
    Sets a timed reminder using Windows Task Scheduler.

    parameters:
        - date    (str) YYYY-MM-DD
        - time    (str) HH:MM
        - message (str)

    Returns a result string — Live API voices it automatically.
    No edge_speak needed.
    """

    date_str = parameters.get("date")
    time_str = parameters.get("time")
    message  = parameters.get("message", "Reminder")

    if not date_str or not time_str:
        return "I need both a date and a time to set a reminder."

    try:
        target_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        now = datetime.now()

        if target_dt <= now:
            return "That time is already in the past."

        task_name    = f"Brahma AIReminder_{target_dt.strftime('%Y%m%d_%H%M')}"
        safe_message = message.replace('"', '').replace("'", "").strip()[:200]

        # For short reminders while Brahma AI is running, use an in-process timer.
        # This is much more reliable than Task Scheduler for "in 1 minute" requests.
        if target_dt <= now + timedelta(minutes=30):
            _schedule_local_reminder(task_name, target_dt, safe_message)
            if player:
                player.write_log(f"[reminder] local timer set for {target_dt.strftime('%Y-%m-%d %H:%M')}")
            return f"Reminder set for {target_dt.strftime('%B %d at %I:%M %p')}."

        python_exe = sys.executable
        if python_exe.lower().endswith("python.exe"):
            pythonw = python_exe.replace("python.exe", "pythonw.exe")
            if os.path.exists(pythonw):
                python_exe = pythonw

        temp_dir      = os.environ.get("TEMP", "C:\\Temp")
        notify_script = os.path.join(temp_dir, f"{task_name}.pyw")
        project_root  = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..")
        )

        script_code = f'''import sys, os, time
sys.path.insert(0, r"{project_root}")

try:
    import winsound
    for freq in [800, 1000, 1200]:
        winsound.Beep(freq, 200)
        time.sleep(0.1)
except Exception:
    pass

try:
    from win10toast import ToastNotifier
    ToastNotifier().show_toast(
        "Brahma AI Reminder",
        "{safe_message}",
        duration=15,
        threaded=False
    )
except Exception:
    try:
        import subprocess
        subprocess.run(["msg", "*", "/TIME:30", "{safe_message}"], shell=True)
    except Exception:
        pass

time.sleep(3)
try:
    os.remove(__file__)
except Exception:
    pass
'''
        with open(notify_script, "w", encoding="utf-8") as f:
            f.write(script_code)

        xml_content = f'''<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Brahma AI Reminder: {safe_message}</Description>
  </RegistrationInfo>
  <Triggers>
    <TimeTrigger>
      <StartBoundary>{target_dt.strftime("%Y-%m-%dT%H:%M:%S")}</StartBoundary>
      <Enabled>true</Enabled>
    </TimeTrigger>
  </Triggers>
  <Actions>
    <Exec>
      <Command>{python_exe}</Command>
      <Arguments>"{notify_script}"</Arguments>
    </Exec>
  </Actions>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <WakeToRun>true</WakeToRun>
    <ExecutionTimeLimit>PT5M</ExecutionTimeLimit>
    <Enabled>true</Enabled>
  </Settings>
  <Principals>
    <Principal>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
</Task>'''

        xml_path = os.path.join(temp_dir, f"{task_name}.xml")
        with open(xml_path, "w", encoding="utf-16") as f:
            f.write(xml_content)

        result = subprocess.run(
            f'schtasks /Create /TN "{task_name}" /XML "{xml_path}" /F',
            shell=True, capture_output=True, text=True
        )

        try:
            os.remove(xml_path)
        except Exception:
            pass

        if result.returncode != 0:
            err = result.stderr.strip() or result.stdout.strip()
            print(f"[Reminder] ❌ schtasks failed: {err}")
            try:
                os.remove(notify_script)
            except Exception:
                pass
            return "I couldn't schedule the reminder due to a system error."

        if player:
            player.write_log(f"[reminder] set for {target_dt.strftime('%Y-%m-%d %H:%M')}")

        return f"Reminder set for {target_dt.strftime('%B %d at %I:%M %p')}."

    except ValueError:
        return "I couldn't understand that date or time format."

    except Exception as e:
        return f"Something went wrong while scheduling the reminder: {str(e)[:80]}"
