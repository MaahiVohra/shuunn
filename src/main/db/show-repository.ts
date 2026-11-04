import { AppDatabase } from './database';
import { ShowRecord, EpisodeRecord, SubscriptionRecord } from '../../renderer/src/types/database';

/**
 * Show and Episode Data Repository.
 * Encapsulates all SQLite queries with typed parameter bindings.
 */
export class ShowRepository {
  private db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  // --- SHOWS ---

  upsertShow({
    id,
    title,
    aniListId = null,
    malId = null,
    coverImage = null,
    synopsis = null,
    status = 'AIRING'
  }: Partial<ShowRecord> & { id: string; title: string }): void {
    this.db.run(
      `INSERT INTO shows (id, title, aniListId, malId, coverImage, synopsis, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         aniListId = COALESCE(excluded.aniListId, shows.aniListId),
         malId = COALESCE(excluded.malId, shows.malId),
         coverImage = COALESCE(excluded.coverImage, shows.coverImage),
         synopsis = COALESCE(excluded.synopsis, shows.synopsis),
         status = excluded.status;`,
      [id, title, aniListId, malId, coverImage, synopsis, status]
    );
  }

  getAllShows(): ShowRecord[] {
    return this.db.exec(`
      SELECT s.*,
             COUNT(DISTINCT e.id) as episodeCount,
             COALESCE(sub.enabled, 0) as autoDownload
      FROM shows s
      LEFT JOIN episodes e ON s.id = e.showId
      LEFT JOIN subscriptions sub ON s.id = sub.showId
      GROUP BY s.id
      ORDER BY s.title ASC;
    `) as unknown as ShowRecord[];
  }

  getShowById(id: string): ShowRecord | null {
    const rows = this.db.exec(
      `SELECT s.*, COALESCE(sub.enabled, 0) as autoDownload, sub.preferredResolution
       FROM shows s
       LEFT JOIN subscriptions sub ON s.id = sub.showId
       WHERE s.id = ?;`,
      [id]
    );
    return (rows[0] as unknown as ShowRecord) || null;
  }

  deleteShow(id: string): void {
    this.db.run(`DELETE FROM shows WHERE id = ?;`, [id]);
  }

  // --- EPISODES ---

  upsertEpisode({
    id,
    showId,
    episodeNum,
    resolution = '1080p',
    releaseGroup = null,
    filePath = null,
    fileSize = 0,
    watched = 0
  }: Partial<EpisodeRecord> & { id: string; showId: string; episodeNum: string }): void {
    this.db.run(
      `INSERT INTO episodes (id, showId, episodeNum, resolution, releaseGroup, filePath, fileSize, watched, downloadedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(showId, episodeNum, resolution) DO UPDATE SET
         filePath = COALESCE(excluded.filePath, episodes.filePath),
         fileSize = COALESCE(excluded.fileSize, episodes.fileSize),
         watched = COALESCE(excluded.watched, episodes.watched);`,
      [id, showId, String(episodeNum), resolution, releaseGroup, filePath, fileSize, watched ? 1 : 0]
    );
  }

  getEpisodesByShow(showId: string): EpisodeRecord[] {
    return this.db.exec(
      `SELECT * FROM episodes WHERE showId = ? ORDER BY CAST(episodeNum AS REAL) ASC, episodeNum ASC;`,
      [showId]
    ) as unknown as EpisodeRecord[];
  }

  markEpisodeWatched(episodeId: string, watched: boolean | number = 1): void {
    const isWatched = watched ? 1 : 0;
    this.db.run(
      `UPDATE episodes SET watched = ? WHERE id = ?;`,
      [isWatched, episodeId]
    );

    if (isWatched) {
      this.db.run(
        `INSERT INTO watch_history (id, episodeId, watchedAt, completed)
         VALUES (?, ?, datetime('now'), 1);`,
        [`wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, episodeId]
      );
    }
  }

  updateProgress(episodeId: string, progressSeconds: number, durationSeconds: number): void {
    const isCompleted = durationSeconds > 0 && (progressSeconds / durationSeconds) >= 0.85 ? 1 : 0;
    this.db.run(
      `UPDATE episodes
       SET progressSeconds = ?,
           durationSeconds = ?,
           watched = CASE WHEN ? = 1 THEN 1 ELSE watched END
       WHERE id = ?;`,
      [progressSeconds, durationSeconds, isCompleted, episodeId]
    );
    if (isCompleted) {
      this.db.run(
        `INSERT INTO watch_history (id, episodeId, watchedAt, completed)
         VALUES (?, ?, datetime('now'), 1);`,
        [`wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, episodeId]
      );
    }
  }

  // --- SUBSCRIPTIONS (Auto-Download) ---

  setSubscription(showId: string, enabled: boolean | number = 1, preferredResolution: string = '1080p'): void {
    const isEnabled = enabled ? 1 : 0;
    this.db.run(
      `INSERT INTO subscriptions (id, showId, preferredResolution, enabled, lastCheckedAt)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(showId) DO UPDATE SET
         enabled = excluded.enabled,
         preferredResolution = excluded.preferredResolution;`,
      [`sub-${showId}`, showId, preferredResolution, isEnabled]
    );
  }

  getSubscriptions(): SubscriptionRecord[] {
    return this.db.exec(`
      SELECT sub.*, s.title as showTitle
      FROM subscriptions sub
      JOIN shows s ON sub.showId = s.id
      WHERE sub.enabled = 1;
    `) as unknown as SubscriptionRecord[];
  }
}
