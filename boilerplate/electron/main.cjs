const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./database.cjs');
const { verifySeedState } = require('../scripts/verify-seed-state.cjs');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

if (process.env.APP_USER_DATA_DIR) {
  app.setPath('userData', process.env.APP_USER_DATA_DIR);
}

// Suppress Electron security warnings in development
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Disable GPU acceleration issues and autofill errors
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-dev-shm-usage');

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
    width: 1200,
    height: 800,
    show: false, // Don't show until ready
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
    // Show and focus window after content is loaded
    win.show();
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
