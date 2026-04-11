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
// Use a local, writable data directory in dev to avoid permission issues.
const devDataRoot = path.join(projectRoot, 'electron-data');
const userDataRoot = app.isPackaged
  ? path.join(os.homedir(), 'AppData', 'Local', 'BrahmaAI')
  : devDataRoot;
const electronDataDir = userDataRoot;
const electronCacheDir = path.join(electronDataDir, 'Cache');
const electronQuotaDir = path.join(electronDataDir, 'Quota');
const appStatePath = path.join(electronDataDir, 'app-state.json');
const electronConfigDir = path.join(electronDataDir, 'config');
let singleInstanceLock = true;
let activeWinModulePromise = null;

app.setAppUserModelId('com.brahma.ai');

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

  // Dev: use env override, then local venv, then system python
  const envPython = process.env.BRAHMA_PYTHON;
  const backendScript = path.join(projectRoot, 'bridge_backend.py');

  if (envPython && fs.existsSync(envPython)) {
    return { command: envPython, args: [backendScript], cwd: projectRoot };
  }

  const venvPython = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvPython)) {
    return { command: venvPython, args: [backendScript], cwd: projectRoot };
  }

  return { command: 'python', args: [backendScript], cwd: projectRoot };
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
  const { command, args, cwd } = resolveBackendCommand();
  backendProcess = spawn(command, args, {
    cwd,
    env: {
      ...process.env,
      BRAHMA_BACKEND_PORT: '8770',
      BRAHMA_CONFIG_DIR: path.join(electronDataDir, 'config'),
      BRAHMA_LOG_FILE: path.join(electronDataDir, 'backend.log'),
    },
    windowsHide: true,
  });

  backendProcess.stdout.on('data', () => {});

  backendProcess.stderr.on('data', () => {});

  backendProcess.on('exit', () => {
    backendProcess = null;
  });
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
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#07101d',
    title: 'Brahma AI',
    icon: path.join(__dirname, 'assets', 'brahma.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
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
  mainWindow.once('ready-to-show', revealMainWindow);
  mainWindow.webContents.once('did-finish-load', revealMainWindow);
  setTimeout(revealMainWindow, 2500);
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
    showMiniWindow();
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
  await startBackend();
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
