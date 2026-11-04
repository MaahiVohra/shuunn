import { DownloadItemModel } from '../../renderer/src/types/download';

export interface AddDownloadOptions {
  magnet: string;
  downloadDir: string;
  title?: string;
  showTitle?: string;
  episode?: string;
  resolution?: string;
}

/**
 * Base abstract class for torrent engine adapters.
 * Implementations: Aria2Adapter, QBittorrentAdapter, TransmissionAdapter, WebTorrentAdapter, etc.
 */
export abstract class BaseTorrentAdapter {
  public id: string;
  public displayName: string;
  public description: string;

  constructor(id: string, displayName: string, description = '') {
    this.id = id;
    this.displayName = displayName;
    this.description = description;
  }

  /**
   * Initializes or connects to the torrent engine daemon.
   */
  abstract init(): Promise<void>;

  /**
   * Gracefully shuts down the torrent engine daemon or disconnects.
   */
  abstract shutdown(): Promise<void>;

  /**
   * Starts downloading a torrent/magnet.
   */
  abstract addDownload(options: AddDownloadOptions): Promise<{ id: string }>;

  /**
   * Gets current snapshot of all active, waiting, and completed downloads.
   */
  abstract getDownloads(): Promise<DownloadItemModel[]>;

  /**
   * Pauses a download.
   */
  abstract pause(id: string): Promise<boolean>;

  /**
   * Resumes a paused download.
   */
  abstract resume(id: string): Promise<boolean>;

  /**
   * Cancels and stops a download.
   */
  abstract cancel(id: string): Promise<boolean>;
}
