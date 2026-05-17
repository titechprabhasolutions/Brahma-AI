const { app, BrowserWindow, ipcMain, shell, globalShortcut, clipboard, screen, dialog } = require('electron');
const { spawn, exec } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

let mainWindow = null;
let miniWindow = null;
let backendProcess = null;
let cursorBubble = null;
let screenBorderWindow = null;
let screenBorderTimer = null;
let screenBorderMonitor = null;
let cursorBubbleHideTimer = null;
let cursorSelection = '';
let clipboardWatchTimer = null;
let lastClipboardText = '';
let suppressNextClipboard = false;
let miniDockCollapsed = false;
const projectRoot = path.resolve(__dirname, '..');
const userHome = os.homedir();
const localAppData = process.env.LOCALAPPDATA || path.join(userHome, 'AppData', 'Local');
// In dev, keep Chromium profile under TEMP to avoid "Access is denied" crashes caused by
// Controlled Folder Access / AV policies on certain folders.
const devUserDataRoot = path.join(os.tmpdir(), 'BrahmaAI-dev-profile');
const userDataRoot = app.isPackaged
  ? path.join(localAppData, 'BrahmaAI')
  : devUserDataRoot;
const electronDataDir = userDataRoot;
const electronCacheDir = path.join(electronDataDir, 'Cache');
const electronQuotaDir = path.join(electronDataDir, 'Quota');
const appStatePath = path.join(electronDataDir, 'app-state.json');
const electronConfigDir = path.join(electronDataDir, 'config');
let singleInstanceLock = true;
let activeWinModulePromise = null;

app.setAppUserModelId('com.brahma.ai');

// Some Windows security/AV setups (including McAfee hardened policies) can break Chromium's
// sandbox/AppContainer startup with "platform_channel.cc: Access is denied".
// Running without the renderer sandbox avoids this fatal crash.
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-features', 'RendererAppContainer,NetworkServiceSandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
// Extra stability for hardened Windows setups.
try { app.disableHardwareAcceleration(); } catch (_e) {}

function swallowEpipe(stream) {
  if (!stream || typeof stream.write !== 'function') return;
  const originalWrite = stream.write.bind(stream);
  stream.write = (chunk, encoding, cb) => {
    try {
      return originalWrite(chunk, encoding, cb);
    } catch (err) {
      if (err && err.code === 'EPIPE') return false;
      throw err;
    }
  };
  stream.on('error', (err) => {
    if (err && err.code === 'EPIPE') return;
    throw err;
  });
}

fs.mkdirSync(electronCacheDir, { recursive: true });
fs.mkdirSync(electronQuotaDir, { recursive: true });
fs.mkdirSync(electronConfigDir, { recursive: true });
app.commandLine.appendSwitch('user-data-dir', electronDataDir);
app.commandLine.appendSwitch('disk-cache-dir', electronCacheDir);
app.commandLine.appendSwitch('media-cache-size', '0');
app.commandLine.appendSwitch('disk-cache-size', '1');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');
app.setPath('userData', electronDataDir);
app.setPath('sessionData', electronDataDir);
app.setPath('cache', electronCacheDir);
singleInstanceLock = app.requestSingleInstanceLock();

// Prevent crashing when stdout/stderr are broken (e.g., launched detached).
swallowEpipe(process.stdout);
swallowEpipe(process.stderr);

function loadAppState() {
  try {
    if (!fs.existsSync(appStatePath)) {
      return {
        onboardingComplete: false,
        userEmail: '',
        firebaseUserId: '',
        userName: '',
        userPhotoUrl: '',
        projectWorkspacePath: '',
        projectWorkspaceName: '',
      };
    }
    return JSON.parse(fs.readFileSync(appStatePath, 'utf-8'));
  } catch (error) {
    return {
      onboardingComplete: false,
      userEmail: '',
      firebaseUserId: '',
      userName: '',
      userPhotoUrl: '',
      projectWorkspacePath: '',
      projectWorkspaceName: '',
    };
  }
}

