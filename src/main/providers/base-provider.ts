import { ReleaseItem } from '../../renderer/src/types/release';

/**
 * Base abstract class for content source providers.
 * All source addons and feed adapters implement this contract.
 */
export abstract class BaseAnimeProvider {
  public id: string;
  public displayName: string;
  public description: string;

  constructor(id: string, displayName: string, description = '') {
    this.id = id;
    this.displayName = displayName;
    this.description = description;
  }

  /**
   * Fetches latest releases.
   */
  abstract getLatest(): Promise<ReleaseItem[]>;

  /**
   * Searches releases matching query string.
   */
  abstract search(query: string): Promise<ReleaseItem[]>;
}
