import React from 'react';
import { Play, Pause, Trash2, Film, ArrowDown, Users, Clock, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { DownloadItemModel } from '../types/download';

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatEta(seconds?: number) {
  if (!seconds || seconds <= 0 || seconds === Infinity) return '--';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

interface DownloadItemProps {
  item: DownloadItemModel;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onPlay: (path: string) => void;
}

export function DownloadItem({ item, onPause, onResume, onCancel, onPlay }: DownloadItemProps) {
  const {
    id,
    title,
    showTitle,
    resolution,
    status,
    progress = 0,
    downloadSpeed = 0,
    totalLength = 0,
    completedLength = 0,
    numSeeders = 0,
    eta,
    filePath,
    errorMessage
  } = item;

  const isCompleted = status === 'complete';
  const isPaused = status === 'paused';
  const isError = status === 'error';

  return (
    <div className="bg-[var(--surface)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-panel)] p-3.5 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        {/* Title & Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {resolution && (
              <Badge variant="default" className="text-[10px]">
                {resolution}
              </Badge>
            )}
            <Badge
              variant={
                isCompleted
                  ? 'success'
                  : isPaused
                  ? 'warning'
                  : isError
                  ? 'danger'
                  : 'accent'
              }
              className="text-[10px] capitalize"
            >
              {status}
            </Badge>
          </div>

          <h4 className="text-xs font-semibold text-[var(--text)] truncate" title={title}>
            {title}
          </h4>
          {showTitle && showTitle !== title && (
            <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{showTitle}</p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isCompleted ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => filePath && onPlay(filePath)}
            >
              <Film className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
              Play
            </Button>
          ) : isPaused ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="quiet"
                  size="icon-sm"
                  onClick={() => onResume(id)}
                  aria-label="Resume download"
                >
                  <Play className="w-3.5 h-3.5 text-[var(--accent)] fill-current" strokeWidth={1.75} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Resume</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="quiet"
                  size="icon-sm"
                  onClick={() => onPause(id)}
                  aria-label="Pause download"
                >
                  <Pause className="w-3.5 h-3.5 text-amber-400 fill-current" strokeWidth={1.75} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pause</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="danger"
                size="icon-sm"
                onClick={() => onCancel(id)}
                aria-label="Remove download"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove task</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="space-y-1.5">
        <Progress
          value={Math.max(0, Math.min(100, progress))}
          indicatorClassName={
            isCompleted
              ? 'bg-[var(--success)]'
              : isPaused
              ? 'bg-amber-400'
              : isError
              ? 'bg-[var(--danger)]'
              : 'bg-[var(--accent)]'
          }
        />

        {/* Metrics Row */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-0.5 tabular-nums">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text)]">{progress.toFixed(1)}%</span>
            <span className="text-[11px] opacity-75">
              {formatBytes(completedLength)} / {totalLength > 0 ? formatBytes(totalLength) : 'Unknown'}
            </span>
          </div>

          {!isCompleted && !isError && (
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-[var(--text)] font-medium">
                <ArrowDown className="w-3 h-3 text-[var(--accent)]" strokeWidth={1.75} />
                {formatBytes(downloadSpeed)}/s
              </span>

              {numSeeders > 0 && (
                <span className="flex items-center gap-1 opacity-75">
                  <Users className="w-3 h-3" strokeWidth={1.75} />
                  {numSeeders}
                </span>
              )}

              <span className="flex items-center gap-1 opacity-75">
                <Clock className="w-3 h-3" strokeWidth={1.75} />
                {formatEta(eta)}
              </span>
            </div>
          )}

          {isCompleted && (
            <span className="text-[11px] text-[var(--success)] font-medium">
              Completed
            </span>
          )}

          {isError && (
            <span className="text-[11px] text-[var(--danger)] flex items-center gap-1">
              <AlertCircle className="w-3 h-3" strokeWidth={1.75} />
              {errorMessage || 'Download error'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
