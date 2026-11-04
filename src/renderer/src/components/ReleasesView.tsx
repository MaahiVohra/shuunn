import React from 'react';
import { ReleaseCard } from './ReleaseCard';
import { FeaturedHero } from './FeaturedHero';
import { RefreshCw, SearchX, Film } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ReleaseItem, DownloadOption } from '../types/release';

interface ReleasesViewProps {
  releases?: ReleaseItem[];
  loading?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onDownload: (download: DownloadOption, release: ReleaseItem) => void;
  onOpenSettings?: () => void;
  downloadingMap?: Record<string, boolean>;
  completedMap?: Record<string, boolean>;
  activeResFilter: string;
  searchQuery?: string;
  showHero?: boolean;
}

export function ReleasesView({
  releases = [],
  loading,
  error,
  onRefresh,
  onDownload,
  onOpenSettings,
  downloadingMap = {},
  completedMap = {},
  activeResFilter,
  searchQuery,
  showHero = false
}: ReleasesViewProps) {
  if (loading && releases.length === 0) {
    return (
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto w-full">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] rounded-[var(--radius-panel)] overflow-hidden animate-pulse"
            >
              <div className="aspect-[16/9] bg-[var(--bg)]" />
              <div className="p-3.5 space-y-2">
                <div className="h-4 bg-[var(--surface-hover)] rounded-[var(--radius-control)] w-3/4" />
                <div className="h-3.5 bg-[var(--surface-hover)] rounded-[var(--radius-control)] w-1/2" />
                <div className="h-8 bg-[var(--surface-hover)] rounded-[var(--radius-control)] mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto w-full">
      {/* Featured Spotlight Card on Home tab when not searching */}
      {showHero && !searchQuery && releases.length > 0 && (
        <FeaturedHero
          releases={releases}
          onDownload={onDownload}
          downloadingMap={downloadingMap}
          completedMap={completedMap}
          activeResFilter={activeResFilter}
        />
      )}

      {/* Catalog Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Film className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} />
          <h2 className="text-base font-bold text-[var(--text)] tracking-tight">
            {searchQuery
              ? `Search Results for "${searchQuery}"`
              : showHero
              ? 'Seasonal Releases'
              : 'Anime Catalog'}
          </h2>
          <Badge variant="default" className="text-xs">
            {releases.length} releases
          </Badge>
          {activeResFilter !== 'all' && (
            <Badge variant="accent" className="text-xs">
              {activeResFilter}
            </Badge>
          )}
        </div>

        <Button
          variant="quiet"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-8 px-3"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} strokeWidth={1.75} />
          <span>Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-[var(--radius-panel)] bg-[var(--danger)]/15 text-[var(--danger)] text-xs">
          <p className="font-semibold">Failed to fetch releases</p>
          <p className="mt-0.5 opacity-90">{error}</p>
        </div>
      )}

      {releases.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-[var(--radius-panel)] bg-[var(--surface)] p-8 max-w-lg mx-auto mt-8">
          <div className="w-14 h-14 rounded-[var(--radius-panel)] bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-muted)] mb-3">
            <SearchX className="w-7 h-7" strokeWidth={1.75} />
          </div>
          <h3 className="text-base font-semibold text-[var(--text)]">
            {searchQuery ? 'No releases found' : 'No Sources Configured'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1.5 leading-relaxed">
            {searchQuery
              ? `No releases match "${searchQuery}". Try another keyword or check back later.`
              : 'shuunn ships with zero content sources. Add a third-party source addon or feed in Settings to begin tracking releases.'}
          </p>
          {!searchQuery && onOpenSettings && (
            <Button
              variant="primary"
              size="default"
              onClick={onOpenSettings}
              className="mt-4"
            >
              Configure Sources
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {releases.map((release) => (
            <ReleaseCard
              key={release.id}
              release={release}
              onDownload={onDownload}
              downloadingMap={downloadingMap}
              completedMap={completedMap}
              activeResFilter={activeResFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
