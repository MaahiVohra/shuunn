import React, { RefObject } from 'react';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeResFilter: string;
  setActiveResFilter: (res: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

export function Header({
  searchQuery,
  setSearchQuery,
  activeResFilter,
  setActiveResFilter,
  searchInputRef,
  onNavigateBack,
  onNavigateForward,
  canGoBack = false,
  canGoForward = false
}: HeaderProps) {
  const resolutions = ['all', '1080p', '720p', '480p'];

  return (
    <header className="h-14 bg-[var(--surface)] px-4 flex items-center justify-between gap-4 app-drag-region pr-36 select-none shrink-0">
      {/* Navigation History */}
      <div className="flex items-center gap-1.5 app-no-drag">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="quiet"
              size="icon-sm"
              onClick={onNavigateBack}
              disabled={!canGoBack}
              aria-label="Go back"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="quiet"
              size="icon-sm"
              onClick={onNavigateForward}
              disabled={!canGoForward}
              aria-label="Go forward"
            >
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Forward</TooltipContent>
        </Tooltip>
      </div>

      {/* Centered Search Bar */}
      <div className="flex-1 max-w-lg mx-auto app-no-drag">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)]/70 absolute left-3 pointer-events-none" strokeWidth={1.75} />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search anime releases... (Ctrl K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-18 h-8 text-xs bg-[var(--bg)] border-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
          />

          <div className="absolute right-2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--text-muted)] hover:text-[var(--text)] p-0.5 rounded-[var(--radius-control)]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            )}
            <kbd className="px-1.5 py-0.5 rounded-[var(--radius-control)] bg-[var(--surface-hover)] text-[10px] font-mono text-[var(--text-muted)] pointer-events-none">
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* Resolution Quality Filter Controls */}
      <div className="flex items-center gap-1 p-0.5 bg-[var(--bg)] rounded-[var(--radius-control)] app-no-drag shrink-0">
        {resolutions.map((res) => {
          const isSelected = activeResFilter === res;
          return (
            <button
              key={res}
              type="button"
              onClick={() => setActiveResFilter(res)}
              className={`px-2.5 py-1 text-xs font-medium rounded-[var(--radius-control)] transition-colors capitalize cursor-pointer ${
                isSelected
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {res}
            </button>
          );
        })}
      </div>
    </header>
  );
}
