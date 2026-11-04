import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const binDir = path.join(projectRoot, 'bin');
const aria2Exe = path.join(binDir, 'aria2c.exe');

const ARIA2_ZIP_URL = 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip';

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const handleResponse = (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Handle redirect
        https.get(response.headers.location, handleResponse).on('error', reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download aria2 zip: HTTP status ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(resolve);
      });
      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => reject(err));
      });
    };

    https.get(url, { headers: { 'User-Agent': 'shuunn-setup' } }, handleResponse).on('error', reject);
  });
}

export async function ensureAria2Binary() {
  // 1. Check packaged production path inside resources/
  if (process.resourcesPath) {
    const packagedExe = path.join(process.resourcesPath, 'bin', 'aria2c.exe');
    if (fs.existsSync(packagedExe)) {
      return packagedExe;
    }
  }

  // 2. Development path
  if (fs.existsSync(aria2Exe)) {
    try {
      const stats = fs.statSync(aria2Exe);
      if (stats.size > 100000) {
        return aria2Exe;
      }
    } catch {
      // Ignore error and re-download
    }
  }

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  console.log('[setup-aria2] aria2c.exe not found or invalid. Downloading official Windows 64-bit release...');
  const tempZip = path.join(binDir, 'aria2-win64.zip');
  const tempExtract = path.join(binDir, 'temp-extract');

  try {
    await downloadFile(ARIA2_ZIP_URL, tempZip);
    console.log('[setup-aria2] Download complete. Extracting aria2c.exe...');

    if (fs.existsSync(tempExtract)) {
      fs.rmSync(tempExtract, { recursive: true, force: true });
    }
    fs.mkdirSync(tempExtract, { recursive: true });

    // Extract using Windows PowerShell Expand-Archive
    execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExtract}' -Force"`, {
      stdio: 'inherit'
    });

    // Locate aria2c.exe inside extracted subfolder
    const files = fs.readdirSync(tempExtract);
    const subfolder = files.find(f => f.startsWith('aria2-') && fs.statSync(path.join(tempExtract, f)).isDirectory());
    const extractedExe = subfolder
      ? path.join(tempExtract, subfolder, 'aria2c.exe')
      : path.join(tempExtract, 'aria2c.exe');

    if (!fs.existsSync(extractedExe)) {
      throw new Error(`aria2c.exe was not found inside extracted archive at ${extractedExe}`);
    }

    fs.copyFileSync(extractedExe, aria2Exe);
    console.log(`[setup-aria2] Successfully installed aria2c.exe to: ${aria2Exe}`);

    // Cleanup temp files
    try {
      fs.rmSync(tempZip, { force: true });
      fs.rmSync(tempExtract, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn('[setup-aria2] Warning: cleanup of temporary archive files had non-fatal error:', cleanupErr.message);
    }

    return aria2Exe;
  } catch (err) {
    console.error('[setup-aria2] Error during aria2 setup:', err);
    throw err;
  }
}

// If executed directly as CLI script
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  ensureAria2Binary()
    .then(exePath => {
      console.log(`[setup-aria2] Ready! Binary located at: ${exePath}`);
      process.exit(0);
    })
    .catch(err => {
      console.error('[setup-aria2] Failed to setup aria2:', err);
      process.exit(1);
    });
}
