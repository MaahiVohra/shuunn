import React, { useState } from 'react';
import { Download, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { makeReleaseKey } from '../lib/utils';
import { ReleaseItem, DownloadOption } from '../types/release';

interface FeaturedHeroProps {
  releases?: ReleaseItem[];
  onDownload: (download: DownloadOption, release: ReleaseItem) => void;
  downloadingMap?: Record<string, boolean>;
  completedMap?: Record<string, boolean>;
  activeResFilter: string;
}

function formatShortDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      const isToday = now.toDateString() === d.toDateString();
      if (isToday) {
        return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  } catch {}
  return dateStr.split(' ').slice(0, 4).join(' ');
}

export function FeaturedHero({
  releases = [],
  onDownload,
  downloadingMap = {},
  completedMap = {},
  activeResFilter
}: FeaturedHeroProps) {
  const [selectedIndex] = useState(0);

  if (!releases || releases.length === 0) return null;

  const current = releases[selectedIndex] || releases[0];
  const { showTitle, episode, releaseDate, thumbnail, downloads = [] } = current;

  // Best download option based on filter
  const bestDl = downloads.find(d => activeResFilter === 'all' ? d.resolution === '1080p' : d.resolution === activeResFilter) || downloads[0];

  const resKey = bestDl ? makeReleaseKey(showTitle, episode, bestDl.resolution) : '';
  const isDownloading = downloadingMap[resKey];
  const isCompleted = completedMap[resKey];
  const shortDate = formatShortDate(releaseDate);

  return (
    <div className="mb-5 rounded-[var(--radius-panel)] bg-[var(--surface)] overflow-hidden">
      <div className="flex flex-col sm:flex-row items-stretch">
        {/* Cover Artwork */}
        {thumbnail && (
          <div className="w-full sm:w-56 aspect-[16/9] sm:aspect-auto bg-[var(--bg)] shrink-0 overflow-hidden relative">
            <img
              src={thumbnail}
              alt={showTitle}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Spotlight Anime Details & Metadata */}
        <div className="p-4 flex flex-col justify-between flex-1 gap-2.5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="accent">
                Latest Release
              </Badge>
              <Badge variant="outline">
                Episode {episode}
              </Badge>
              {shortDate && (
                <span className="text-xs text-[var(--text-muted)] font-medium tabular-nums ml-1">
                  {shortDate}
                </span>
              )}
            </div>

            <h1 className="text-base font-bold text-[var(--text)] tracking-tight line-clamp-1" title={showTitle}>
              {showTitle}
            </h1>

            {/* Structured Anime Metadata Row */}
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] flex-wrap pt-0.5">
              <span className="text-[var(--text)] font-medium">{current.provider || 'Airing'}</span>
              <span>•</span>
              <span>Simulcast</span>
              <span>•</span>
              <span>Japanese Audio</span>
              <span>•</span>
              <span>English Subtitles</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {bestDl && (
              <Button
                variant={isCompleted ? 'quiet' : 'primary'}
                size="sm"
                disabled={isDownloading || isCompleted}
                onClick={() => onDownload(bestDl, current)}
                className="h-7 text-xs px-3"
              >
                {isCompleted ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--success)]" strokeWidth={1.75} />
                    <span>Downloaded ({bestDl.resolution})</span>
                  </>
                ) : isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                    <span>Queued</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Download {bestDl.resolution}</span>
                  </>
                )}
              </Button>
            )}

            {/* Quick resolution alternatives */}
            <div className="flex items-center gap-1 sm:ml-auto">
              {downloads.map((dl) => {
                const dlKey = makeReleaseKey(showTitle, episode, dl.resolution);
                const dlDownloading = downloadingMap[dlKey];
                const dlCompleted = completedMap[dlKey];

                return (
                  <Button
                    key={dl.resolution}
                    variant="quiet"
                    size="sm"
                    disabled={dlDownloading || dlCompleted}
                    onClick={() => onDownload(dl, current)}
                    className="h-7 text-xs px-2.5"
                    title={dl.size ? `Size: ${dl.size}` : dl.resolution}
                  >
                    {dlCompleted ? (
                      <Check className="w-3 h-3 text-[var(--success)]" strokeWidth={1.75} />
                    ) : (
                      dl.resolution
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
