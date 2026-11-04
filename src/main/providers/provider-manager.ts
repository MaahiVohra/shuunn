import { HttpAddonProvider } from './http-addon-provider';
import { BaseAnimeProvider } from './base-provider';
import { SettingsStore } from '../settings-store';
import { ReleaseItem } from '../../renderer/src/types/release';

/**
 * Provider / Addon Manager.
 * In accordance with Project Rule 1, shuunn ships with zero bundled content sources.
 * Sources are user-installed third-party addons managed at runtime.
 */
export class ProviderManager {
  private settingsStore: SettingsStore | null;
  public providers: Map<string, BaseAnimeProvider>;
  public activeProviderId: string;

  constructor(settingsStore: SettingsStore | null = null) {
    this.settingsStore = settingsStore;
    this.providers = new Map();
    this.activeProviderId = '';

    // Load user-saved sources if available
    this._loadSavedSources();
  }

  private _loadSavedSources(): void {
    if (!this.settingsStore) return;
    const sources = this.settingsStore.get('installedSources') || [];
    for (const manifest of sources) {
      try {
        const provider = new HttpAddonProvider(manifest);
        this.registerProvider(provider);
      } catch (err: any) {
        console.warn('[provider-manager] Failed to load saved source:', err.message);
      }
    }

    const savedActive = this.settingsStore.get('activeSourceId');
    if (savedActive && this.providers.has(savedActive)) {
      this.activeProviderId = savedActive;
    } else {
      const first = Array.from(this.providers.keys())[0];
      this.activeProviderId = first || '';
    }
  }

  registerProvider(provider: BaseAnimeProvider): void {
    if (!provider || !provider.id) {
      throw new Error('Provider must have a valid id');
    }
    this.providers.set(provider.id, provider);
    if (!this.activeProviderId) {
      this.activeProviderId = provider.id;
    }
  }

  unregisterProvider(id: string): void {
    this.providers.delete(id);
    if (this.activeProviderId === id) {
      const first = Array.from(this.providers.keys())[0];
      this.activeProviderId = first || '';
    }
  }

  setActiveProvider(providerId: string): void {
    if (providerId && !this.providers.has(providerId)) {
      throw new Error(`Provider "${providerId}" is not registered`);
    }
    this.activeProviderId = providerId || '';
  }

  getActiveProvider(): BaseAnimeProvider | null {
    if (!this.activeProviderId) return null;
    return this.providers.get(this.activeProviderId) || null;
  }

  getAvailableProviders(): { id: string; displayName: string; description: string }[] {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      displayName: p.displayName,
      description: p.description
    }));
  }

  async getLatest(): Promise<ReleaseItem[]> {
    const active = this.getActiveProvider();
    if (!active) return [];
    try {
      return await active.getLatest();
    } catch (err: any) {
      console.warn(`[provider-manager] getLatest error for ${active.id}:`, err.message);
      return [];
    }
  }

  async search(query: string): Promise<ReleaseItem[]> {
    const active = this.getActiveProvider();
    if (!active) return [];
    try {
      return await active.search(query);
    } catch (err: any) {
      console.warn(`[provider-manager] search error for ${active.id}:`, err.message);
      return [];
    }
  }
}
