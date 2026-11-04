import React, { useState, useEffect } from 'react';
import {
  Folder,
  Play,
  Check,
  AlertCircle,
  Bell,
  Video,
  HardDrive,
  Sparkles,
  Sun,
  Moon,
  User,
  ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { AppSettings } from '../types/settings';
import { AuthAccountsState } from '../types/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Partial<AppSettings>) => Promise<void>;
  onTestPlayer: (path?: string) => Promise<{ success: boolean; message?: string }>;
}

export function SettingsModal({ isOpen, onClose, onSave, onTestPlayer }: SettingsModalProps) {
  const [settings, setSettings] = useState<Partial<AppSettings>>({
    downloadDir: '',
    playerPath: '',
    mpvnetPath: '',
    notifyOnComplete: true,
    preferredResolution: '1080p',
    activeProvider: '',
    activeTorrentEngine: 'aria2'
  });

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [providers, setProviders] = useState<{ id: string; displayName: string; description?: string }[]>([]);
  const [engines, setEngines] = useState<{ id: string; displayName: string; description?: string }[]>([]);
  const [authAccounts, setAuthAccounts] = useState<AuthAccountsState>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    // Read current theme from html data-theme
    const currentTheme = (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
    setTheme(currentTheme);

    if (!isOpen) return;

    if (window.electronAPI) {
      window.electronAPI.getSettings().then((s) => {
        if (s) setSettings((prev) => ({ ...prev, ...s }));
      });

      window.electronAPI.getProviders?.().then((p) => {
        if (p) setProviders(p);
      });

      window.electronAPI.getTorrentEngines?.().then((e) => {
        if (e) setEngines(e);
      });

      window.electronAPI.getAuthAccounts?.().then((acc) => {
        if (acc) setAuthAccounts(acc);
      });
    }
    setTestResult(null);
    setSavedSuccess(false);
  }, [isOpen]);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('shuunn-theme', newTheme);
    window.electronAPI?.setTitleBarTheme?.(newTheme);
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI?.selectFolder) {
      const folder = await window.electronAPI.selectFolder();
      if (folder) {
        setSettings((prev) => ({ ...prev, downloadDir: folder }));
      }
    }
  };

  const handleSelectFile = async () => {
    if (window.electronAPI?.selectFile) {
      const file = await window.electronAPI.selectFile([
        { name: 'Executable files (*.exe)', extensions: ['exe'] }
      ]);
      if (file) {
        setSettings((prev) => ({ ...prev, playerPath: file, mpvnetPath: file }));
      }
    }
  };

  const handleTestPlayer = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestPlayer(settings.playerPath || settings.mpvnetPath);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Player test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleTestNotification = async () => {
    if (window.electronAPI?.showNotification) {
      await window.electronAPI.showNotification({
        title: 'shuunn Notification Test',
        body: 'Windows desktop notifications are active and working!'
      });
    }
  };

  const handleSave = async () => {
    await onSave(settings);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-5">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>
            Configure appearance, local storage, media player, and tracker integrations.
          </DialogDescription>
        </DialogHeader>

        {/* Modal Body */}
        <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
          {/* Appearance / Theme Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-[var(--peach)]" strokeWidth={1.75} />
                )}
                Theme Mode
              </span>
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={theme === 'dark' ? 'primary' : 'quiet'}
                size="sm"
                onClick={() => handleThemeChange('dark')}
                className="flex-1"
              >
                <Moon className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
                Dark (Midnight Navy)
              </Button>
              <Button
                type="button"
                variant={theme === 'light' ? 'primary' : 'quiet'}
                size="sm"
                onClick={() => handleThemeChange('light')}
                className="flex-1"
              >
                <Sun className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
                Light (Clean)
              </Button>
            </div>
          </div>

          {/* Download Directory */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text)] flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
              Download Directory
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={settings.downloadDir || ''}
                onChange={(e) => setSettings({ ...settings, downloadDir: e.target.value })}
                className="font-mono text-xs"
              />
              <Button
                variant="quiet"
                size="sm"
                onClick={handleSelectFolder}
                className="shrink-0"
              >
                Browse...
              </Button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] opacity-75">
              Episodes are organized into show subfolders automatically.
            </p>
          </div>

          {/* Media Player Executable Path */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text)] flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
              Media Player Path
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="e.g. C:\Program Files\mpv.net\mpvnet.exe or VLC"
                value={settings.playerPath || settings.mpvnetPath || ''}
                onChange={(e) => setSettings({ ...settings, playerPath: e.target.value, mpvnetPath: e.target.value })}
                className="font-mono text-xs"
              />
              <Button
                variant="quiet"
                size="sm"
                onClick={handleSelectFile}
                className="shrink-0"
              >
                Browse...
              </Button>
              <Button
                variant="quiet"
                size="sm"
                onClick={handleTestPlayer}
                disabled={testing}
                className="shrink-0"
              >
                {testing ? 'Testing...' : 'Test'}
              </Button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] opacity-75">
              Path to your video player executable. Leave empty to use system default.
            </p>

            {testResult && (
              <p
                className={`text-[11px] flex items-center gap-1 mt-1 font-medium ${
                  testResult.success ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-3 h-3" strokeWidth={1.75} />
                ) : (
                  <AlertCircle className="w-3 h-3" strokeWidth={1.75} />
                )}
                {testResult.message}
              </p>
            )}
          </div>

          {/* Torrent Engine Adapter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text)] flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
              Active Torrent Engine
            </label>
            <Select
              value={settings.activeTorrentEngine || 'aria2'}
              onValueChange={(val) => setSettings({ ...settings, activeTorrentEngine: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select torrent engine" />
              </SelectTrigger>
              <SelectContent>
                {engines.length > 0 ? (
                  engines.map((eng) => (
                    <SelectItem key={eng.id} value={eng.id}>
                      {eng.displayName} {eng.description ? `(${eng.description})` : ''}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="aria2">Embedded aria2c (Default)</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-[var(--text-muted)] opacity-75">
              Underlying engine used for downloading episodes.
            </p>
          </div>

          {/* Preferred Resolution */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text)] flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
              Preferred Resolution
            </label>
            <div className="flex gap-2">
              {(['1080p', '720p', '480p'] as const).map((res) => {
                const isSelected = settings.preferredResolution === res;
                return (
                  <Button
                    key={res}
                    type="button"
                    variant={isSelected ? 'primary' : 'quiet'}
                    size="sm"
                    onClick={() => setSettings({ ...settings, preferredResolution: res })}
                    className="flex-1"
                  >
                    {res}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
              <div>
                <p className="text-xs font-medium text-[var(--text)]">Completion Notifications</p>
                <p className="text-[11px] text-[var(--text-muted)] opacity-75">
                  Show desktop alert when an episode finishes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={handleTestNotification}
                className="h-7 text-xs px-2"
                title="Send a sample Windows notification"
              >
                Test Alert
              </Button>
              <input
                type="checkbox"
                checked={settings.notifyOnComplete ?? true}
                onChange={(e) => setSettings({ ...settings, notifyOnComplete: e.target.checked })}
                className="w-4 h-4 accent-[var(--accent)] rounded-[var(--radius-control)] cursor-pointer"
              />
            </div>
          </div>

          {/* Local User Profile & External Trackers (Task 1.5) */}
          <div className="pt-3 border-t border-[var(--line)] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                <span className="text-xs font-medium text-[var(--text)]">Profile & External Trackers</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[var(--radius-control)] bg-[var(--surface-hover)] text-[var(--text-muted)]">
                Local-First
              </span>
            </div>

            <div className="p-2.5 rounded-[var(--radius-panel)] bg-[var(--bg)] border border-[var(--line)] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--text)]">Local Offline Profile</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Active • Data stored in SQLite at %APPDATA%/shuunn/</p>
                </div>
                <span className="text-[10px] text-[var(--success)] font-medium">Active</span>
              </div>

              <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--text)]">AniList</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {authAccounts.anilist?.connected
                      ? `Connected as ${authAccounts.anilist.username}`
                      : 'Connect to sync watched episodes and status'}
                  </p>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {authAccounts.anilist?.connected ? 'Linked' : 'Available in Phase 3'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="quiet"
            size="default"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="default"
            onClick={handleSave}
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
                Saved
              </>
            ) : (
              'Save settings'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
