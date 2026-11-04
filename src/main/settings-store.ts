import fs from 'node:fs';
import path from 'node:path';
import electron from 'electron';
import { AppSettings } from '../renderer/src/types/settings';

const app = (electron as any)?.app || (electron as any)?.default?.app;

export class SettingsStore {
  public appDataDir: string;
  public configPath: string;
  public defaults: AppSettings;
  public settings: AppSettings;

  constructor() {
    this.appDataDir = app?.getPath('userData') || path.join(process.env.APPDATA || process.cwd(), 'shuunn');
    this.configPath = path.join(this.appDataDir, 'config.json');

    const defaultDownloads = app?.getPath('downloads')
      ? path.join(app.getPath('downloads'), 'shuunn')
      : path.join(process.env.USERPROFILE || 'C:\\', 'Downloads', 'shuunn');

    this.defaults = {
      downloadDir: defaultDownloads,
      playerPath: 'C:\\Program Files\\mpv.net\\mpvnet.exe',
      mpvnetPath: 'C:\\Program Files\\mpv.net\\mpvnet.exe',
      notifyOnComplete: true,
      preferredResolution: '1080p',
      activeSourceId: '',
      installedSources: [],
      activeTorrentEngine: 'aria2'
    };

    this.settings = { ...this.defaults };
    this.load();
  }

  load(): void {
    try {
      if (!fs.existsSync(this.appDataDir)) {
        fs.mkdirSync(this.appDataDir, { recursive: true });
      }

      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.settings = { ...this.defaults, ...parsed };
        if (this.settings.mpvnetPath && !parsed.playerPath) {
          this.settings.playerPath = this.settings.mpvnetPath;
        }
      } else {
        this.save();
      }
    } catch (err: any) {
      console.warn('[settings-store] Failed to read config, falling back to defaults:', err.message);
      this.settings = { ...this.defaults };
    }
  }

  save(): void {
    try {
      if (!fs.existsSync(this.appDataDir)) {
        fs.mkdirSync(this.appDataDir, { recursive: true });
      }
      if (this.settings.playerPath) {
        this.settings.mpvnetPath = this.settings.playerPath;
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (err) {
      console.error('[settings-store] Failed to save config:', err);
    }
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key] ?? this.defaults[key];
  }

  getAll(): AppSettings {
    return { ...this.settings };
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): AppSettings {
    this.settings[key] = value;
    this.save();
    return this.settings;
  }

  update(partial: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...partial };
    this.save();
    return this.settings;
  }
}
