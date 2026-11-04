import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import electron from 'electron';
import { SettingsStore } from './settings-store';

const shell = (electron as any)?.shell || (electron as any)?.default?.shell;

export interface PlayResult {
  success: boolean;
  fallback?: boolean;
  playerPath?: string;
  message?: string;
}

export class PlayerService {
  private settingsStore: SettingsStore;

  constructor(settingsStore: SettingsStore) {
    this.settingsStore = settingsStore;
  }

  detectPlayerPath(): string | null {
    // 1. Check custom configured path
    const configured = this.settingsStore?.get('playerPath') || this.settingsStore?.get('mpvnetPath');
    if (configured && fs.existsSync(configured)) {
      return configured;
    }

    // 2. Default standard media player locations
    const standardPaths = [
      'C:\\Program Files\\mpv.net\\mpvnet.exe',
      'C:\\Program Files (x86)\\mpv.net\\mpvnet.exe',
      'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
      'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
      'C:\\Program Files\\MPC-HC\\mpc-hc64.exe',
      'C:\\Program Files (x86)\\MPC-HC\\mpc-hc.exe',
      'C:\\Program Files\\DAUM\\PotPlayer\\PotPlayer64.exe',
      'C:\\Program Files (x86)\\DAUM\\PotPlayer\\PotPlayer.exe',
      'C:\\Program Files\\mpv\\mpv.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs\\mpv.net\\mpvnet.exe')
    ];

    for (const p of standardPaths) {
      if (p && fs.existsSync(p)) {
        return p;
      }
    }

    // 3. System PATH check for common media players
    try {
      const output = execSync('where.exe mpvnet.exe || where.exe vlc.exe || where.exe mpc-hc64.exe || where.exe mpv.exe || where.exe PotPlayer64.exe', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const firstLine = output.trim().split(/\r?\n/)[0];
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    } catch {
      // not in PATH
    }

    return null;
  }

  detectMpvnetPath(): string | null {
    return this.detectPlayerPath();
  }

  async playVideo(filePath: string): Promise<PlayResult> {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const playerPath = this.detectPlayerPath();

    if (playerPath) {
      try {
        const child = spawn(playerPath, [filePath], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        return { success: true, fallback: false, playerPath };
      } catch (err: any) {
        console.warn(`[player-service] Failed to spawn player at "${playerPath}": ${err.message}. Falling back to shell open.`);
      }
    }

    // Fallback to system default video player
    const openErr = await shell.openPath(filePath);
    if (openErr) {
      throw new Error(`Failed to open video file: ${openErr}`);
    }

    return { success: true, fallback: true, message: 'Opened with OS default media player' };
  }

  async revealFile(filePath: string): Promise<boolean> {
    if (!filePath) return false;
    shell.showItemInFolder(filePath);
    return true;
  }

  async testPlayer(customPath?: string): Promise<{ success: boolean; message?: string }> {
    const candidate = customPath || this.detectPlayerPath();
    if (!candidate || !fs.existsSync(candidate)) {
      return { success: false, message: 'Executable not found' };
    }

    try {
      const child = spawn(candidate, [], { detached: true, stdio: 'ignore' });
      child.unref();
      return { success: true, message: `Successfully launched ${path.basename(candidate)}` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}
