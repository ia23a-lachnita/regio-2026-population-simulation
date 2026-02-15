const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

async function createWindow() {
  await db.initDatabase();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

ipcMain.handle('db-query', async (event, sql, params) => {
  try {
    return await db.query(sql, params);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
