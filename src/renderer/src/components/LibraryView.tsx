import React, { useState, useMemo } from 'react';
import { LibraryItem } from './LibraryItem';
import {
  Folder,
  RefreshCw,
  Film,
  Search,
  LayoutGrid,
  List,
  Play
} from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { LibraryFile } from '../types/library';

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface LibraryViewProps {
  files?: LibraryFile[];
  loading?: boolean;
  onRefresh: () => void;
  onPlay: (path: string) => void;
  onReveal: (path: string) => void;
  onDelete: (path: string) => void;
  onNavigateBrowse: () => void;
}

interface SeriesGroup {
  title: string;
  files: LibraryFile[];
  totalSize: number;
  latestDate: string;
}

export function LibraryView({
  files = [],
  loading,
  onRefresh,
  onPlay,
  onReveal,
  onDelete,
  onNavigateBrowse
}: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'size'>('recent');

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    const result = files.filter((f) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        f.fileName.toLowerCase().includes(q) ||
        (f.showTitle && f.showTitle.toLowerCase().includes(q))
      );
    });

    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.fileName.localeCompare(b.fileName));
    } else if (sortBy === 'size') {
      result.sort((a, b) => (b.size || 0) - (a.size || 0));
    }

    return result;
  }, [files, searchQuery, sortBy]);

  // Group files by showTitle for Collections view
  const seriesGroups = useMemo(() => {
    const groups: Record<string, SeriesGroup> = {};
    for (const f of filteredFiles) {
      const show = f.showTitle || 'Other Downloads';
      if (!groups[show]) {
        groups[show] = {
          title: show,
          files: [],
          totalSize: 0,
          latestDate: f.modifiedAt
        };
      }
      groups[show].files.push(f);
      groups[show].totalSize += f.size || 0;
    }
    return Object.values(groups);
  }, [filteredFiles]);

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto w-full">
      {/* View Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-[var(--text)] tracking-tight">Library</h1>
            <Badge variant="default" className="text-[11px]">
              {files.length} downloaded
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 tabular-nums">
            {formatBytes(totalBytes)} across {seriesGroups.length} series
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none" strokeWidth={1.75} />
            <Input
              type="text"
              placeholder="Filter library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-44 lg:w-56 text-xs bg-[var(--surface)] border-none"
            />
          </div>

          {/* Sort Selector */}
          <Select value={sortBy} onValueChange={(val: 'recent' | 'name' | 'size') => setSortBy(val)}>
            <SelectTrigger className="h-8 w-28 text-xs bg-[var(--surface)] border-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="name">Show Title</SelectItem>
              <SelectItem value="size">File Size</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center bg-[var(--surface)] rounded-[var(--radius-control)] p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'quiet'}
                  size="icon-sm"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.75} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collections grid</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'quiet'}
                  size="icon-sm"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List className="w-3.5 h-3.5" strokeWidth={1.75} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Detailed list</TooltipContent>
            </Tooltip>
          </div>

          {/* Refresh Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="quiet"
                size="icon-sm"
                onClick={onRefresh}
                disabled={loading}
                aria-label="Refresh library"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[var(--text-muted)] ${
                    loading ? 'animate-spin' : ''
                  }`}
                  strokeWidth={1.75}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh folder scan</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content Rendering */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]">
          <Film className="w-8 h-8 text-[var(--text-muted)]/50 mb-3" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-[var(--text)]">No episodes downloaded yet</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mb-4">
            Completed downloads from release feeds are cataloged here automatically.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={onNavigateBrowse}
          >
            Browse Releases
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Series Collections Grid View */
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-semibold text-[var(--text-muted)]">
                Series collections
              </h2>
              <Badge variant="default" className="text-[10px]">
                {seriesGroups.length}
              </Badge>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {seriesGroups.map((group) => {
                const latestEpisode = group.files[0];

                return (
                  <div
                    key={group.title}
                    className="group bg-[var(--surface)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-panel)] p-3.5 transition-colors flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--surface-hover)] flex items-center justify-center text-[var(--accent)] shrink-0">
                          <Film className="w-4 h-4" strokeWidth={1.75} />
                        </div>
                        <Badge variant="default" className="text-[10px]">
                          {group.files.length} {group.files.length === 1 ? 'ep' : 'eps'}
                        </Badge>
                      </div>

                      <div>
                        <h3
                          className="text-xs font-semibold text-[var(--text)] truncate"
                          title={group.title}
                        >
                          {group.title}
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                          {formatBytes(group.totalSize)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => latestEpisode && onPlay(latestEpisode.filePath)}
                        className="flex-1 text-xs"
                      >
                        <Play className="w-3 h-3 mr-1 fill-current" strokeWidth={1.75} />
                        Play Latest
                      </Button>

                      {latestEpisode && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="quiet"
                              size="icon-sm"
                              onClick={() => onReveal(latestEpisode.filePath)}
                              aria-label="Open folder"
                            >
                              <Folder className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.75} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Open folder</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Episode List Section */}
          <div className="space-y-2.5 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs font-semibold text-[var(--text-muted)]">
                All episodes
              </h2>
              <Badge variant="default" className="text-[10px]">
                {filteredFiles.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <LibraryItem
                  key={file.filePath}
                  item={file}
                  onPlay={onPlay}
                  onReveal={onReveal}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Detailed List View */
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <LibraryItem
              key={file.filePath}
              item={file}
              onPlay={onPlay}
              onReveal={onReveal}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
