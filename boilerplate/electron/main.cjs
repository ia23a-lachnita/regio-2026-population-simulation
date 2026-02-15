const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database.cjs');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Suppress Electron security warnings in development
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Log level: 'debug', 'info', 'warn', 'error' (default: 'info')
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
const shouldLog = (level) => logLevels[level] >= logLevels[LOG_LEVEL];

async function createWindow() {
  if (shouldLog('info')) console.log('[Main] Initializing database...');
  await db.initDatabase();

  if (shouldLog('info')) console.log('[Main] Creating window...');
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    if (shouldLog('debug')) console.log('[Main] Loading development URL: http://localhost:5173');
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools();
  } else {
    if (shouldLog('info')) console.log('[Main] Loading production build');
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.webContents.on('did-finish-load', () => {
    if (shouldLog('info')) console.log('[Main] Window finished loading');
  });
}

// Handle console logs from renderer process
ipcMain.on('console-log', (event, level, args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  switch (level) {
    case 'error':
      console.error('[Renderer]', message);
      break;
    case 'warn':
      console.warn('[Renderer]', message);
      break;
    default:
      console.log('[Renderer]', message);
  }
});

ipcMain.handle('db-query', async (event, sql, params) => {
  try {
    if (shouldLog('debug')) console.log('[Main] Executing query:', sql, params);
    const result = await db.query(sql, params);
    if (shouldLog('debug')) console.log('[Main] Query result:', result);
    return result;
  } catch (error) {
    console.error('[Main] Database query error:', error);
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
