import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, Notification, shell, NativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { SettingsStore } from './settings-store';
import { ProviderManager } from './providers/provider-manager';
import { TorrentManager } from './torrent/torrent-manager';
import { PlayerService } from './player-service';
import { AppDatabase } from './db/database';
import { ShowRepository } from './db/show-repository';
import { AuthStore } from './auth/auth-store';
import { HttpAddonProvider } from './providers/http-addon-provider';
import {
  startDownloadSchema,
  showSchema,
  episodeSchema,
  progressSchema,
  subscriptionSchema,
  validateSafeFilePath
} from './security/ipc-validator';
import { LibraryFile } from '../renderer/src/types/library';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Windows Application User Model ID & App Name for Taskbar & System Menus
app.name = 'shuunn';
app.setName('shuunn');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.shuunn.desktop');
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
(app as any).isQuitting = false;

// Initialize services
const settingsStore = new SettingsStore();
const providerManager = new ProviderManager(settingsStore);
const torrentManager = new TorrentManager();
const playerService = new PlayerService(settingsStore);
const appDatabase = new AppDatabase(settingsStore.appDataDir);
const showRepo = new ShowRepository(appDatabase);
const authStore = new AuthStore(settingsStore.appDataDir);

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function scanDirectoryForVideos(dirPath: string, activeIncompletePaths = new Set<string>()): LibraryFile[] {
  const videoExtensions = new Set(['.mkv', '.mp4', '.avi', '.webm']);
  const results: LibraryFile[] = [];

  if (!fs.existsSync(dirPath)) return results;

  function walk(currentDir: string, currentShow = '') {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath, entry.name);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (videoExtensions.has(ext)) {
            // 1. Skip if aria2 download control file exists (still downloading or aborted)
            if (fs.existsSync(fullPath + '.aria2')) {
              continue;
            }

            // 2. Skip if currently in active / waiting / paused download state
            const normPath = path.normalize(fullPath).toLowerCase();
            if (activeIncompletePaths.has(normPath)) {
              continue;
            }

            try {
              const stat = fs.statSync(fullPath);
              // 3. Skip stub/empty files (< 5MB)
              if (stat.size < 5 * 1024 * 1024) {
                continue;
              }

              results.push({
                filePath: fullPath,
                fileName: entry.name,
                showTitle: currentShow || path.basename(dirPath),
                size: stat.size,
                sizeFormatted: formatBytes(stat.size),
                modifiedAt: stat.mtime.toISOString()
              });
            } catch {
              // Ignore file stat errors
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[scanner] Error scanning directory ${currentDir}:`, err.message);
    }
  }

  walk(dirPath);
  return results.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
}

// Helper to locate brand assets in both development and packaged production
function getBrandAssetPath(relativePath: string): string | null {
  if (app?.isPackaged && process.resourcesPath) {
    const packagedPath = path.join(process.resourcesPath, relativePath);
    if (fs.existsSync(packagedPath)) return packagedPath;
  }
  const devPath = path.join(__dirname, '../../', relativePath);
  if (fs.existsSync(devPath)) return devPath;
  return null;
}

// Native System Notification Helper
function showNativeNotification({ title = 'shuunn', body = '', silent = false } = {}): boolean {
  try {
    if (!Notification.isSupported()) {
      return false;
    }

    const iconPath = getBrandAssetPath('brand/logos/shuunn-logomark.png');

    const notification = new Notification({
      title,
      body,
      icon: iconPath || undefined,
      silent
    });

    notification.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });

    notification.show();
    return true;
  } catch (err: any) {
    console.warn('[main] Failed to trigger notification:', err.message);
    return false;
  }
}

// Background poller state
const completedGids = new Set<string>();
let isInitialCheck = true;

async function checkDownloadCompletions() {
  try {
    const downloads = await torrentManager.getDownloads();
    if (!downloads || downloads.length === 0) return;

    if (isInitialCheck) {
      for (const d of downloads) {
        if (d.status === 'complete') {
          completedGids.add(d.id);
        }
      }
      isInitialCheck = false;
      return;
    }

    for (const d of downloads) {
      if (d.status === 'complete' && !completedGids.has(d.id)) {
        completedGids.add(d.id);

        const notifyPref = settingsStore.get('notifyOnComplete');
        if (notifyPref !== false) {
          showNativeNotification({
            title: 'Download Finished',
            body: `${d.title || 'Anime episode'} has completed successfully.`
          });
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download:completed', d);
        }
      }
    }
  } catch {
    // Daemon might be shutting down or busy
  }
}

function getTrayIcon(): NativeImage {
  const icoPath = getBrandAssetPath('brand/system-tray/tray-icon.ico');
  const pngPath = getBrandAssetPath('brand/system-tray/tray-16x16.png');

  if (icoPath) {
    try {
      return nativeImage.createFromPath(icoPath);
    } catch {}
  }
  if (pngPath) {
    try {
      return nativeImage.createFromPath(pngPath);
    } catch {}
  }

  // Fallback programmatic 16x16 icon
  return nativeImage.createEmpty();
}

function setupTray() {
  if (tray) return;

  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('shuunn - Your media, in motion.');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open shuunn',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Pause All Downloads',
      click: async () => {
        const downloads = await torrentManager.getDownloads();
        for (const d of downloads) {
          if (d.status === 'active') {
            await torrentManager.pause(d.id);
          }
        }
      }
    },
    {
      label: 'Resume All Downloads',
      click: async () => {
        const downloads = await torrentManager.getDownloads();
        for (const d of downloads) {
          if (d.status === 'paused') {
            await torrentManager.resume(d.id);
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  Menu.setApplicationMenu(null);

  const iconIco = getBrandAssetPath('brand/taskbar/taskbar-icon.ico');
  const iconPng = getBrandAssetPath('brand/taskbar/taskbar-256x256.png');

  let windowIcon: NativeImage | null = null;
  if (iconIco) {
    windowIcon = nativeImage.createFromPath(iconIco);
  } else if (iconPng) {
    windowIcon = nativeImage.createFromPath(iconPng);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    icon: windowIcon || undefined,
    backgroundColor: '#0B1220',
    title: 'shuunn',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0B1220',
      symbolColor: '#A7B8FF',
      height: 48
    },
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (windowIcon) {
    try {
      mainWindow.setIcon(windowIcon);
    } catch (err: any) {
      console.warn('[main] Could not set window icon:', err.message);
    }
  }

  mainWindow.setMenuBarVisibility(false);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    const loadDevServer = async () => {
      try {
        await mainWindow!.loadURL('http://localhost:5173');
      } catch {
        // Retry until Vite server is available
        setTimeout(loadDevServer, 500);
      }
    };
    loadDevServer();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
  });

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault();
      mainWindow!.hide();
    }
  });
}

// Register IPC handlers
function registerIpcHandlers() {
  // Catalog & Sources
  ipcMain.handle('catalog:get-releases', async () => {
    return await providerManager.getLatest();
  });

  ipcMain.handle('catalog:search-releases', async (_, query: string) => {
    return await providerManager.search(query);
  });

  ipcMain.handle('sources:get-all', () => {
    return providerManager.getAvailableProviders();
  });

  ipcMain.handle('sources:set-active', (_, id: string) => {
    providerManager.setActiveProvider(id);
    settingsStore.set('activeSourceId', id);
    return true;
  });

  ipcMain.handle('sources:add', async (_, manifestUrlOrJson: any) => {
    try {
      let manifest = manifestUrlOrJson;
      if (typeof manifestUrlOrJson === 'string') {
        const res = await fetch(manifestUrlOrJson);
        manifest = await res.json();
      }
      if (!manifest || !manifest.id || !manifest.endpoints) {
        throw new Error('Invalid source addon manifest');
      }
      const provider = new HttpAddonProvider(manifest);
      providerManager.registerProvider(provider);

      const installed = settingsStore.get('installedSources') || [];
      if (!installed.find(s => s.id === manifest.id)) {
        installed.push(manifest);
        settingsStore.set('installedSources', installed);
      }
      return { success: true, source: manifest };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('sources:remove', (_, id: string) => {
    providerManager.unregisterProvider(id);
    const installed = settingsStore.get('installedSources') || [];
    settingsStore.set('installedSources', installed.filter(s => s.id !== id));
    return { success: true };
  });

  // Torrent Manager & Downloads
  ipcMain.handle('torrent:start-download', async (_, rawOptions: any) => {
    const validated = startDownloadSchema.parse(rawOptions);
    const downloadDir = settingsStore.get('downloadDir');
    return await torrentManager.addDownload({
      ...validated,
      downloadDir
    });
  });

  ipcMain.handle('torrent:get-status', async () => {
    return await torrentManager.getDownloads();
  });

  ipcMain.handle('torrent:pause-download', async (_, id: string) => {
    return await torrentManager.pause(id);
  });

  ipcMain.handle('torrent:resume-download', async (_, id: string) => {
    return await torrentManager.resume(id);
  });

  ipcMain.handle('torrent:cancel-download', async (_, id: string) => {
    completedGids.delete(id);
    return await torrentManager.cancel(id);
  });

  ipcMain.handle('torrent:get-engines', () => {
    return torrentManager.getAvailableAdapters();
  });

  ipcMain.handle('torrent:set-engine', async (_, id: string) => {
    await torrentManager.setActiveAdapter(id);
    settingsStore.set('activeTorrentEngine', id);
    return true;
  });

  // Database (Local SQLite)
  ipcMain.handle('db:get-shows', () => {
    return showRepo.getAllShows();
  });

  ipcMain.handle('db:get-show', (_, id: string) => {
    return showRepo.getShowById(id);
  });

  ipcMain.handle('db:upsert-show', (_, rawShow: any) => {
    const validated = showSchema.parse(rawShow);
    return showRepo.upsertShow(validated);
  });

  ipcMain.handle('db:delete-show', (_, id: string) => {
    return showRepo.deleteShow(id);
  });

  ipcMain.handle('db:get-episodes', (_, showId: string) => {
    return showRepo.getEpisodesByShow(showId);
  });

  ipcMain.handle('db:upsert-episode', (_, rawEpisode: any) => {
    const validated = episodeSchema.parse(rawEpisode);
    return showRepo.upsertEpisode({
      ...validated,
      watched: validated.watched ? 1 : 0
    });
  });

  ipcMain.handle('db:mark-episode-watched', (_, { episodeId, watched }: { episodeId: string; watched?: boolean | number }) => {
    return showRepo.markEpisodeWatched(episodeId, watched);
  });

  ipcMain.handle('db:update-progress', (_, rawProgress: any) => {
    const { episodeId, progressSeconds, durationSeconds } = progressSchema.parse(rawProgress);
    return showRepo.updateProgress(episodeId, progressSeconds, durationSeconds);
  });

  ipcMain.handle('db:set-subscription', (_, rawSub: any) => {
    const { showId, enabled, preferredResolution } = subscriptionSchema.parse(rawSub);
    return showRepo.setSubscription(showId, enabled, preferredResolution);
  });

  ipcMain.handle('db:get-subscriptions', () => {
    return showRepo.getSubscriptions();
  });

  // Auth & Tracker Credentials
  ipcMain.handle('auth:get-accounts', () => {
    return authStore.getPublicAccounts();
  });

  ipcMain.handle('auth:set-account', (_, { service, username, token, refreshToken, expiresAt }: any) => {
    authStore.setAccount(service, { username, token, refreshToken, expiresAt });
    return { success: true };
  });

  ipcMain.handle('auth:disconnect-account', (_, service: string) => {
    authStore.removeAccount(service);
    return { success: true };
  });

  // Library
  ipcMain.handle('library:get-files', async () => {
    const downloadDir = settingsStore.get('downloadDir');
    const downloads = await torrentManager.getDownloads().catch(() => []);
    const activeIncompletePaths = new Set(
      downloads
        .filter(d => d.status !== 'complete' && d.filePath)
        .map(d => path.normalize(d.filePath!).toLowerCase())
    );
    return scanDirectoryForVideos(downloadDir, activeIncompletePaths);
  });

  ipcMain.handle('library:delete-file', async (_, filePath: string) => {
    if (!filePath) {
      return { success: false, message: 'File path required' };
    }
    try {
      const safePath = validateSafeFilePath(filePath);
      if (!fs.existsSync(safePath)) {
        return { success: false, message: 'File does not exist' };
      }

      await shell.trashItem(safePath);

      if (fs.existsSync(safePath + '.aria2')) {
        try { await shell.trashItem(safePath + '.aria2'); } catch {}
      }

      try {
        const downloads = await torrentManager.getDownloads();
        const norm = path.normalize(safePath).toLowerCase();
        for (const d of downloads) {
          if (d.filePath && path.normalize(d.filePath).toLowerCase() === norm) {
            completedGids.delete(d.id);
            await torrentManager.cancel(d.id);
          }
        }
      } catch {}

      const parentDir = path.dirname(safePath);
      const downloadDir = settingsStore.get('downloadDir');
      if (path.resolve(parentDir) !== path.resolve(downloadDir)) {
        try {
          const remaining = fs.readdirSync(parentDir);
          if (remaining.length === 0) {
            await shell.trashItem(parentDir);
          }
        } catch {}
      }
      return { success: true };
    } catch (err: any) {
      console.error('[main] Failed to delete library file:', err);
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('system:get-storage-info', async () => {
    const downloadDir = settingsStore.get('downloadDir');
    return {
      downloadDir,
      exists: fs.existsSync(downloadDir)
    };
  });

  // Media Player
  ipcMain.handle('player:play', async (_, filePath: string) => {
    return await playerService.playVideo(filePath);
  });

  ipcMain.handle('player:reveal', async (_, filePath: string) => {
    return await playerService.revealFile(filePath);
  });

  ipcMain.handle('player:test', async (_, customPath?: string) => {
    return await playerService.testPlayer(customPath);
  });

  // Settings
  ipcMain.handle('settings:get', () => {
    return settingsStore.getAll();
  });

  ipcMain.handle('settings:save', (_, newSettings: any) => {
    return settingsStore.update(newSettings);
  });

  // Native System Notifications
  ipcMain.handle('system:show-notification', (_, options = {}) => {
    return showNativeNotification(options);
  });

  // Windows Titlebar Theme Overlay (Min, Max, Close buttons)
  ipcMain.handle('window:set-titlebar-theme', (_, theme: 'dark' | 'light') => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    try {
      if (theme === 'light') {
        mainWindow.setTitleBarOverlay({
          color: '#F4F6FB',
          symbolColor: '#0B1220',
          height: 48
        });
      } else {
        mainWindow.setTitleBarOverlay({
          color: '#0B1220',
          symbolColor: '#A7B8FF',
          height: 48
        });
      }
      return true;
    } catch (err: any) {
      console.warn('[main] Could not update titlebar overlay:', err.message);
      return false;
    }
  });

  // Native Dialogs
  ipcMain.handle('dialog:select-folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:select-file', async (_, filters = []) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: filters.length ? filters : [{ name: 'Executables (*.exe)', extensions: ['exe'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}

// Windows Application User Model ID
if (process.platform === 'win32') {
  app.setAppUserModelId('shuunn.desktop');
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize SQLite database
  try {
    await appDatabase.init();
  } catch (err) {
    console.error('[main] Error initializing SQLite database:', err);
  }

  // Apply saved source and engine preferences
  const savedSource = settingsStore.get('activeSourceId');
  if (savedSource) {
    try { providerManager.setActiveProvider(savedSource); } catch {}
  }

  // Initialize torrent manager
  const savedEngine = settingsStore.get('activeTorrentEngine') || 'aria2';
  try {
    if (torrentManager.activeAdapterId !== savedEngine) {
      await torrentManager.setActiveAdapter(savedEngine);
    } else {
      await torrentManager.init();
    }
  } catch (err) {
    console.error('[main] Error initializing torrent manager:', err);
  }

  registerIpcHandlers();
  setupTray();
  createWindow();

  // Background monitor for download completions
  setInterval(checkDownloadCompletions, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('before-quit', async () => {
  (app as any).isQuitting = true;
  console.log('[main] Closing SQLite database and shutting down torrent engine...');
  try {
    appDatabase.close();
  } catch (err) {
    console.warn('[main] Error closing database:', err);
  }

  try {
    await torrentManager.shutdown();
  } catch (err) {
    console.warn('[main] Error shutting down torrent manager:', err);
  }
});
