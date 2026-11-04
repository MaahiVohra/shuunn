import { Aria2Adapter } from './adapters/aria2-adapter';
import { BaseTorrentAdapter, AddDownloadOptions } from './torrent-adapter';
import { DownloadItemModel } from '../../renderer/src/types/download';

export class TorrentManager {
  public adapters: Map<string, BaseTorrentAdapter>;
  public activeAdapterId: string;

  constructor() {
    this.adapters = new Map();
    this.activeAdapterId = 'aria2';

    // Register built-in default adapter
    this.registerAdapter(new Aria2Adapter());
  }

  registerAdapter(adapter: BaseTorrentAdapter): void {
    if (!adapter || !adapter.id) {
      throw new Error('Adapter must have a valid id');
    }
    this.adapters.set(adapter.id, adapter);
  }

  async setActiveAdapter(adapterId: string): Promise<void> {
    if (!this.adapters.has(adapterId)) {
      throw new Error(`Torrent adapter "${adapterId}" is not registered`);
    }

    if (this.activeAdapterId !== adapterId) {
      // Shutdown current adapter
      const current = this.getActiveAdapter();
      if (current) {
        await current.shutdown().catch(err => console.warn('Error shutting down previous adapter:', err));
      }

      this.activeAdapterId = adapterId;
    }

    const next = this.getActiveAdapter();
    await next.init();
  }

  getActiveAdapter(): BaseTorrentAdapter {
    const adapter = this.adapters.get(this.activeAdapterId);
    if (!adapter) {
      const first = Array.from(this.adapters.values())[0];
      if (!first) throw new Error('No torrent adapters registered');
      this.activeAdapterId = first.id;
      return first;
    }
    return adapter;
  }

  getAvailableAdapters(): { id: string; displayName: string; description: string }[] {
    return Array.from(this.adapters.values()).map(a => ({
      id: a.id,
      displayName: a.displayName,
      description: a.description
    }));
  }

  async init(): Promise<void> {
    return await this.getActiveAdapter().init();
  }

  async shutdown(): Promise<void> {
    return await this.getActiveAdapter().shutdown();
  }

  async addDownload(options: AddDownloadOptions): Promise<{ id: string }> {
    return await this.getActiveAdapter().addDownload(options);
  }

  async getDownloads(): Promise<DownloadItemModel[]> {
    return await this.getActiveAdapter().getDownloads();
  }

  async pause(id: string): Promise<boolean> {
    return await this.getActiveAdapter().pause(id);
  }

  async resume(id: string): Promise<boolean> {
    return await this.getActiveAdapter().resume(id);
  }

  async cancel(id: string): Promise<boolean> {
    return await this.getActiveAdapter().cancel(id);
  }
}
