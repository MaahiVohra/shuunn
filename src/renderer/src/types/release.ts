export type Resolution = '480p' | '720p' | '1080p' | '2160p' | 'default';

export interface ReleaseDownload {
  resolution: Resolution;
  magnet: string;
  size?: string;
}

export type DownloadOption = ReleaseDownload;

export interface ReleaseItem {
  id: string;
  showTitle: string;
  episode: string;
  releaseDate: string;
  thumbnail: string;
  provider: string;
  downloads: ReleaseDownload[];
}

export interface AddonEndpointConfig {
  latest: string;
  search: string;
}

export interface AddonCapabilities {
  resolutions: Resolution[];
  supportsPagination?: boolean;
  supportedIdTypes?: ('anilist' | 'mal')[];
}

export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  iconUrl?: string;
  endpoints: AddonEndpointConfig;
  capabilities: AddonCapabilities;
}
