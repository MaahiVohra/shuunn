import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ReleasesView } from './components/ReleasesView';
import { DownloadsView } from './components/DownloadsView';
import { LibraryView } from './components/LibraryView';
import { SettingsModal } from './components/SettingsModal';
import { TooltipProvider } from './components/ui/tooltip';
import { makeReleaseKey, parseReleaseInfo } from './lib/utils';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { ReleaseItem, DownloadOption } from './types/release';
import { DownloadItemModel } from './types/download';
import { LibraryFile } from './types/library';
import { AppSettings } from './types/settings';

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'browse' | 'library' | 'downloads'>('home');
  const [activeResFilter, setActiveResFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [releasesError, setReleasesError] = useState<string | null>(null);

  const [downloads, setDownloads] = useState<DownloadItemModel[]>([]);
  const [speedHistory, setSpeedHistory] = useState<{ down: number; up: number }[]>(() =>
    Array.from({ length: 60 }, () => ({ down: 0, up: 0 }))
  );
  const [peakDown, setPeakDown] = useState(0);
  const [peakUp, setPeakUp] = useState(0);
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [downloadDir, setDownloadDir] = useState('');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [, setProviderName] = useState('');
  const [torrentEngineName, setTorrentEngineName] = useState('aria2c');

  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Navigation History
  const [history, setHistory] = useState<('home' | 'browse' | 'library' | 'downloads')[]>(['home']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const completedGidsRef = useRef<Set<string>>(new Set());
  const isInitialPollRef = useRef(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize theme from local storage
  useEffect(() => {
    const savedTheme = (localStorage.getItem('shuunn-theme') as 'dark' | 'light') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    window.electronAPI?.setTitleBarTheme?.(savedTheme);
  }, []);

  // Subscribe to background download completions dispatched from Electron main process
  useEffect(() => {
    if (!window.electronAPI?.onDownloadComplete) return;

    const unsubscribe = window.electronAPI.onDownloadComplete((task) => {
      if (task?.id) {
        completedGidsRef.current.add(task.id);
      }
      addToast({
        type: 'success',
        title: 'Download Complete!',
        message: task?.title || 'Anime episode finished downloading.'
      });
      fetchLibrary();
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const navigateToTab = (tab: 'home' | 'browse' | 'library' | 'downloads') => {
    if (tab === activeTab) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(tab);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setActiveTab(tab);
  };

  const handleNavigateBack = () => {
    if (historyIndex > 0) {
      const prevTab = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setActiveTab(prevTab);
    }
  };

  const handleNavigateForward = () => {
    if (historyIndex < history.length - 1) {
      const nextTab = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setActiveTab(nextTab);
    }
  };

  // Toast notification helper
  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Debounce search query (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery.trim() && activeTab !== 'browse' && activeTab !== 'home') {
        navigateToTab('browse');
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch releases whenever debouncedQuery changes
  const fetchReleases = async () => {
    if (!window.electronAPI) return;
    setLoadingReleases(true);
    setReleasesError(null);
    try {
      let data: ReleaseItem[] = [];
      if (debouncedQuery.trim()) {
        data = await window.electronAPI.searchReleases(debouncedQuery);
      } else {
        data = await window.electronAPI.getReleases();
      }
      setReleases(data || []);
    } catch (err: any) {
      console.error('Failed to load releases:', err);
      setReleasesError(err?.message || 'Error fetching releases');
    } finally {
      setLoadingReleases(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, [debouncedQuery]);

  // Fetch library files
  const fetchLibrary = async () => {
    if (!window.electronAPI?.getLibraryFiles) return;
    setLoadingLibrary(true);
    try {
      const files = await window.electronAPI.getLibraryFiles();
      setLibraryFiles(files || []);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [activeTab]);

  // Initial app load: settings & provider
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then((s) => {
        if (s?.preferredResolution) {
          setActiveResFilter(s.preferredResolution);
        }
        if (s?.downloadDir) {
          setDownloadDir(s.downloadDir);
        }
        if (s?.activeTorrentEngine) {
          setTorrentEngineName(s.activeTorrentEngine);
        }
      });
      window.electronAPI.getProviders?.().then((provs) => {
        if (provs && provs.length > 0) {
          setProviderName(provs[0].displayName || 'Active Source');
        } else {
          setProviderName('No Sources');
        }
      });
    }
  }, []);

  // 1-second interval poller for active downloads
  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      if (!window.electronAPI?.getDownloadsStatus) return;
      try {
        const statuses = await window.electronAPI.getDownloadsStatus();
        if (!isMounted) return;
        setDownloads(statuses || []);

        // Compute aggregate speeds and update rolling throughput timeline
        const currentDown = (statuses || []).reduce((acc, d) => acc + (d.downloadSpeed || 0), 0);
        const currentUp = (statuses || []).reduce((acc, d) => acc + (d.uploadSpeed || 0), 0);

        setPeakDown((prev) => Math.max(prev, currentDown));
        setPeakUp((prev) => Math.max(prev, currentUp));

        setSpeedHistory((prev) => {
          const next = prev.slice(1);
          next.push({ down: currentDown, up: currentUp });
          return next;
        });

        // Check for new completions (Renderer fallback)
        if (isInitialPollRef.current) {
          for (const item of statuses || []) {
            if (item.status === 'complete') {
              completedGidsRef.current.add(item.id);
            }
          }
          isInitialPollRef.current = false;
        } else {
          for (const item of statuses || []) {
            if (item.status === 'complete' && !completedGidsRef.current.has(item.id)) {
              completedGidsRef.current.add(item.id);
              addToast({
                type: 'success',
                title: 'Download Complete!',
                message: item.title || 'Anime episode finished downloading.'
              });
              if (window.electronAPI?.showNotification) {
                window.electronAPI.showNotification({
                  title: 'Download Complete!',
                  body: `${item.title || 'Anime episode'} has finished downloading.`
                });
              }
              fetchLibrary();
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    poll();
    const timer = setInterval(poll, 1000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [activeTab]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        navigateToTab('home');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        navigateToTab('browse');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault();
        navigateToTab('library');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '4') {
        e.preventDefault();
        navigateToTab('downloads');
      } else if (e.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen, activeTab, historyIndex]);

  // Download Handler
  const handleStartDownload = async (dl: DownloadOption, release: ReleaseItem) => {
    const key = makeReleaseKey(release.showTitle, release.episode, dl.resolution);
    setPendingMap((prev) => ({ ...prev, [key]: true }));

    try {
      const episodeTitle = `${release.showTitle} - ${release.episode} (${dl.resolution})`;
      await window.electronAPI!.startDownload({
        magnet: dl.magnet,
        title: episodeTitle,
        showTitle: release.showTitle,
        episode: release.episode,
        resolution: dl.resolution
      });

      addToast({
        type: 'info',
        title: 'Download Queued',
        message: `${release.showTitle} EP ${release.episode} (${dl.resolution}) added to download queue.`
      });

      // Clear pending state after 2.5s (by then aria2 poller has picked up the task)
      setTimeout(() => {
        setPendingMap((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 2500);
    } catch (err: any) {
      console.error('Failed to start download:', err);
      setPendingMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      addToast({
        type: 'error',
        title: 'Download Failed',
        message: err?.message || 'Could not initiate download.'
      });
    }
  };

  // Video Playback Handler
  const handlePlayVideo = async (filePath: string) => {
    if (!filePath || !window.electronAPI) return;
    try {
      const res = await window.electronAPI.playInMpvnet(filePath);
      if (res?.fallback) {
        addToast({
          type: 'info',
          title: 'Media Player Launched',
          message: 'Playing with default media player.'
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Playback Error',
        message: err?.message || 'Playback failed'
      });
    }
  };

  // Delete Library File
  const handleDeleteLibraryFile = async (filePath: string) => {
    if (!filePath || !window.electronAPI?.deleteLibraryFile) return;
    setLibraryFiles((prev) => prev.filter((f) => f.filePath !== filePath));

    try {
      const res = await window.electronAPI.deleteLibraryFile(filePath);
      if (res.success) {
        addToast({
          type: 'info',
          title: 'Episode Moved to Recycle Bin',
          message: 'File was sent to your Recycle Bin.'
        });
        if (window.electronAPI?.getDownloadsStatus) {
          const statuses = await window.electronAPI.getDownloadsStatus();
          setDownloads(statuses || []);
        }
        fetchLibrary();
      } else {
        addToast({
          type: 'error',
          title: 'Delete Failed',
          message: res.message || 'Could not delete file.'
        });
        fetchLibrary();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: err?.message || 'Delete operation error'
      });
      fetchLibrary();
    }
  };

  // Reveal in Folder
  const handleReveal = async (filePath: string) => {
    if (!filePath || !window.electronAPI) return;
    await window.electronAPI.revealFile(filePath);
  };

  // Pause / Resume / Cancel
  const handlePause = async (id: string) => {
    if (window.electronAPI) await window.electronAPI.pauseDownload(id);
  };

  const handleResume = async (id: string) => {
    if (window.electronAPI) await window.electronAPI.resumeDownload(id);
  };

  const handleCancel = async (id: string) => {
    completedGidsRef.current.delete(id);
    setDownloads((prev) => prev.filter((d) => d.id !== id));
    if (window.electronAPI) {
      await window.electronAPI.cancelDownload(id);
      fetchLibrary();
      if (window.electronAPI?.getDownloadsStatus) {
        const statuses = await window.electronAPI.getDownloadsStatus();
        setDownloads(statuses || []);
      }
    }
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    if (!window.electronAPI) return;
    await window.electronAPI.saveSettings(newSettings);
    if (newSettings.activeTorrentEngine) {
      await window.electronAPI.setTorrentEngine?.(newSettings.activeTorrentEngine);
      setTorrentEngineName(newSettings.activeTorrentEngine);
    }
    if (newSettings.activeProvider) {
      await window.electronAPI.setProvider?.(newSettings.activeProvider);
      fetchReleases();
    }
    if (newSettings.preferredResolution) {
      setActiveResFilter(newSettings.preferredResolution);
    }
    if (newSettings.downloadDir) {
      setDownloadDir(newSettings.downloadDir);
    }
    addToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Your preferences have been updated successfully.'
    });
  };

  const handleTestPlayer = async (customPath?: string) => {
    if (!window.electronAPI) return { success: false, message: 'API unavailable' };
    return await window.electronAPI.testPlayer(customPath);
  };

  // Count active downloads
  const activeDownloadCount = useMemo(() => {
    return downloads.filter((d) => d.status === 'active' || d.status === 'waiting').length;
  }, [downloads]);

  // Completed map for release cards
  const completedMap = useMemo(() => {
    const map: Record<string, boolean> = {};

    for (const d of downloads) {
      if (d.status === 'complete') {
        const parsed = parseReleaseInfo(d.title || d.filePath || '');
        const ep = d.episode || parsed.episode;
        const res = d.resolution || parsed.resolution;
        const show = d.showTitle || '';
        if (show && ep && res) {
          map[makeReleaseKey(show, ep, res)] = true;
        }
      }
    }

    for (const f of libraryFiles) {
      const parsed = parseReleaseInfo(f.fileName);
      const ep = parsed.episode;
      const res = parsed.resolution;
      const show = f.showTitle || '';
      if (show && ep && res) {
        map[makeReleaseKey(show, ep, res)] = true;
      }
    }

    return map;
  }, [downloads, libraryFiles]);

  // Downloading map for release cards
  const downloadingMap = useMemo(() => {
    const map: Record<string, boolean> = {};

    for (const d of downloads) {
      if (d.status === 'active' || d.status === 'waiting' || d.status === 'paused') {
        const parsed = parseReleaseInfo(d.title || d.filePath || '');
        const ep = d.episode || parsed.episode;
        const res = d.resolution || parsed.resolution;
        const show = d.showTitle || '';
        if (show && ep && res) {
          map[makeReleaseKey(show, ep, res)] = true;
        }
      }
    }

    for (const key of Object.keys(pendingMap)) {
      if (!completedMap[key]) {
        map[key] = true;
      }
    }

    return map;
  }, [downloads, pendingMap, completedMap]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] font-sans">
        {/* Modern Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={navigateToTab}
          activeDownloadCount={activeDownloadCount}
          libraryFiles={libraryFiles}
          onOpenSettings={() => setSettingsOpen(true)}
          onPlayVideo={handlePlayVideo}
          activeEngineName={torrentEngineName}
        />

        {/* Main App Container */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] overflow-hidden">
          {/* Top Header Bar */}
          <Header
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeResFilter={activeResFilter}
            setActiveResFilter={setActiveResFilter}
            searchInputRef={searchInputRef}
            onNavigateBack={handleNavigateBack}
            onNavigateForward={handleNavigateForward}
            canGoBack={historyIndex > 0}
            canGoForward={historyIndex < history.length - 1}
          />

          {/* Main Viewport Content */}
          <main className="flex-1 flex overflow-hidden relative bg-[var(--bg)]">
            {activeTab === 'home' && (
              <ReleasesView
                releases={releases}
                loading={loadingReleases}
                error={releasesError}
                onRefresh={fetchReleases}
                onDownload={handleStartDownload}
                onOpenSettings={() => setSettingsOpen(true)}
                downloadingMap={downloadingMap}
                completedMap={completedMap}
                activeResFilter={activeResFilter}
                searchQuery={debouncedQuery}
                showHero={true}
              />
            )}

            {activeTab === 'browse' && (
              <ReleasesView
                releases={releases}
                loading={loadingReleases}
                error={releasesError}
                onRefresh={fetchReleases}
                onDownload={handleStartDownload}
                onOpenSettings={() => setSettingsOpen(true)}
                downloadingMap={downloadingMap}
                completedMap={completedMap}
                activeResFilter={activeResFilter}
                searchQuery={debouncedQuery}
                showHero={false}
              />
            )}

            {activeTab === 'downloads' && (
              <DownloadsView
                downloads={downloads}
                speedHistory={speedHistory}
                peakDown={peakDown}
                peakUp={peakUp}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={handleCancel}
                onPlay={handlePlayVideo}
                onNavigateBrowse={() => navigateToTab('browse')}
                onOpenSettings={() => setSettingsOpen(true)}
                downloadDir={downloadDir}
              />
            )}

            {activeTab === 'library' && (
              <LibraryView
                files={libraryFiles}
                loading={loadingLibrary}
                onRefresh={fetchLibrary}
                onPlay={handlePlayVideo}
                onReveal={handleReveal}
                onDelete={handleDeleteLibraryFile}
                onNavigateBrowse={() => navigateToTab('browse')}
              />
            )}
          </main>
        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
          onTestPlayer={handleTestPlayer}
        />

        {/* Toast Notifications Stack */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-[var(--surface)] rounded-[var(--radius-panel)] p-3 shadow-[var(--shadow-floating)] flex items-start gap-2.5 animate-in slide-in-from-bottom-2 duration-150"
            >
              {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" strokeWidth={1.75} />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" strokeWidth={1.75} />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" strokeWidth={1.75} />}

              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-semibold text-[var(--text)]">{toast.title}</h5>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{toast.message}</p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