function resolveBackendCommand() {
  // Packaged: prefer bundled backend exe
  if (app.isPackaged) {
    const bundledExe = path.join(process.resourcesPath, 'backend', 'brahma-backend.exe');
    if (fs.existsSync(bundledExe)) {
      return { command: bundledExe, args: [], cwd: path.dirname(bundledExe) };
    }
  }

  const backendScript = path.join(projectRoot, 'bridge_backend.py');

  // Dev/local: if we have a backend exe that is at least as new as the Python entrypoint,
  // prefer it (no Python dependency, matches what gets shipped). Otherwise fall back to Python.
  const localExe = path.join(projectRoot, 'brahma-backend.exe');
  const localExeStat = fs.existsSync(localExe) ? fs.statSync(localExe) : null;
  const scriptStat = fs.existsSync(backendScript) ? fs.statSync(backendScript) : null;
  const exeLooksFresh = !!(localExeStat && scriptStat && localExeStat.mtimeMs >= scriptStat.mtimeMs);
  if (localExeStat && exeLooksFresh) {
    return { command: localExe, args: [], cwd: projectRoot };
  }

  // Dev: use env override, then local venv, then a known local Python install, then system python.
  const envPython = process.env.BRAHMA_PYTHON;

  if (envPython && fs.existsSync(envPython)) {
    return { command: envPython, args: [backendScript], cwd: projectRoot };
  }

  const venvPython = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvPython)) {
    return { command: venvPython, args: [backendScript], cwd: projectRoot };
  }

  const userHome = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || path.join(userHome, 'AppData', 'Local');
  const pythonCandidates = [
    path.join(userHome, 'Miniconda3', 'python.exe'),
    path.join(userHome, 'Anaconda3', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python310', 'python.exe'),
  ];

  for (const candidate of pythonCandidates) {
    if (fs.existsSync(candidate)) {
      return { command: candidate, args: [backendScript], cwd: projectRoot };
    }
  }

  const localBkExe = path.join(projectRoot, 'bk', 'brahma-backend.exe');
  if (fs.existsSync(localBkExe)) {
    return { command: localBkExe, args: [], cwd: path.join(projectRoot, 'bk') };
  }

  return { command: 'python', args: [backendScript], cwd: projectRoot };
}

