const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('miniDock', {
  restore: () => ipcRenderer.invoke('restore-main-window'),
  toggle: () => ipcRenderer.invoke('toggle-mini-dock'),
  sendCommand: (text) => ipcRenderer.invoke('mini-send-command', String(text || '')),
  startSequence: (name) => ipcRenderer.invoke('mini-start-sequence', String(name || '')),
  onState: (callback) => ipcRenderer.on('mini-dock-state', (_, state) => callback(state)),
});
