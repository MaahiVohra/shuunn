import { AddonManifest } from './release';

export interface AppSettings {
  downloadDir: string;
  playerPath: string;
  mpvnetPath: string;
  notifyOnComplete: boolean;
  preferredResolution: string;
  activeSourceId?: string;
  activeProvider?: string;
  installedSources?: AddonManifest[];
  activeTorrentEngine: string;
}
