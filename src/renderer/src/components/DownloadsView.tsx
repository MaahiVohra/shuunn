import React from 'react';
import { DownloadItem } from './DownloadItem';
import { SpeedChart } from './SpeedChart';
import {
  DownloadCloud,
  Play,
  Pause,
  Folder,
  Activity,
  HardDrive
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { DownloadItemModel } from '../types/download';

interface DownloadsViewProps {
  downloads?: DownloadItemModel[];
  speedHistory?: { down: number; up: number }[];
  peakDown?: number;
  peakUp?: number;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onPlay: (path: string) => void;
  onNavigateBrowse: () => void;
  onOpenSettings: () => void;
  downloadDir?: string;
}

export function DownloadsView({
  downloads = [],
  speedHistory = [],
  peakDown = 0,
  peakUp = 0,
  onPause,
  onResume,
  onCancel,
  onPlay,
  onNavigateBrowse,
  onOpenSettings,
  downloadDir = ''
}: DownloadsViewProps) {
  const activeDownloads = downloads.filter((d) => d.status === 'active');
  const pausedDownloads = downloads.filter((d) => d.status === 'paused');

  const totalDownSpeed = downloads.reduce((acc, d) => acc + (d.downloadSpeed || 0), 0);
  const totalUpSpeed = downloads.reduce((acc, d) => acc + (d.uploadSpeed || 0), 0);

  const handlePauseAll = () => {
    activeDownloads.forEach((d) => onPause(d.id));
  };

  const handleResumeAll = () => {
    pausedDownloads.forEach((d) => onResume(d.id));
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto w-full">
      {/* Top Header Row Across Both Columns */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-[var(--text)] tracking-tight">Downloads</h1>
            <Badge variant={activeDownloads.length > 0 ? 'accent' : 'default'}>
              {activeDownloads.length} active
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 tabular-nums">
            {downloads.length} total tasks in queue
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeDownloads.length > 0 && (
            <Button
              variant="quiet"
              size="sm"
              onClick={handlePauseAll}
            >
              <Pause className="w-3.5 h-3.5 mr-1 text-amber-400" strokeWidth={1.75} />
              Pause All
            </Button>
          )}

          {pausedDownloads.length > 0 && (
            <Button
              variant="quiet"
              size="sm"
              onClick={handleResumeAll}
            >
              <Play className="w-3.5 h-3.5 mr-1 text-[var(--accent)]" strokeWidth={1.75} />
              Resume All
            </Button>
          )}
        </div>
      </div>

      {/* Main Content & Sidebar Grid */}
      <div className="flex flex-col lg:flex-row items-start gap-5">
        {/* Main Column: Active & Queued Tasks */}
        <div className="flex-1 w-full space-y-2.5">
          {/* Task List / Empty State */}
          {downloads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-[var(--radius-panel)] bg-[var(--surface)] p-6">
              <div className="w-12 h-12 rounded-[var(--radius-panel)] bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-muted)] mb-3">
                <DownloadCloud className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Nothing downloading</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1 mb-4">
                Episodes you download appear here with live speeds and progress tracking.
              </p>
              <Button
                variant="primary"
                size="default"
                onClick={onNavigateBrowse}
              >
                Browse Anime
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {downloads.map((item) => (
                <DownloadItem
                  key={item.id}
                  item={item}
                  onPause={onPause}
                  onResume={onResume}
                  onCancel={onCancel}
                  onPlay={onPlay}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Metric Cards Sidebar */}
        <div className="w-full lg:w-88 xl:w-96 shrink-0 space-y-3">
          {/* Card 1: Steam-style Throughput & Speed Chart */}
          <div className="bg-[var(--surface)] rounded-[var(--radius-panel)] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--text)]">
              <span className="flex items-center gap-1.5 font-semibold">
                <Activity className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} />
                Throughput
              </span>
              <Badge variant={totalDownSpeed > 0 ? 'success' : 'default'} className="text-[10px]">
                {totalDownSpeed > 0 ? 'Active' : 'Idle'}
              </Badge>
            </div>

            <SpeedChart
              history={speedHistory}
              currentDown={totalDownSpeed}
              currentUp={totalUpSpeed}
              peakDown={peakDown}
              peakUp={peakUp}
            />
          </div>

          {/* Card 2: Storage */}
          <div className="bg-[var(--surface)] rounded-[var(--radius-panel)] p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--text)]">
              <span className="flex items-center gap-1.5 font-semibold">
                <HardDrive className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} />
                Storage
              </span>
              <Button
                variant="quiet"
                size="sm"
                onClick={onOpenSettings}
                className="h-6 px-2 text-[11px]"
              >
                Change
              </Button>
            </div>

            <div className="pt-1">
              <div className="text-xs font-mono text-[var(--text)] truncate flex items-center gap-1.5" title={downloadDir}>
                <Folder className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" strokeWidth={1.75} />
                <span className="truncate">{downloadDir || 'Default directory'}</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Completed episodes are stored by show folder.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
