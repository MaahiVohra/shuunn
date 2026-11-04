import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI, StartDownloadOptions } from '../renderer/src/types/electron';
import { AddonManifest } from '../renderer/src/types/release';
import { AppSettings } from '../renderer/src/types/settings';
import { ShowRecord, EpisodeRecord } from '../renderer/src/types/database';
import { DownloadItemModel } from '../renderer/src/types/download';

const api: ElectronAPI = {
  // Content Sources / Release Catalog (Addon Protocol)
  getReleases: () => ipcRenderer.invoke('catalog:get-releases'),
  searchReleases: (query: string) => ipcRenderer.invoke('catalog:search-releases', query),
  getProviders: () => ipcRenderer.invoke('sources:get-all'),
  setProvider: (providerId: string) => ipcRenderer.invoke('sources:set-active', providerId),
  getSources: () => ipcRenderer.invoke('sources:get-all'),
  setSource: (sourceId: string) => ipcRenderer.invoke('sources:set-active', sourceId),
  addSource: (manifestUrlOrJson: string | AddonManifest) => ipcRenderer.invoke('sources:add', manifestUrlOrJson),
  removeSource: (sourceId: string) => ipcRenderer.invoke('sources:remove', sourceId),

  // Torrent Engine Downloads
  startDownload: (options: StartDownloadOptions) => ipcRenderer.invoke('torrent:start-download', options),
  pauseDownload: (id: string) => ipcRenderer.invoke('torrent:pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('torrent:resume-download', id),
  cancelDownload: (id: string) => ipcRenderer.invoke('torrent:cancel-download', id),
  getDownloadsStatus: () => ipcRenderer.invoke('torrent:get-status'),
  getTorrentEngines: () => ipcRenderer.invoke('torrent:get-engines'),
  setTorrentEngine: (engineId: string) => ipcRenderer.invoke('torrent:set-engine', engineId),

  // Library & File Management
  getLibraryFiles: () => ipcRenderer.invoke('library:get-files'),
  deleteLibraryFile: (filePath: string) => ipcRenderer.invoke('library:delete-file', filePath),
  getStorageInfo: () => ipcRenderer.invoke('system:get-storage-info'),

  // Media Player Playback
  playInMpvnet: (filePath: string) => ipcRenderer.invoke('player:play', filePath),
  revealFile: (filePath: string) => ipcRenderer.invoke('player:reveal', filePath),
  testPlayer: (customPath?: string) => ipcRenderer.invoke('player:test', customPath),

  // Settings & OS Dialogs
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:save', settings),
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
  selectFile: (filters?: { name: string; extensions: string[] }[]) => ipcRenderer.invoke('dialog:select-file', filters),

  // Local SQLite Database
  getShows: () => ipcRenderer.invoke('db:get-shows'),
  getShow: (id: string) => ipcRenderer.invoke('db:get-show', id),
  upsertShow: (show: Partial<ShowRecord> & { id: string; title: string }) => ipcRenderer.invoke('db:upsert-show', show),
  deleteShow: (id: string) => ipcRenderer.invoke('db:delete-show', id),
  getEpisodes: (showId: string) => ipcRenderer.invoke('db:get-episodes', showId),
  upsertEpisode: (episode: Partial<EpisodeRecord> & { id: string; showId: string; episodeNum: string }) =>
    ipcRenderer.invoke('db:upsert-episode', episode),
  markEpisodeWatched: (episodeId: string, watched?: boolean | number) =>
    ipcRenderer.invoke('db:mark-episode-watched', { episodeId, watched }),
  updateProgress: (episodeId: string, progressSeconds: number, durationSeconds: number) =>
    ipcRenderer.invoke('db:update-progress', { episodeId, progressSeconds, durationSeconds }),
  setSubscription: (showId: string, enabled?: boolean | number, preferredResolution?: string) =>
    ipcRenderer.invoke('db:set-subscription', { showId, enabled, preferredResolution }),
  getSubscriptions: () => ipcRenderer.invoke('db:get-subscriptions'),

  // External Tracker Accounts (AniList / MAL)
  getAuthAccounts: () => ipcRenderer.invoke('auth:get-accounts'),
  setAuthAccount: (service: string, data: { username?: string; token: string; refreshToken?: string; expiresAt?: string }) =>
    ipcRenderer.invoke('auth:set-account', { service, ...data }),
  disconnectAuthAccount: (service: string) => ipcRenderer.invoke('auth:disconnect-account', service),

  // Native System Notifications & Completion Events
  showNotification: (options: { title?: string; body?: string; silent?: boolean }) =>
    ipcRenderer.invoke('system:show-notification', options),
  setTitleBarTheme: (theme: 'dark' | 'light') =>
    ipcRenderer.invoke('window:set-titlebar-theme', theme),
  onDownloadComplete: (callback: (task: DownloadItemModel) => void) => {
    const listener = (_: any, task: DownloadItemModel) => callback(task);
    ipcRenderer.on('download:completed', listener);
    return () => ipcRenderer.removeListener('download:completed', listener);
  }
};

contextBridge.exposeInMainWorld('electronAPI', api);
