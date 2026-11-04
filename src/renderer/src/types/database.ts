export interface ShowRecord {
  id: string;
  title: string;
  aniListId?: number | null;
  malId?: number | null;
  coverImage?: string | null;
  synopsis?: string | null;
  status?: 'AIRING' | 'FINISHED' | 'NOT_YET_RELEASED' | 'CANCELLED';
  createdAt?: string;
  episodeCount?: number;
  autoDownload?: number | boolean;
  preferredResolution?: string;
}

export interface EpisodeRecord {
  id: string;
  showId: string;
  episodeNum: string;
  resolution?: string;
  releaseGroup?: string | null;
  infoHash?: string | null;
  sourceId?: string | null;
  aria2Gid?: string | null;
  filePath?: string | null;
  fileSize?: number;
  progressSeconds?: number;
  durationSeconds?: number;
  watched?: number;
  downloadedAt?: string;
}

export interface SubscriptionRecord {
  id: string;
  showId: string;
  showTitle?: string;
  preferredResolution?: string;
  enabled: number;
  lastCheckedAt?: string;
}
