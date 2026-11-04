import { BaseAnimeProvider } from './base-provider';
import { ReleaseItem, AddonManifest, Resolution } from '../../renderer/src/types/release';

/**
 * Third-party Source Addon HTTP Provider.
 * Implements the shuunn declarative Addon Protocol (JSON over HTTP).
 * Ships with zero bundled URLs or endpoints.
 */
export class HttpAddonProvider extends BaseAnimeProvider {
  public manifest: AddonManifest;
  public timeoutMs: number;

  constructor(manifest: AddonManifest) {
    super(manifest.id, manifest.name, manifest.description || '');
    this.manifest = manifest;
    this.timeoutMs = 5000;
  }

  private async _fetchWithTimeout(url: string): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'shuunn-desktop'
        },
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`Addon endpoint returned HTTP ${res.status}: ${res.statusText}`);
      }

      const contentLength = res.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
        throw new Error('Addon response exceeds 5MB ceiling');
      }

      const data = await res.json();
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Normalize an addon release item into the standard ReleaseItem format.
   */
  private _normalizeItem(item: any): ReleaseItem | null {
    if (!item || !item.showTitle || !item.magnetUrl) return null;

    // Reject non-magnet schemes for safety
    if (typeof item.magnetUrl !== 'string' || !item.magnetUrl.startsWith('magnet:?')) {
      return null;
    }

    const resolution = (item.resolution || '1080p') as Resolution;
    return {
      id: `${item.id || item.showTitle}-${item.episode || '0'}-${resolution}`,
      showTitle: item.showTitle,
      episode: String(item.episode || '1'),
      releaseDate: item.releasedAt || new Date().toISOString(),
      thumbnail: item.thumbnail || '',
      provider: this.id,
      downloads: [
        {
          resolution,
          magnet: item.magnetUrl,
          size: item.fileSizeFormatted || (item.fileSize ? `${Math.round(item.fileSize / (1024 * 1024))} MB` : undefined)
        }
      ]
    };
  }

  async getLatest(): Promise<ReleaseItem[]> {
    if (!this.manifest.endpoints?.latest) return [];
    try {
      const data = await this._fetchWithTimeout(this.manifest.endpoints.latest);
      const items = Array.isArray(data) ? data : data.items || [];
      return items.map((i: any) => this._normalizeItem(i)).filter((item: any): item is ReleaseItem => Boolean(item));
    } catch (err: any) {
      console.warn(`[addon-provider:${this.id}] Failed to fetch latest:`, err.message);
      return [];
    }
  }

  async search(query: string): Promise<ReleaseItem[]> {
    if (!this.manifest.endpoints?.search || !query?.trim()) return [];
    const searchUrl = this.manifest.endpoints.search.replace('{query}', encodeURIComponent(query.trim()));
    try {
      const data = await this._fetchWithTimeout(searchUrl);
      const items = Array.isArray(data) ? data : data.items || [];
      return items.map((i: any) => this._normalizeItem(i)).filter((item: any): item is ReleaseItem => Boolean(item));
    } catch (err: any) {
      console.warn(`[addon-provider:${this.id}] Failed to search:`, err.message);
      return [];
    }
  }
}
