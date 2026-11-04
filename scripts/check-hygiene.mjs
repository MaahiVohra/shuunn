import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

// Denylist patterns: No hardcoded torrent sites, fansub group names, or magnet links in source
const FORBIDDEN_PATTERNS = [
  /magnet:\?xt=urn:btih:/i,
  /subsplease/i,
  /nyaa\.si/i,
  /erai-raws/i,
  /horriblesubs/i,
  /tokyotosho/i
];

let failed = false;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && /\.(js|jsx|mjs|ts|tsx|json|html|css)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            console.error(`✗ [hygiene violation] ${path.relative(rootDir, fullPath)}:${i + 1} matches forbidden pattern ${pattern}`);
            failed = true;
          }
        }
      }
    }
  }
}

console.log('[check-hygiene] Scanning src/ for hardcoded sources or release group names...');
scanDir(srcDir);

if (failed) {
  console.error('\n✗ Hygiene check failed. Please remove hardcoded sources or URLs before committing.');
  process.exit(1);
} else {
  console.log('✓ Clean repo hygiene verified. Zero hardcoded sources found.');
  process.exit(0);
}
