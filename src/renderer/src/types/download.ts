export type DownloadStatus = 'active' | 'waiting' | 'paused' | 'complete' | 'error';

export interface DownloadItemModel {
  id: string;
  title: string;
  showTitle?: string;
  episode?: string;
  resolution?: string;
  status: DownloadStatus;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  totalLength: number;
  completedLength: number;
  numSeeders: number;
  eta: number;
  filePath?: string;
  errorMessage?: string;
}

export interface SpeedSample {
  down: number;
  up: number;
}
