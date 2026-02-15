const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  dbQuery: (sql, params) => ipcRenderer.invoke('db-query', sql, params)
});
