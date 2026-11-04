import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import crypto from 'node:crypto';
import electron from 'electron';
import { BaseTorrentAdapter, AddDownloadOptions } from '../torrent-adapter';
import { DownloadItemModel } from '../../../renderer/src/types/download';
// @ts-ignore
import { ensureAria2Binary } from '../../../../scripts/setup-aria2.mjs';

const app = (electron as any)?.app || (electron as any)?.default?.app;

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort = 6800, maxAttempts = 20): Promise<number> {
  for (let p = startPort; p < startPort + maxAttempts; p++) {
    if (await isPortAvailable(p)) return p;
  }
  return startPort;
}

function sanitizeFolderName(name: string): string {
  return (name || '').replace(/[\\/:*?"<>|]/g, '').trim() || 'Anime';
}

interface TaskMetadata {
  title: string;
  showTitle: string;
  episode?: string;
  resolution?: string;
}

export class Aria2Adapter extends BaseTorrentAdapter {
  public process: ChildProcess | null;
  public initPromise: Promise<void> | null;
  public port: number;
  public rpcSecret: string;
  public appDataDir: string;
  public metadataStore: Map<string, TaskMetadata>;
  public requestId: number;

  constructor() {
    super('aria2', 'Embedded aria2c', 'High-speed embedded BitTorrent engine powered by aria2c');
    this.process = null;
    this.initPromise = null;
    this.port = 6800;
    this.rpcSecret = crypto.randomBytes(16).toString('hex');
    this.appDataDir = '';
    this.metadataStore = new Map();
    this.requestId = 1;
  }

  private async _sendRpc(method: string, params: any[] = []): Promise<any> {
    if (!this.process) {
      console.log('[aria2-adapter] Process not running, initializing daemon before RPC...');
      await this.init();
    }

    const payload = {
      jsonrpc: '2.0',
      id: `shuunn-${this.requestId++}`,
      method: `aria2.${method}`,
      params: [`token:${this.rpcSecret}`, ...params]
    };

    let res: Response;
    try {
      res = await fetch(`http://127.0.0.1:${this.port}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      // If daemon was interrupted or restarting, retry once after brief pause
      try {
        await new Promise(r => setTimeout(r, 500));
        res = await fetch(`http://127.0.0.1:${this.port}/jsonrpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (retryErr: any) {
        throw new Error(`Failed to communicate with aria2 daemon on port ${this.port}: ${retryErr.message}`);
      }
    }

    if (!res.ok) {
      throw new Error(`aria2 RPC HTTP error ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(`aria2 RPC method ${method} error: ${json.error.message} (${json.error.code})`);
    }

    return json.result;
  }

  async init(): Promise<void> {
    if (this.process) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // 1. Ensure binary exists
      const binPath = await ensureAria2Binary();

      // 2. Prepare APPDATA directory
      const userAppData = app?.getPath('userData') || path.join(process.env.APPDATA || process.cwd(), 'shuunn');
      this.appDataDir = userAppData;
      if (!fs.existsSync(this.appDataDir)) {
        fs.mkdirSync(this.appDataDir, { recursive: true });
      }

      const sessionFile = path.join(this.appDataDir, 'aria2.session');
      if (!fs.existsSync(sessionFile)) {
        fs.writeFileSync(sessionFile, '', 'utf8');
      }

      // 3. Find available port
      this.port = await findAvailablePort(6800);

      // 4. Write runtime config for tooling / skills
      const runtimeConfig = {
        port: this.port,
        secret: this.rpcSecret,
        pid: process.pid,
        startedAt: new Date().toISOString()
      };
      fs.writeFileSync(path.join(this.appDataDir, 'aria2-runtime.json'), JSON.stringify(runtimeConfig, null, 2), 'utf8');

      // 5. Spawn aria2c daemon
      const args = [
        '--enable-rpc=true',
        `--rpc-listen-port=${this.port}`,
        `--rpc-secret=${this.rpcSecret}`,
        '--bt-enable-lpd=true',
        '--enable-dht=true',
        '--dht-listen-port=6881',
        '--listen-port=6881',
        '--seed-time=0',
        '--max-connection-per-server=16',
        `--save-session=${sessionFile}`,
        `--input-file=${sessionFile}`,
        '--save-session-interval=30',
        '--rpc-allow-origin-all=true',
        '--quiet=true'
      ];

      console.log(`[aria2-adapter] Spawning aria2c daemon on port ${this.port}...`);
      this.process = spawn(binPath, args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.process.on('error', (err) => {
        console.error('[aria2-adapter] Process error:', err);
      });

      this.process.on('exit', (code, signal) => {
        console.log(`[aria2-adapter] aria2c process exited with code ${code}, signal ${signal}`);
        this.process = null;
      });

      // 6. Wait for RPC readiness (up to 3 seconds)
      let ready = false;
      for (let i = 0; i < 15; i++) {
        try {
          await new Promise(r => setTimeout(r, 200));
          await this._sendRpc('getVersion');
          ready = true;
          break;
        } catch {
          // still spinning up
        }
      }

      if (!ready) {
        console.warn('[aria2-adapter] aria2 daemon RPC did not respond immediately, continuing...');
      } else {
        console.log('[aria2-adapter] aria2c daemon successfully initialized and connected via JSON-RPC.');
      }
    })().finally(() => {
      this.initPromise = null;
    });

    return this.initPromise;
  }

  async shutdown(): Promise<void> {
    if (!this.process) return;

    try {
      console.log('[aria2-adapter] Requesting aria2.shutdown...');
      await this._sendRpc('shutdown');
    } catch {
      // If RPC fails, kill directly
    }

    if (this.process) {
      try {
        this.process.kill();
      } catch {
        // ignored
      }
      this.process = null;
    }
  }

  async addDownload({ magnet, downloadDir, title, showTitle, episode, resolution }: AddDownloadOptions): Promise<{ id: string }> {
    if (!magnet) throw new Error('Magnet URL is required');

    let targetDir = downloadDir || path.join(app.getPath('downloads'), 'shuunn');
    if (showTitle) {
      targetDir = path.join(targetDir, sanitizeFolderName(showTitle));
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const options = {
      dir: targetDir
    };

    const gid = await this._sendRpc('addUri', [[magnet], options]);

    // Save extra metadata for UI richness
    this.metadataStore.set(gid, {
      title: title || showTitle || 'Anime Episode',
      showTitle: showTitle || '',
      episode: episode ? String(episode) : '',
      resolution: resolution || '1080p'
    });

    return { id: gid };
  }

  private _formatTask(task: any): DownloadItemModel | null {
    // 1. If this task spawned a follower (the actual video download after metadata retrieval)
    if (task.followedBy && task.followedBy.length > 0) {
      const meta = this.metadataStore.get(task.gid);
      if (meta) {
        for (const followerId of task.followedBy) {
          if (!this.metadataStore.has(followerId)) {
            this.metadataStore.set(followerId, meta);
          }
        }
      }
      return null;
    }

    // 2. If this task was followed by a metadata task, inherit its metadata
    if (task.following && !this.metadataStore.has(task.gid)) {
      const parentMeta = this.metadataStore.get(task.following);
      if (parentMeta) {
        this.metadataStore.set(task.gid, parentMeta);
      }
    }

    // 3. Check file list for [METADATA] files
    if (task.files && task.files.length > 0) {
      const isMetaOnly = task.files.every((f: any) => !f.path || f.path.includes('[METADATA]') || f.path.endsWith('.torrent'));
      if (isMetaOnly && (task.status === 'complete' || parseInt(task.totalLength || '0', 10) < 500000)) {
        return null;
      }
    }

    const meta = this.metadataStore.get(task.gid) || { title: '', showTitle: '' };
    const totalLength = parseInt(task.totalLength || '0', 10);
    const completedLength = parseInt(task.completedLength || '0', 10);
    const downloadSpeed = parseInt(task.downloadSpeed || '0', 10);
    const uploadSpeed = parseInt(task.uploadSpeed || '0', 10);
    const numSeeders = parseInt(task.numSeeders || task.connections || '0', 10);

    const progress = totalLength > 0 ? Math.min(100, Math.round((completedLength / totalLength) * 1000) / 10) : 0;
    const remaining = totalLength - completedLength;
    const eta = (downloadSpeed > 0 && remaining > 0) ? Math.round(remaining / downloadSpeed) : -1;

    let title = meta.title;
    let filePath = '';

    // Inspect files list from aria2
    if (task.files && task.files.length > 0) {
      const mainFile = task.files[0];
      if (mainFile.path && !mainFile.path.includes('[METADATA]')) {
        filePath = mainFile.path;
        if (!title || title === 'Anime Episode') {
          title = path.basename(mainFile.path);
        }
      }
    }

    if (!title) {
      title = (task.bittorrent && task.bittorrent.info && task.bittorrent.info.name) || `Download ${task.gid.slice(0, 8)}`;
    }

    let status: 'waiting' | 'active' | 'paused' | 'complete' | 'error' = 'waiting';
    if (task.status === 'active') status = 'active';
    else if (task.status === 'paused') status = 'paused';
    else if (task.status === 'complete') status = 'complete';
    else if (task.status === 'error') status = 'error';

    return {
      id: task.gid,
      title,
      showTitle: meta.showTitle || '',
      episode: meta.episode || '',
      resolution: meta.resolution || '',
      status,
      progress,
      downloadSpeed,
      uploadSpeed,
      totalLength,
      completedLength,
      numSeeders,
      eta,
      filePath,
      errorMessage: task.errorMessage || ''
    };
  }

  async getDownloads(): Promise<DownloadItemModel[]> {
    try {
      const [active, waiting, stopped] = await Promise.all([
        this._sendRpc('tellActive').catch(() => []),
        this._sendRpc('tellWaiting', [0, 50]).catch(() => []),
        this._sendRpc('tellStopped', [0, 50]).catch(() => [])
      ]);

      const allTasks = [...(active || []), ...(waiting || []), ...(stopped || [])];
      return allTasks.map(t => this._formatTask(t)).filter((t): t is DownloadItemModel => Boolean(t));
    } catch (err) {
      console.error('[aria2-adapter] getDownloads error:', err);
      return [];
    }
  }

  async pause(id: string): Promise<boolean> {
    try {
      await this._sendRpc('pause', [id]);
      return true;
    } catch (err: any) {
      console.warn(`[aria2-adapter] pause failed for ${id}:`, err.message);
      return false;
    }
  }

  async resume(id: string): Promise<boolean> {
    try {
      await this._sendRpc('unpause', [id]);
      return true;
    } catch (err: any) {
      console.warn(`[aria2-adapter] resume failed for ${id}:`, err.message);
      return false;
    }
  }

  async cancel(id: string): Promise<boolean> {
    try {
      let task: any = null;
      try {
        task = await this._sendRpc('tellStatus', [id]);
      } catch {}

      try {
        await this._sendRpc('forceRemove', [id]);
      } catch {}

      try {
        await this._sendRpc('removeDownloadResult', [id]);
      } catch {}

      this.metadataStore.delete(id);

      // Clean up incomplete files on disk
      if (task && task.status !== 'complete' && task.files) {
        for (const file of task.files) {
          if (file.path && !file.path.includes('[METADATA]')) {
            try {
              if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            } catch {}
            try {
              if (fs.existsSync(file.path + '.aria2')) fs.unlinkSync(file.path + '.aria2');
            } catch {}
          }
        }
      }

      return true;
    } catch (err: any) {
      console.warn(`[aria2-adapter] cancel failed for ${id}:`, err.message);
      return false;
    }
  }
}
