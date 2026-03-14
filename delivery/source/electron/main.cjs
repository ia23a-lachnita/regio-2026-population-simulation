const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database.cjs');
const { verifySeedState } = require('../scripts/verify-seed-state.cjs');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

if (process.env.APP_USER_DATA_DIR) {
  app.setPath('userData', process.env.APP_USER_DATA_DIR);
}

// Suppress Electron security warnings in development
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Disable hardware acceleration for VM/remote desktop compatibility
// Must be called before app is ready
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,UseSkiaRenderer');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('no-sandbox');

// Log level: 'debug', 'info', 'warn', 'error' (default: 'info')
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
const shouldLog = (level) => logLevels[level] >= logLevels[LOG_LEVEL];

async function createWindow() {
  if (shouldLog('info')) console.log('[Main] Initializing database...');
  await db.initDatabase();

  if (process.env.SEED_CONTRACT_PATH && process.env.DB_RESET_JSON_PATH) {
    const dbPath = path.join(app.getPath('userData'), 'app.db');
    const seedResult = verifySeedState({
      dbPath,
      contractPath: process.env.SEED_CONTRACT_PATH,
      outputPath: process.env.DB_RESET_JSON_PATH,
    });

    if (seedResult.result !== 'PASS') {
      throw new Error(`Seed verification failed for ${dbPath}`);
    }
  }

  if (['1', 'true', 'yes'].includes(String(process.env.DB_INIT_ONLY || '').toLowerCase())) {
    if (shouldLog('info')) console.log('[Main] DB_INIT_ONLY enabled. Database initialized, exiting.');
    app.exit(0);
    return;
  }

  if (shouldLog('info')) console.log('[Main] Creating window...');
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
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
    win.focus();
  });

  // Suppress DevTools autofill errors
  win.webContents.on('devtools-opened', () => {
    win.webContents.devToolsWebContents?.executeJavaScript(`
      DevToolsAPI.getPreferences().then(prefs => {
        prefs.disablePausedStateOverlay = true;
      });
    `).catch(() => {});
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

// Open file dialog for loading world state
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    return { path: result.filePaths[0], content };
  } catch (e) {
    console.error('[Main] Failed to read file:', e);
    return null;
  }
});

// Save file dialog
ipcMain.handle('save-file-dialog', async (event, content) => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    defaultPath: 'world-state.json'
  });
  if (result.canceled || !result.filePath) return false;
  try {
    fs.writeFileSync(result.filePath, content, 'utf8');
    return true;
  } catch (e) {
    console.error('[Main] Failed to write file:', e);
    return false;
  }
});

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error('[Main] Startup failed:', error);
    dialog.showErrorBox('Startup Error', error?.stack || String(error));
    app.exit(1);
    return;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error) => {
        console.error('[Main] Failed to create window on activate:', error);
      });
    }
  });
});

process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
  if (app.isReady()) {
    dialog.showErrorBox('Uncaught Exception', error?.stack || String(error));
  }
  app.exit(1);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
