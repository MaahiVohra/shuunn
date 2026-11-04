import React, { useState } from 'react';
import { Download, Check, Loader2, ImageOff } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { makeReleaseKey } from '../lib/utils';
import { ReleaseItem, DownloadOption } from '../types/release';

interface ReleaseCardProps {
  release: ReleaseItem;
  onDownload: (download: DownloadOption, release: ReleaseItem) => void;
  downloadingMap?: Record<string, boolean>;
  completedMap?: Record<string, boolean>;
  activeResFilter: string;
}

export function ReleaseCard({
  release,
  onDownload,
  downloadingMap = {},
  completedMap = {},
  activeResFilter
}: ReleaseCardProps) {
  const [imageError, setImageError] = useState(false);

  const { showTitle, episode, releaseDate, thumbnail, downloads = [] } = release;

  // Format release time (e.g. "Today 15:42" or "Oct 30")
  let formattedTime = releaseDate;
  try {
    const d = new Date(releaseDate);
    if (!isNaN(d.getTime())) {
      const isToday = new Date().toDateString() === d.toDateString();
      formattedTime = isToday
        ? `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  } catch {
    // fallback
  }

  // Filter downloads based on activeResFilter
  const availableDownloads = downloads.filter((d) => {
    if (!activeResFilter || activeResFilter === 'all') return true;
    return d.resolution === activeResFilter;
  });

  return (
    <div className="group flex flex-col bg-[var(--surface)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-panel)] overflow-hidden transition-colors">
      {/* Poster Image Container */}
      <div className="relative aspect-[16/9] w-full bg-[var(--bg)] overflow-hidden flex items-center justify-center">
        {thumbnail && !imageError ? (
          <img
            src={thumbnail}
            alt={showTitle}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-[var(--text-muted)]/50 gap-1 p-4 text-center">
            <ImageOff className="w-6 h-6" strokeWidth={1.75} />
            <span className="text-xs">No Cover</span>
          </div>
        )}

        {/* Episode Badge */}
        <div className="absolute top-2 left-2">
          <span className="bg-[#0B1220]/95 text-white text-xs font-bold px-2.5 py-0.5 rounded-[var(--radius-control)] shadow-sm">
            EP {episode}
          </span>
        </div>

        {/* Release Time Badge */}
        <div className="absolute top-2 right-2">
          <span className="bg-[#0B1220]/95 text-white text-xs font-semibold px-2.5 py-0.5 rounded-[var(--radius-control)] shadow-sm tabular-nums">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3
            title={showTitle}
            className="text-sm font-semibold text-[var(--text)] line-clamp-2 leading-snug"
          >
            {showTitle}
          </h3>
        </div>

        {/* Download Buttons by Resolution */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {availableDownloads.length === 0 ? (
            <span className="text-xs text-[var(--text-muted)] py-1 italic">No downloads available</span>
          ) : (
            availableDownloads.map((dl) => {
              const resKey = makeReleaseKey(showTitle, episode, dl.resolution);
              const isDownloading = downloadingMap[resKey];
              const isCompleted = completedMap[resKey];

              if (isCompleted) {
                return (
                  <Badge
                    key={dl.resolution}
                    variant="success"
                    className="flex-1 justify-center h-8 text-xs font-semibold px-2.5"
                    title={`Completed ${dl.resolution}`}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
                    {dl.resolution}
                  </Badge>
                );
              }

              if (isDownloading) {
                return (
                  <Badge
                    key={dl.resolution}
                    variant="accent"
                    className="flex-1 justify-center h-8 text-xs font-semibold px-2.5"
                    title="Download queued"
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" strokeWidth={1.75} />
                    Queued
                  </Badge>
                );
              }

              return (
                <Button
                  key={dl.resolution}
                  variant="quiet"
                  size="sm"
                  onClick={() => onDownload(dl, release)}
                  className="flex-1 min-w-[64px] text-xs font-semibold h-8 px-2.5"
                  title={dl.size ? `Size: ${dl.size}` : `Download ${dl.resolution}`}
                >
                  <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.75} />
                  <span>{dl.resolution}</span>
                </Button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
