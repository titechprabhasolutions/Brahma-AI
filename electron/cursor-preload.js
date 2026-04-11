const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cursorAPI', {
  onSelection: (cb) => ipcRenderer.on('cursor-selection', (_e, sel) => cb(sel)),
  hide: () => ipcRenderer.invoke('cursor-hide'),
  act: (action, selection) => ipcRenderer.invoke('cursor-act', { action, selection }),
  hover: (state) => ipcRenderer.invoke('cursor-hover', !!state),
});
