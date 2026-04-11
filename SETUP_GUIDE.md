Brahma AI setup (Windows)
=========================

This guide starts from a clean repo (no virtualenv, no node_modules, no cached Electron data).

1) Prerequisites
----------------
- Windows 10/11 with admin rights.
- Python 3.10+ on PATH (match the path you will plug into `electron/main.js`).
- Node.js 20+ (comes with npm).
- Visual C++ Build Tools (needed if `pyaudio` wheel is not prebuilt).
- Git, and a microphone if you plan to use voice.

2) Get the code
---------------
```powershell
git clone <repo-url>
cd Mark-XXX-main\Mark-XXX-main
```

3) Python environment
---------------------
```powershell
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
# Playwright needs its runtime binaries
python -m playwright install
```

4) Configure keys and settings
------------------------------
- You no longer paste the Gemini key manually: the auth screen in the app asks for it on first launch and writes it into `config/api_keys.json`.
- If you need to change cameras, update `camera_index` in `config/api_keys.json` after first run (0 = default).
- Optional: update `config/workflows.json` for custom sequences, `config/kasa_devices.json` for TP-Link devices, and `config/clipboard_history.json` seed data.

5) Match Python path for Electron
---------------------------------
`electron/main.js` currently points to `C:\Users\ravit\AppData\Local\Programs\Python\Python313\python.exe`.
Change the `pythonExe` constant in that file to the Python you will run (e.g., `python.exe` inside `.venv`).

6) Install Electron deps and run the desktop app
-----------------------------------------------
```powershell
npm install
npm start
```
`npm start` launches Electron and auto-spawns `bridge_backend.py` using the `pythonExe` path above.

7) Run backend manually (alternative)
-------------------------------------
If you prefer to run the backend yourself:
```powershell
.\.venv\Scripts\activate
python bridge_backend.py
```
It listens on `127.0.0.1:8770` (override with `BRAHMA_BACKEND_PORT`).

8) Quick CLI-only run
---------------------
```powershell
.\.venv\Scripts\activate
python main.py
```

9) First-run checklist
----------------------
- Confirm the Gemini key is valid.
- Allow microphone permissions on first prompt.
- If Electron shows a blank screen, ensure the backend is running and the Python path in `electron/main.js` is correct.

Resetting the workspace
-----------------------
If you need a fresh start later, you can safely delete `.venv`, `node_modules`, and `C:\Users\<you>\AppData\Local\BrahmaAI` (Electron cache), then repeat steps 3 and 6.
