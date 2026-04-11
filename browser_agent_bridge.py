import json
import queue
import subprocess
import threading
from pathlib import Path


class BrowserAgentBridge:
    def __init__(self, root_dir: Path):
        self.root_dir = Path(root_dir)
        self.process = None
        self._stdout_queue = queue.Queue()
        self._lock = threading.Lock()
        self._reader_thread = None

    def _start_process(self):
        if self.process and self.process.poll() is None:
            return
        server_path = self.root_dir / "browser-agent" / "server.js"
        if not server_path.exists():
            raise RuntimeError("browser-agent server.js not found.")
        self.process = subprocess.Popen(
            ["node", str(server_path)],
            cwd=str(server_path.parent),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        self._stdout_queue = queue.Queue()
        self._reader_thread = threading.Thread(target=self._read_stdout, daemon=True)
        self._reader_thread.start()

    def _read_stdout(self):
        if not self.process or not self.process.stdout:
            return
        for line in self.process.stdout:
            self._stdout_queue.put(line.strip())

    def request(self, payload: dict, timeout: float = 60.0) -> dict:
        with self._lock:
            self._start_process()
            if not self.process or not self.process.stdin:
                raise RuntimeError("Browser agent process not available.")
            self.process.stdin.write(json.dumps(payload) + "\n")
            self.process.stdin.flush()
            try:
                raw = self._stdout_queue.get(timeout=timeout)
            except queue.Empty:
                raise TimeoutError("Browser agent did not respond.")
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return {"ok": False, "error": raw}

    def run_command(self, command: str) -> dict:
        return self.request({"type": "command", "text": command})

    def close(self):
        if not self.process:
            return
        try:
            self.request({"type": "close"}, timeout=5)
        except Exception:
            pass
        try:
            self.process.terminate()
        except Exception:
            pass
        self.process = None

