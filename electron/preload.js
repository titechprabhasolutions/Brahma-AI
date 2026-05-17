const { contextBridge, ipcRenderer } = require('electron');
const QRCode = require('qrcode');

contextBridge.exposeInMainWorld('brahma', {
  backendUrl: 'http://127.0.0.1:8770',
  getAppState: () => ipcRenderer.invoke('get-app-state'),
  saveAppState: (state) => ipcRenderer.invoke('save-app-state', state),
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  pickProjectFolder: () => ipcRenderer.invoke('pick-project-folder'),
  createProjectFolder: (name) => ipcRenderer.invoke('create-project-folder', name),
  getLaunchOnStartup: () => ipcRenderer.invoke('get-launch-on-startup'),
  setLaunchOnStartup: (enabled) => ipcRenderer.invoke('set-launch-on-startup', !!enabled),
  // windowControls reserved (native frame enabled)
  windowControls: null,
  generateQrDataUrl: async (text) => QRCode.toDataURL(String(text || ''), {
    margin: 1,
    width: 320,
    color: {
      // Strict monochrome QR so it matches the app theme.
      dark: '#000000',
      light: '#ffffff',
    },
  }),
});

contextBridge.exposeInMainWorld('desktop', {
  restoreMainWindow: () => ipcRenderer.invoke('restore-main-window'),
  toggleMiniDock: () => ipcRenderer.invoke('toggle-mini-dock'),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  onMiniDockState: (callback) => ipcRenderer.on('mini-dock-state', (_, state) => callback(state)),
});
