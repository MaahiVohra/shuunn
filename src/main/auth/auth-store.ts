import { safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { AuthAccountsState } from '../../renderer/src/types/auth';

interface EncryptedPayload {
  type: 'safeStorage' | 'encoded';
  cipher: string;
}

interface StoredAccount {
  username: string;
  connected: boolean;
  updatedAt: string;
  encryptedToken: EncryptedPayload | null;
  encryptedRefreshToken?: EncryptedPayload | null;
  expiresAt?: string | null;
}

interface AuthData {
  profile: {
    id: string;
    name: string;
    createdAt: string;
  };
  accounts: Record<string, StoredAccount>;
}

/**
 * Secure local credential store for external tracker accounts (AniList, MyAnimeList).
 * Uses Electron's safeStorage API (DPAPI on Windows, Keychain on macOS, Secret Service on Linux).
 * Never stores plain-text access tokens on disk.
 */
export class AuthStore {
  public appDataDir: string;
  public filePath: string;
  public data: AuthData;

  constructor(appDataDir: string) {
    this.appDataDir = appDataDir;
    this.filePath = path.join(this.appDataDir, 'auth.json');
    this.data = {
      profile: {
        id: 'local-default',
        name: 'Local User',
        createdAt: new Date().toISOString()
      },
      accounts: {}
    };
    this.load();
  }

  load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
      }
    } catch (err: any) {
      console.warn('[auth-store] Failed to read auth store, resetting to defaults:', err.message);
    }
  }

  save(): void {
    try {
      if (!fs.existsSync(this.appDataDir)) {
        fs.mkdirSync(this.appDataDir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('[auth-store] Failed to persist auth store:', err);
    }
  }

  private _encrypt(plainText: string): EncryptedPayload | null {
    if (!plainText) return null;
    try {
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(plainText);
        return {
          type: 'safeStorage',
          cipher: encrypted.toString('base64')
        };
      }
    } catch (err: any) {
      console.warn('[auth-store] safeStorage encryption failed, falling back to basic encoding:', err.message);
    }
    // Fallback if encryption is unavailable (e.g. headless dev container)
    return {
      type: 'encoded',
      cipher: Buffer.from(plainText, 'utf8').toString('base64')
    };
  }

  private _decrypt(encryptedObj: EncryptedPayload | null): string | null {
    if (!encryptedObj || !encryptedObj.cipher) return null;
    try {
      if (encryptedObj.type === 'safeStorage' && safeStorage && safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encryptedObj.cipher, 'base64');
        return safeStorage.decryptString(buffer);
      } else if (encryptedObj.type === 'encoded') {
        return Buffer.from(encryptedObj.cipher, 'base64').toString('utf8');
      }
    } catch (err) {
      console.error('[auth-store] Decryption failed:', err);
    }
    return null;
  }

  /**
   * Save tracker account credentials
   */
  setAccount(
    service: string,
    {
      username,
      token,
      refreshToken = null,
      expiresAt = null
    }: {
      username?: string;
      token: string;
      refreshToken?: string | null;
      expiresAt?: string | null;
    }
  ): void {
    if (!this.data.accounts) this.data.accounts = {};
    this.data.accounts[service] = {
      username: username || '',
      connected: true,
      updatedAt: new Date().toISOString(),
      encryptedToken: this._encrypt(token),
      encryptedRefreshToken: refreshToken ? this._encrypt(refreshToken) : null,
      expiresAt: expiresAt || null
    };
    this.save();
  }

  /**
   * Remove tracker account
   */
  removeAccount(service: string): void {
    if (this.data.accounts && this.data.accounts[service]) {
      delete this.data.accounts[service];
      this.save();
    }
  }

  /**
   * Safe summary of connected accounts for renderer (NEVER sends tokens to renderer)
   */
  getPublicAccounts(): AuthAccountsState {
    const summary: AuthAccountsState = {};
    if (!this.data.accounts) return summary;

    for (const [service, item] of Object.entries(this.data.accounts)) {
      summary[service] = {
        connected: Boolean(item.connected),
        username: item.username || '',
        updatedAt: item.updatedAt || null
      };
    }
    return summary;
  }

  /**
   * Internal helper for main-process sync service to read decrypted access token
   */
  getDecryptedToken(service: string): string | null {
    const account = this.data.accounts?.[service];
    if (!account || !account.encryptedToken) return null;
    return this._decrypt(account.encryptedToken);
  }
}
