import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

/**
 * Local SQLite Database Layer for shuunn.
 * Uses official SQLite WASM engine for 100% portability, zero native C++ build tool dependencies,
 * and reliable file persistence at %APPDATA%/shuunn/shuunn.db.
 */
export class AppDatabase {
  public appDataDir: string;
  public dbPath: string;
  public SQL: SqlJsStatic | null;
  public db: Database | null;
  public initPromise: Promise<AppDatabase> | null;
  public dirty: boolean;
  public saveDebounce: NodeJS.Timeout | null;

  constructor(appDataDir: string) {
    this.appDataDir = appDataDir;
    this.dbPath = path.join(this.appDataDir, 'shuunn.db');
    this.SQL = null;
    this.db = null;
    this.initPromise = null;
    this.dirty = false;
    this.saveDebounce = null;
  }

  async init(): Promise<AppDatabase> {
    if (this.db) return this;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!fs.existsSync(this.appDataDir)) {
        fs.mkdirSync(this.appDataDir, { recursive: true });
      }

      this.SQL = await initSqlJs();

      if (fs.existsSync(this.dbPath)) {
        try {
          const fileBuffer = fs.readFileSync(this.dbPath);
          this.db = new this.SQL.Database(fileBuffer);
          console.log('[db] Loaded existing SQLite database from:', this.dbPath);
        } catch (err: any) {
          console.warn('[db] Could not open existing database file, creating fresh one:', err.message);
          this.db = new this.SQL.Database();
        }
      } else {
        this.db = new this.SQL.Database();
        console.log('[db] Initialized fresh SQLite database at:', this.dbPath);
      }

      // Foreign keys on
      this.db.run('PRAGMA foreign_keys = ON;');

      // Run migrations
      this._runMigrations();
      this.saveImmediate();
      return this;
    })();

    return this.initPromise;
  }

  private _runMigrations(): void {
    if (!this.db) return;

    // 1. Migrations tracking table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        appliedAt TEXT NOT NULL
      );
    `);

    const applied = new Set<number>();
    const rows = this.exec('SELECT version FROM _migrations;');
    for (const r of rows) {
      applied.add(Number(r.version));
    }

    // Migration 1: Core Tables (shows, aliases, episodes, subscriptions, watch_history, providers, sync_outbox, settings)
    if (!applied.has(1)) {
      console.log('[db] Applying migration 1: Core Schema...');
      this.db.run(`
        -- Shows table
        CREATE TABLE IF NOT EXISTS shows (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          aniListId INTEGER,
          malId INTEGER,
          coverImage TEXT,
          synopsis TEXT,
          status TEXT DEFAULT 'AIRING',
          createdAt TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_shows_title ON shows(title);
        CREATE INDEX IF NOT EXISTS idx_shows_anilist ON shows(aniListId);

        -- Show aliases for fan-release title matching
        CREATE TABLE IF NOT EXISTS show_aliases (
          id TEXT PRIMARY KEY,
          showId TEXT NOT NULL,
          alias TEXT NOT NULL,
          userConfirmed INTEGER DEFAULT 0,
          FOREIGN KEY (showId) REFERENCES shows(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_show_aliases_alias ON show_aliases(alias);

        -- Episodes table
        CREATE TABLE IF NOT EXISTS episodes (
          id TEXT PRIMARY KEY,
          showId TEXT NOT NULL,
          episodeNum TEXT NOT NULL,
          resolution TEXT DEFAULT '1080p',
          releaseGroup TEXT,
          infoHash TEXT,
          sourceId TEXT,
          aria2Gid TEXT,
          filePath TEXT,
          fileSize INTEGER DEFAULT 0,
          progressSeconds INTEGER DEFAULT 0,
          durationSeconds INTEGER DEFAULT 0,
          watched INTEGER DEFAULT 0,
          downloadedAt TEXT,
          FOREIGN KEY (showId) REFERENCES shows(id) ON DELETE CASCADE,
          UNIQUE(showId, episodeNum, resolution)
        );
        CREATE INDEX IF NOT EXISTS idx_episodes_show ON episodes(showId);
        CREATE INDEX IF NOT EXISTS idx_episodes_watched ON episodes(watched);

        -- Subscriptions for auto-download
        CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          showId TEXT NOT NULL UNIQUE,
          preferredResolution TEXT DEFAULT '1080p',
          enabled INTEGER DEFAULT 1,
          lastCheckedAt TEXT,
          FOREIGN KEY (showId) REFERENCES shows(id) ON DELETE CASCADE
        );

        -- Append-only watch history event log
        CREATE TABLE IF NOT EXISTS watch_history (
          id TEXT PRIMARY KEY,
          episodeId TEXT NOT NULL,
          watchedAt TEXT NOT NULL,
          completed INTEGER DEFAULT 1,
          FOREIGN KEY (episodeId) REFERENCES episodes(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_watch_history_episode ON watch_history(episodeId);

        -- Sources / Addons
        CREATE TABLE IF NOT EXISTS providers (
          id TEXT PRIMARY KEY,
          manifestUrl TEXT,
          name TEXT NOT NULL,
          version TEXT DEFAULT '1.0.0',
          enabled INTEGER DEFAULT 1,
          addedAt TEXT NOT NULL,
          lastError TEXT
        );

        -- Outbox for reliable offline-first AniList / MAL syncing
        CREATE TABLE IF NOT EXISTS sync_outbox (
          id TEXT PRIMARY KEY,
          service TEXT NOT NULL,
          operation TEXT NOT NULL,
          payload TEXT NOT NULL,
          attempts INTEGER DEFAULT 0,
          lastError TEXT,
          createdAt TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sync_outbox_service ON sync_outbox(service);

        -- Key-value settings store
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        INSERT INTO _migrations (version, appliedAt) VALUES (1, datetime('now'));
      `);
      this.dirty = true;
    }
  }

  /**
   * Helper to execute SELECT queries and return clean array of objects
   */
  exec(sql: string, params: any[] = []): Record<string, any>[] {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params);
      const results: Record<string, any>[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  /**
   * Helper to execute INSERT, UPDATE, DELETE queries
   */
  run(sql: string, params: any[] = []): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql, params);
    this.scheduleSave();
  }

  /**
   * Debounced save to disk (avoids heavy disk I/O on every write)
   */
  scheduleSave(): void {
    this.dirty = true;
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => {
      this.saveImmediate();
    }, 500);
  }

  /**
   * Flush in-memory SQLite database to disk
   */
  saveImmediate(): void {
    if (!this.db || !this.dirty) return;
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
      this.dirty = false;
    } catch (err) {
      console.error('[db] Failed to save database to disk:', err);
    }
  }

  close(): void {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveImmediate();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
