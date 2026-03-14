const { contextBridge, ipcRenderer } = require('electron');

// Forward console logs to main process
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  originalLog(...args);
  ipcRenderer.send('console-log', 'log', args);
};

console.error = (...args) => {
  originalError(...args);
  ipcRenderer.send('console-log', 'error', args);
};

console.warn = (...args) => {
  originalWarn(...args);
  ipcRenderer.send('console-log', 'warn', args);
};

contextBridge.exposeInMainWorld('electron', {
  dbQuery: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: (content) => ipcRenderer.invoke('save-file-dialog', content),
});
