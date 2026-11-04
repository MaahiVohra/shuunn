import React from 'react';
import { Home, Compass, Library, Download, Settings, Play, LucideIcon } from 'lucide-react';
import { ShuunnLogo } from './ShuunnBrand';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { LibraryFile } from '../types/library';

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  activeDownloadCount: number;
  libraryFiles?: LibraryFile[];
  onOpenSettings: () => void;
  onPlayVideo: (filePath: string) => void;
  activeEngineName?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | null;
  pulse?: boolean;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  activeDownloadCount,
  libraryFiles = [],
  onOpenSettings,
  onPlayVideo,
  activeEngineName = 'aria2c'
}: SidebarProps): React.JSX.Element {
  // Extract unique series from library for "Downloaded" quick access
  const installedSeries = React.useMemo(() => {
    const map = new Map<string, { showTitle: string; count: number; latestFile: string }>();
    for (const f of libraryFiles) {
      const show = f.showTitle || 'Anime';
      if (!map.has(show)) {
        map.set(show, { showTitle: show, count: 1, latestFile: f.filePath });
      } else {
        const item = map.get(show)!;
        item.count += 1;
      }
    }
    return Array.from(map.values()).slice(0, 4);
  }, [libraryFiles]);

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'browse', label: 'Browse', icon: Compass },
    {
      id: 'downloads',
      label: 'Downloads',
      icon: Download,
      badge: activeDownloadCount > 0 ? activeDownloadCount : null,
      pulse: activeDownloadCount > 0
    },
    {
      id: 'library',
      label: 'Library',
      icon: Library,
      badge: libraryFiles.length > 0 ? libraryFiles.length : null
    }
  ];

  return (
    <aside className="w-56 bg-[var(--surface)] flex flex-col justify-between select-none shrink-0 h-full">
      {/* Top Section */}
      <div className="p-3 space-y-4">
        {/* Brand Header */}
        <div className="px-2 pt-1 pb-1">
          <ShuunnLogo variant="compact" iconSize={30} />
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-control)] text-xs font-medium transition-colors relative cursor-pointer ${
                  isActive
                    ? 'bg-[var(--surface-hover)] text-[var(--text)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
                    strokeWidth={1.75}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  <Badge
                    variant={isActive || item.pulse ? 'accent' : 'default'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Recent / Downloaded Quick Access */}
        {installedSeries.length > 0 && (
          <div className="pt-3 space-y-2">
            <div className="flex items-center justify-between px-2 text-[11px] font-medium text-[var(--text-muted)]">
              <span>Downloaded</span>
              <span className="tabular-nums text-[10px] opacity-75">{libraryFiles.length} files</span>
            </div>

            <div className="space-y-0.5">
              {installedSeries.map((s) => (
                <div
                  key={s.showTitle}
                  onClick={() => onPlayVideo(s.latestFile)}
                  className="group flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-control)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                  title={`Play latest: ${s.showTitle}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPlayVideo(s.latestFile);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-4 h-4 rounded-[var(--radius-control)] bg-[var(--surface-hover)] flex items-center justify-center text-[var(--accent)] shrink-0 group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                      <Play className="w-2.5 h-2.5 fill-current" strokeWidth={1.75} />
                    </div>
                    <span className="text-xs text-[var(--text)] truncate font-normal">
                      {s.showTitle}
                    </span>
                  </div>
                  <span className="text-[10px] tabular-nums text-[var(--text-muted)] shrink-0 ml-1">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Section */}
      <div className="p-3 bg-[var(--surface)] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
          <span className="text-[11px] font-mono opacity-80">{activeEngineName}</span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="quiet"
              size="icon-sm"
              onClick={onOpenSettings}
              aria-label="Settings"
            >
              <Settings className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--text)]" strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
