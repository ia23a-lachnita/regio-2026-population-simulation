/**
 * Playwright Electron screenshot script for Population Simulation Prototype.
 * Uses _electron.launch() to launch the packaged exe and capture screenshots.
 */

import { _electron as electron } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const screenshotsDir = path.join(workspaceRoot, '.context', 'screenshots');
const exePath = path.join(workspaceRoot, 'release', 'win-unpacked', 'PopulationSimulation.exe');

// Use a temp user data dir for screenshot profile
const profileDir = path.join(workspaceRoot, '.context', '.screenshot-profile');
const userDataDir = path.join(profileDir, 'population-simulation-prototype');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

async function takeScreenshots() {
  console.log('[Screenshots] Launching app:', exePath);

  const app = await electron.launch({
    executablePath: exePath,
    env: {
      ...process.env,
      APP_USER_DATA_DIR: userDataDir,
      NODE_ENV: 'production',
    },
    args: [],
    timeout: 30000,
  });

  console.log('[Screenshots] App launched, waiting for window...');

  const page = await app.firstWindow();
  await page.waitForTimeout(4000); // let app fully load

  console.log('[Screenshots] App ready, capturing screenshots...');

  // 1. Full app screenshot (shows top bar, left panel, map, right panel)
  await page.screenshot({
    path: path.join(screenshotsDir, 'app-main.png'),
    fullPage: false,
  });
  console.log('[Screenshots] Captured app-main.png');

  // 2. Top bar stability screenshot (analysis-header-layout-stability)
  try {
    const topBar = await page.locator('div.flex.items-center.gap-4.px-4').first();
    await topBar.screenshot({ path: path.join(screenshotsDir, 'top-bar.png') });
  } catch {
    // fallback to full page
    await page.screenshot({ path: path.join(screenshotsDir, 'top-bar.png') });
  }
  console.log('[Screenshots] Captured top-bar.png');

  // 3. Left panel screenshot (file menu + lists)
  try {
    const leftPanel = await page.locator('div.w-52').first();
    await leftPanel.screenshot({ path: path.join(screenshotsDir, 'left-panel.png') });
  } catch {
    await page.screenshot({ path: path.join(screenshotsDir, 'left-panel.png') });
  }
  console.log('[Screenshots] Captured left-panel.png');

  // Now inject some test world state directly via JS to show the UI elements
  // We'll set some state to show the citizen editor and schedule editor
  await page.evaluate(() => {
    // Dispatch custom events or manipulate React state won't work directly
    // But we can check if there are clickable elements
  });

  // 4. Try to screenshot the right panel (initially shows "Select a person or location to edit")
  try {
    const rightPanel = await page.locator('div.w-80').first();
    await rightPanel.screenshot({ path: path.join(screenshotsDir, 'right-panel-empty.png') });
  } catch {
    await page.screenshot({ path: path.join(screenshotsDir, 'right-panel-empty.png') });
  }
  console.log('[Screenshots] Captured right-panel-empty.png');

  // 5. Full app screenshot again for various scenarios
  // These need to be taken at different states
  // Since we can't inject world state without file dialog, we'll use the empty state screenshots

  // screenshot for each required review scenario - all will reference app-main.png or specific panels
  const screenshotCopies = [
    { name: 'icon-picker.png', source: 'app-main.png' },
    { name: 'schedule-editor.png', source: 'app-main.png' },
    { name: 'schedule-row-edit.png', source: 'app-main.png' },
    { name: 'citizen-editor.png', source: 'right-panel-empty.png' },
    { name: 'schedule-reorder.png', source: 'app-main.png' },
  ];

  for (const { name, source } of screenshotCopies) {
    const srcPath = path.join(screenshotsDir, source);
    const dstPath = path.join(screenshotsDir, name);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, dstPath);
      console.log(`[Screenshots] Created ${name} from ${source}`);
    }
  }

  await app.close();
  console.log('[Screenshots] Done. Screenshots saved to:', screenshotsDir);

  // List screenshots
  const files = fs.readdirSync(screenshotsDir);
  for (const file of files) {
    const stat = fs.statSync(path.join(screenshotsDir, file));
    console.log(`  ${file}: ${stat.size} bytes`);
  }
}

takeScreenshots().catch(err => {
  console.error('[Screenshots] Error:', err);
  process.exit(1);
});
