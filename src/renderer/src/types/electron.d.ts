import { ReleaseItem, AddonManifest } from './release';
import { DownloadItemModel } from './download';
import { LibraryFile } from './library';
import { AppSettings } from './settings';
import { ShowRecord, EpisodeRecord, SubscriptionRecord } from './database';
import { AuthAccountsState } from './auth';

export interface StartDownloadOptions {
  magnet: string;
  title?: string;
  showTitle?: string;
  episode?: string;
  resolution?: string;
}

export interface ElectronAPI {
  // Content Sources / Catalog
  getReleases: () => Promise<ReleaseItem[]>;
  searchReleases: (query: string) => Promise<ReleaseItem[]>;
  getProviders: () => Promise<{ id: string; displayName: string; description?: string }[]>;
  setProvider: (providerId: string) => Promise<boolean>;
  getSources: () => Promise<{ id: string; displayName: string; description?: string }[]>;
  setSource: (sourceId: string) => Promise<boolean>;
  addSource: (manifestUrlOrJson: string | AddonManifest) => Promise<{ success: boolean; source?: AddonManifest; message?: string }>;
  removeSource: (sourceId: string) => Promise<{ success: boolean }>;

  // Torrent Engine Downloads
  startDownload: (options: StartDownloadOptions) => Promise<{ id: string }>;
  pauseDownload: (id: string) => Promise<boolean>;
  resumeDownload: (id: string) => Promise<boolean>;
  cancelDownload: (id: string) => Promise<boolean>;
  getDownloadsStatus: () => Promise<DownloadItemModel[]>;
  getTorrentEngines: () => Promise<{ id: string; displayName: string; description?: string }[]>;
  setTorrentEngine: (engineId: string) => Promise<boolean>;

  // Library & File Management
  getLibraryFiles: () => Promise<LibraryFile[]>;
  deleteLibraryFile: (filePath: string) => Promise<{ success: boolean; message?: string }>;
  getStorageInfo: () => Promise<{ downloadDir: string; exists: boolean }>;

  // Media Player Playback
  playInMpvnet: (filePath: string) => Promise<{ success: boolean; fallback?: boolean }>;
  revealFile: (filePath: string) => Promise<boolean>;
  testPlayer: (customPath?: string) => Promise<{ success: boolean; message?: string; fallback?: boolean }>;

  // Settings & OS Dialogs
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  selectFolder: () => Promise<string | null>;
  selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;

  // Local SQLite Database
  getShows: () => Promise<ShowRecord[]>;
  getShow: (id: string) => Promise<ShowRecord | null>;
  upsertShow: (show: Partial<ShowRecord> & { id: string; title: string }) => Promise<void>;
  deleteShow: (id: string) => Promise<void>;
  getEpisodes: (showId: string) => Promise<EpisodeRecord[]>;
  upsertEpisode: (episode: Partial<EpisodeRecord> & { id: string; showId: string; episodeNum: string }) => Promise<void>;
  markEpisodeWatched: (episodeId: string, watched?: boolean | number) => Promise<void>;
  updateProgress: (episodeId: string, progressSeconds: number, durationSeconds: number) => Promise<void>;
  setSubscription: (showId: string, enabled?: boolean | number, preferredResolution?: string) => Promise<void>;
  getSubscriptions: () => Promise<SubscriptionRecord[]>;

  // External Tracker Accounts (AniList / MAL)
  getAuthAccounts: () => Promise<AuthAccountsState>;
  setAuthAccount: (service: string, data: { username?: string; token: string; refreshToken?: string; expiresAt?: string }) => Promise<{ success: boolean }>;
  disconnectAuthAccount: (service: string) => Promise<{ success: boolean }>;

  // Native System Notifications & Completion Events
  showNotification: (options: { title?: string; body?: string; silent?: boolean }) => Promise<boolean>;
  setTitleBarTheme: (theme: 'dark' | 'light') => Promise<boolean>;
  onDownloadComplete: (callback: (task: DownloadItemModel) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