function resolveBackendCandidates() {
  // Always try the primary resolution first.
  const primary = resolveBackendCommand();
  const candidates = [primary];

  // In dev: if primary isn't the local exe, add it as a fallback (and vice-versa).
  if (!app.isPackaged) {
    const backendScript = path.join(projectRoot, 'bridge_backend.py');
    const localExe = path.join(projectRoot, 'brahma-backend.exe');
    if (fs.existsSync(localExe) && primary.command !== localExe) {
      candidates.push({ command: localExe, args: [], cwd: projectRoot });
    }

    // Python fallbacks (helpful if an AV blocks spawning the exe).
    const userHome = os.homedir();
    const localAppData = process.env.LOCALAPPDATA || path.join(userHome, 'AppData', 'Local');
    const pythonCandidates = [
      path.join(userHome, 'Miniconda3', 'python.exe'),
      path.join(userHome, 'Anaconda3', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python310', 'python.exe'),
    ];
    for (const py of pythonCandidates) {
      if (fs.existsSync(py) && primary.command !== py) {
        candidates.push({ command: py, args: [backendScript], cwd: projectRoot });
      }
    }
  }

  // De-dupe by command+args.
  const seen = new Set();
  return candidates.filter((c) => {
    const key = `${c.command}::${(c.args || []).join(' ')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanupStaleBackends() {
  return new Promise((resolve) => {
    try {
      const marker = path.join(projectRoot, 'bridge_backend.py');
      const psCommand = [
        '$marker = [regex]::Escape($args[0])',
        "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'python.exe' -and $_.CommandLine -match $marker } | ForEach-Object {",
        '  try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {}',
        '}',
        // Also kill any previously launched packaged backends to avoid port conflicts.
        "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'brahma-backend.exe' -or $_.Name -eq 'brahma-backend' } | ForEach-Object {",
        '  try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {}',
        '}',
      ].join('; ');
      const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand, marker], {
        windowsHide: true,
      });
      child.on('exit', () => resolve());
      child.on('error', () => resolve());
    } catch (_error) {
      resolve();
    }
  });
}

function saveAppState(nextState) {
  const current = loadAppState();
  const merged = { ...current, ...nextState };
  fs.mkdirSync(path.dirname(appStatePath), { recursive: true });
  fs.writeFileSync(appStatePath, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

async function readActiveWindow() {
  try {
    if (!activeWinModulePromise) {
      activeWinModulePromise = import('active-win');
    }
    const mod = await activeWinModulePromise;
    const fn = mod?.default;
    if (!fn) return null;
    const win = await fn();
    if (!win) return null;
    return {
      title: String(win.title || ''),
      owner: String((win.owner && win.owner.name) || ''),
      bundleId: String((win.owner && win.owner.bundleId) || ''),
      path: String((win.owner && win.owner.path) || ''),
      url: String(win.url || ''),
      bounds: win.bounds || null,
      memoryUsage: Number(win.memoryUsage || 0),
      ts: Date.now(),
    };
  } catch (_error) {
    return null;
  }
}

function defaultProjectsRoot() {
  return path.join(os.homedir(), 'Documents', 'Brahma Projects');
}

async function startBackend() {
  await cleanupStaleBackends();
  const candidates = resolveBackendCandidates();
  let lastError = null;

  for (const candidate of candidates) {
    const { command, args, cwd } = candidate;
    try {
      backendProcess = spawn(command, args, {
        cwd,
        env: {
          ...(() => {
            const env = { ...process.env };
            delete env.GOOGLE_API_KEY;
            delete env.GEMINI_API_KEY;
            return env;
          })(),
          BRAHMA_BACKEND_PORT: '8770',
          BRAHMA_CONFIG_DIR: path.join(electronDataDir, 'config'),
          BRAHMA_LOG_FILE: path.join(electronDataDir, 'backend.log'),
        },
        // Some AV suites block hidden child processes; if we fail with EPERM we retry
        // other candidates (including Python) automatically.
        windowsHide: true,
      });

      backendProcess.stdout.on('data', () => {});
      backendProcess.stderr.on('data', () => {});

      backendProcess.on('exit', () => {
        backendProcess = null;
      });

      backendProcess.on('error', (error) => {
        try {
          console.error('[backend] spawn error', error);
        } catch (_err) {}
      });

      return;
    } catch (error) {
      lastError = error;
      backendProcess = null;
      try {
        console.error('[backend] spawn failed', command, error);
      } catch (_err) {}
    }
  }

  throw lastError || new Error('Failed to start backend.');
}

async function waitForBackendReady(timeoutMs = 15000) {
  const startedAt = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch('http://127.0.0.1:8770/health', { timeout: 2000 });
      if (res.ok) return true;
    } catch (_error) {
      // ignore; will retry
    }
    if (Date.now() - startedAt > timeoutMs) {
      return false;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

async function ensureBackendReady() {
  const ok = await waitForBackendReady(18000);
  if (ok) return true;
  // One restart attempt to handle transient failures/port conflicts on boot.
  try {
    if (backendProcess) {
      backendProcess.kill();
      backendProcess = null;
    }
  } catch (_err) {}
  await startBackend();
  return await waitForBackendReady(18000);
}

if (!singleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  restoreMainWindow();
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
    return;
  }
  restoreMainWindow();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 700,
    // Show immediately; we still keep the "reveal" logic as a safety net.
    show: true,
    autoHideMenuBar: true,
    // Strict monochrome UI baseline (renderer draws everything).
    backgroundColor: '#000000',
    title: 'Brahma AI',
    // Use the app icon everywhere (taskbar/window). Windows prefers .ico.
    icon: path.join(__dirname, 'assets', 'brahma.ico'),
    // Native frame enabled (reliable on Windows; avoids custom titlebar glitches).
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      partition: 'temp:brahma-main',
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  const revealMainWindow = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    mainWindow.setSkipTaskbar(false);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false);
      }
    }, 1200);
  };
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // Ensure the window is visible even if `ready-to-show` never fires.
  try { mainWindow.show(); } catch (_e) {}
  mainWindow.once('ready-to-show', revealMainWindow);
  mainWindow.webContents.once('did-finish-load', revealMainWindow);
  setTimeout(revealMainWindow, 2500);
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
    showMiniWindow();
  });
  mainWindow.on('maximize', () => {
    try { mainWindow.webContents.send('window-maximized-changed', true); } catch (_e) {}
  });
  mainWindow.on('unmaximize', () => {
    try { mainWindow.webContents.send('window-maximized-changed', false); } catch (_e) {}
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createCursorBubble() {
  if (cursorBubble) return cursorBubble;
  cursorBubble = new BrowserWindow({
    width: 300,
    height: 126,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'cursor-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  cursorBubble.loadFile(path.join(__dirname, 'renderer', 'cursor-bubble.html'));
  cursorBubble.on('blur', () => {
    scheduleCursorBubbleHide(300);
  });
  cursorBubble.on('closed', () => {
    cursorBubble = null;
  });
  return cursorBubble;
}

function clearCursorBubbleHideTimer() {
  if (cursorBubbleHideTimer) {
    clearTimeout(cursorBubbleHideTimer);
    cursorBubbleHideTimer = null;
  }
}

function scheduleCursorBubbleHide(delayMs = 1200) {
  clearCursorBubbleHideTimer();
  cursorBubbleHideTimer = setTimeout(() => {
    if (cursorBubble && !cursorBubble.isDestroyed()) {
      cursorBubble.hide();
    }
    cursorBubbleHideTimer = null;
  }, Math.max(120, Number(delayMs) || 1200));
}

function createScreenBorderWindow() {
  if (screenBorderWindow) return screenBorderWindow;
  const { bounds } = screen.getPrimaryDisplay();
  screenBorderWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  screenBorderWindow.setIgnoreMouseEvents(true, { forward: true });
  screenBorderWindow.loadFile(path.join(__dirname, 'renderer', 'screen-border.html'));
  screenBorderWindow.on('closed', () => {
    screenBorderWindow = null;
  });
  return screenBorderWindow;
}

function hideScreenBorderEffect() {
  if (screenBorderTimer) {
    clearTimeout(screenBorderTimer);
    screenBorderTimer = null;
  }
  if (screenBorderMonitor) {
    clearInterval(screenBorderMonitor);
    screenBorderMonitor = null;
  }
  if (screenBorderWindow && !screenBorderWindow.isDestroyed()) {
    screenBorderWindow.hide();
  }
}

function showScreenBorderEffect(durationMs = 2200) {
  const overlay = createScreenBorderWindow();
  if (!overlay) return;
  const { bounds } = screen.getPrimaryDisplay();
  overlay.setBounds(bounds);
  overlay.showInactive();
  if (screenBorderTimer) {
    clearTimeout(screenBorderTimer);
  }
  screenBorderTimer = setTimeout(() => {
    hideScreenBorderEffect();
    screenBorderTimer = null;
  }, Math.max(600, Number(durationMs) || 2200));
}

async function keepScreenBorderWhileSpeaking(maxMs = 30000) {
  showScreenBorderEffect(maxMs);
  const startedAt = Date.now();
  let sawActiveState = false;
  if (screenBorderMonitor) {
    clearInterval(screenBorderMonitor);
    screenBorderMonitor = null;
  }
  screenBorderMonitor = setInterval(async () => {
    if (Date.now() - startedAt > maxMs) {
      hideScreenBorderEffect();
      return;
    }
    try {
      const response = await fetch('http://127.0.0.1:8770/api/state');
      const state = await response.json();
      const status = String(state?.status || '').toUpperCase();
      const isActive = ['PROCESSING', 'RESPONDING', 'SPEAKING', 'ANALYZING', 'LISTENING'].includes(status);
      if (isActive) {
        sawActiveState = true;
        return;
      }
      if (sawActiveState || status === 'ONLINE' || status === 'ERROR' || status === 'OFFLINE') {
        hideScreenBorderEffect();
      }
    } catch (_error) {
      if (sawActiveState) {
        hideScreenBorderEffect();
      }
    }
  }, 250);
}

function shouldShowMiniScreenBorder(text) {
  const value = String(text || '').toLowerCase();
  const keywords = [
    'what am i doing',
    "what i'm doing",
    'what is on my screen',
    "what's on my screen",
    'whats on my screen',
    'tell me what i am doing',
    'tell me what im doing',
    'tell me what is on my screen',
    'tell me what is on screen',
    'observe my screen',
    'analyze my screen',
    'analyse my screen',
    'screen',
    'screenshot',
    'camera',
  ];
  return keywords.some((keyword) => value.includes(keyword));
}

function sendCtrlC() {
  return new Promise((resolve) => {
    exec("powershell -command \"$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('^c')\"", () => resolve());
  });
}

async function captureSelection() {
  const before = clipboard.readText();
  clipboard.clear();
  await sendCtrlC();
  await new Promise((r) => setTimeout(r, 140));
  const text = clipboard.readText().trim().slice(0, 1200);
  clipboard.writeText(before);
  return text;
}

async function showCursorBubble() {
  try {
    if ((mainWindow && mainWindow.isFocused()) || (miniWindow && miniWindow.isFocused())) {
      return;
    }
    const selection = await captureSelection();
    if (!selection) return;
    cursorSelection = selection;
    const bubble = createCursorBubble();
    const { x, y } = screen.getCursorScreenPoint();
    bubble.setPosition(x + 12, y + 12, false);
    bubble.webContents.send('cursor-selection', selection);
    bubble.showInactive();
    scheduleCursorBubbleHide(1200);
    suppressNextClipboard = true; // avoid immediate re-trigger from our own copy
  } catch (err) {
    // ignore
  }
}

function createMiniWindow() {
  miniWindow = new BrowserWindow({
    width: 388,
    height: 186,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    movable: true,
    acceptFirstMouse: true,
    show: false,
    backgroundColor: '#081328',
    icon: path.join(__dirname, 'assets', 'brahma.png'),
    webPreferences: {
      preload: path.join(__dirname, 'mini-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      partition: 'temp:brahma-mini',
    },
  });

  snapMiniWindowToCorner();
  miniWindow.loadFile(path.join(__dirname, 'renderer', 'mini.html'));
  miniWindow.webContents.on('did-finish-load', () => {
    miniWindow.setIgnoreMouseEvents(false);
    miniWindow.webContents.focus();
    miniWindow.webContents.send('mini-dock-state', { collapsed: miniDockCollapsed });
  });
  miniWindow.on('close', (event) => {
    if (mainWindow) {
      event.preventDefault();
      restoreMainWindow();
    }
  });
}

function snapMiniWindowToCorner() {
  if (!miniWindow) {
    return;
  }
  const { width, height } = miniWindow.getBounds();
  const { workArea } = require('electron').screen.getPrimaryDisplay();
  miniWindow.setPosition(
    workArea.x + workArea.width - width - 18,
    workArea.y + workArea.height - height - 18
  );
}

function showMiniWindow() {
  if (!miniWindow) {
    createMiniWindow();
  }
  miniWindow.setIgnoreMouseEvents(false);
  miniWindow.show();
  miniWindow.setFocusable(true);
  miniWindow.focus();
  miniWindow.webContents.focus();
}

function restoreMainWindow() {
  if (miniWindow) {
    miniWindow.hide();
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.restore();
    mainWindow.focus();
  }
}

function toggleMiniDock() {
  if (!miniWindow) {
    return;
  }
  miniDockCollapsed = !miniDockCollapsed;
  const bounds = miniWindow.getBounds();
  const nextWidth = miniDockCollapsed ? 72 : 388;
  const nextHeight = miniDockCollapsed ? 72 : 186;
  miniWindow.setBounds({
    x: bounds.x,
    y: bounds.y,
    width: nextWidth,
    height: nextHeight,
  });
  if (miniDockCollapsed) {
    snapMiniWindowToCorner();
  }
  miniWindow.webContents.send('mini-dock-state', { collapsed: miniDockCollapsed });
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    // Avoid race conditions on first launch: renderer immediately fetches `/api/state`
    // and saves the API key. Wait until the backend is actually listening.
    await ensureBackendReady();
  } catch (error) {
    // Do not crash the entire app if the backend is blocked (common with AV suites).
    // The UI can still open and guide the user to allow-list the backend binary.
    try {
      dialog.showMessageBox({
        type: 'error',
        title: 'Backend Blocked',
        message: 'Brahma AI could not start its backend service.',
        detail:
          'This is usually caused by antivirus (McAfee) blocking a child process. ' +
          'Please allow-list `brahma-backend.exe` in your Brahma folder and restart.\n\n' +
          `Details: ${error?.message || error}`,
      });
    } catch (_err) {}
  }

  createWindow();
  createCursorBubble();
  globalShortcut.register('Control+Shift+A', showCursorBubble);
  // clipboard watcher: auto pop when new clipboard text appears
  clipboardWatchTimer = setInterval(() => {
    try {
      const text = clipboard.readText();
      if (!text || text === lastClipboardText) return;
      lastClipboardText = text;
      if (suppressNextClipboard) { suppressNextClipboard = false; return; }
      if ((mainWindow && mainWindow.isFocused()) || (miniWindow && miniWindow.isFocused())) return;
      const trimmed = text.trim().slice(0, 1200);
      if (!trimmed) return;
      cursorSelection = trimmed;
      const bubble = createCursorBubble();
      const { x, y } = screen.getCursorScreenPoint();
      bubble.setPosition(x + 12, y + 12, false);
      bubble.webContents.send('cursor-selection', trimmed);
      bubble.showInactive();
      scheduleCursorBubbleHide(1200);
    } catch (err) {
      console.error('[cursor] clipboard watch error', err);
    }
  }, 800);
});

ipcMain.handle('restore-main-window', () => {
  restoreMainWindow();
});

ipcMain.handle('window-minimize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  mainWindow.minimize();
  return { ok: true };
});

ipcMain.handle('window-maximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  mainWindow.maximize();
  return { ok: true };
});

ipcMain.handle('window-unmaximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  mainWindow.unmaximize();
  return { ok: true };
});

ipcMain.handle('window-is-maximized', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, maximized: false };
  return { ok: true, maximized: mainWindow.isMaximized() };
});

ipcMain.handle('window-close', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  mainWindow.close();
  return { ok: true };
});

ipcMain.handle('toggle-mini-dock', () => {
  toggleMiniDock();
});

ipcMain.handle('mini-send-command', async (_event, text) => {
  const value = String(text || '').trim();
  if (!value) {
    return { ok: false, error: 'missing_text' };
  }
  const state = loadAppState();
  if (shouldShowMiniScreenBorder(value)) {
    keepScreenBorderWhileSpeaking();
  }
  try {
    const response = await fetch('http://127.0.0.1:8770/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: value,
        projectWorkspacePath: state.projectWorkspacePath || '',
        projectWorkspaceName: state.projectWorkspaceName || '',
      }),
    });
    return await response.json().catch(() => ({ ok: response.ok }));
  } catch (error) {
    return { ok: false, error: error?.message || 'mini_send_failed' };
  }
});

ipcMain.handle('mini-start-sequence', async (_event, name) => {
  const value = String(name || '').trim();
  if (!value) {
    return { ok: false, error: 'missing_name' };
  }
  try {
    const response = await fetch('http://127.0.0.1:8770/api/sequence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', name: value }),
    });
    return await response.json().catch(() => ({ ok: response.ok }));
  } catch (error) {
    return { ok: false, error: error?.message || 'mini_sequence_failed' };
  }
});

ipcMain.handle('get-app-state', () => {
  return loadAppState();
});

ipcMain.handle('save-app-state', (_, nextState) => {
  return saveAppState(nextState || {});
});

ipcMain.handle('get-launch-on-startup', () => {
  try {
    // On Windows/macOS this returns the OS login item state.
    const settings = app.getLoginItemSettings();
    return { ok: true, enabled: !!settings.openAtLogin };
  } catch (error) {
    return { ok: false, enabled: false, error: String(error?.message || error) };
  }
});

ipcMain.handle('set-launch-on-startup', (_event, enabled) => {
  try {
    const shouldEnable = !!enabled;
    // For packaged builds, process.execPath is the installed exe.
    // For dev, this may point at electron.exe; it's still safe.
    app.setLoginItemSettings({
      openAtLogin: shouldEnable,
      path: process.execPath,
      args: [],
    });
    const after = app.getLoginItemSettings();
    return { ok: true, enabled: !!after.openAtLogin };
  } catch (error) {
    return { ok: false, enabled: false, error: String(error?.message || error) };
  }
});

ipcMain.handle('get-active-window', async () => {
  const info = await readActiveWindow();
  return info || {
    title: '',
    owner: '',
    bundleId: '',
    path: '',
    url: '',
    bounds: null,
    memoryUsage: 0,
    ts: Date.now(),
  };
});

ipcMain.handle('pick-project-folder', async () => {
  const window = mainWindow || miniWindow || BrowserWindow.getFocusedWindow();
  const current = loadAppState();
  const root = defaultProjectsRoot();
  try {
    fs.mkdirSync(root, { recursive: true });
  } catch (_error) {}
  const result = await dialog.showOpenDialog(window || undefined, {
    title: 'Choose Brahma Project Workspace',
    defaultPath: current.projectWorkspacePath || root,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, cancelled: true };
  }
  const folderPath = result.filePaths[0];
  const payload = {
    path: folderPath,
    name: path.basename(folderPath),
  };
  saveAppState({
    projectWorkspacePath: payload.path,
    projectWorkspaceName: payload.name,
  });
  return { ok: true, ...payload };
});

ipcMain.handle('create-project-folder', async (_event, rawName) => {
  const name = String(rawName || '').trim();
  if (!name) {
    return { ok: false, error: 'missing_name' };
  }
  const safeName = name.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_').replace(/\s+/g, ' ').trim();
  if (!safeName) {
    return { ok: false, error: 'invalid_name' };
  }
  const root = defaultProjectsRoot();
  const target = path.join(root, safeName);
  try {
    fs.mkdirSync(target, { recursive: true });
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
  saveAppState({
    projectWorkspacePath: target,
    projectWorkspaceName: path.basename(target),
  });
  return {
    ok: true,
    path: target,
    name: path.basename(target),
  };
});

ipcMain.handle('open-external-url', (_, url) => {
  if (!url) {
    return false;
  }
  shell.openExternal(String(url));
  return true;
});

ipcMain.handle('cursor-hide', () => {
  clearCursorBubbleHideTimer();
  cursorBubble?.hide();
  return true;
});

ipcMain.handle('cursor-hover', (_event, hovering) => {
  if (hovering) {
    clearCursorBubbleHideTimer();
  } else {
    scheduleCursorBubbleHide(600);
  }
  return true;
});

ipcMain.handle('cursor-act', async (_event, { action, selection }) => {
  if (!selection) return false;
  const prompt =
    action === 'summarize'
      ? `Summarize this: "${selection}"`
      : action === 'rewrite'
        ? `Rewrite this more clearly: "${selection}"`
        : `Explain this simply: "${selection}"`;
  try {
    await fetch(`http://localhost:8770/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: prompt }),
    });
  } catch (_err) {
    // ignore network errors
  }
  clearCursorBubbleHideTimer();
  cursorBubble?.hide();
  return true;
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  // keep running background helper; quit only on explicit close
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  clearCursorBubbleHideTimer();
  hideScreenBorderEffect();
  if (backendProcess) {
    backendProcess.kill();
  }
});
