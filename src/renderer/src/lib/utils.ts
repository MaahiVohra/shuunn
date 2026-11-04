import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes showTitle, episode number, and resolution into a deterministic canonical lookup key.
 * Handles differences in casing, punctuation, and leading zeroes (e.g., '05' vs '5').
 */
export function makeReleaseKey(showTitle?: string, episode?: string | number, resolution?: string): string {
  const normTitle = (showTitle || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normEp = String(episode || '').replace(/^0+/, '') || '0';
  const normRes = (resolution || '').trim().toLowerCase();
  return `${normTitle}_${normEp}_${normRes}`;
}

export interface ParsedReleaseInfo {
  episode: string | null;
  resolution: string | null;
}

/**
 * Extracts episode number and resolution from a file name or torrent title
 * Example: "[ReleaseGroup] Show Title - 05 (1080p) [CRC32].mkv" -> { episode: "5", resolution: "1080p" }
 */
export function parseReleaseInfo(titleOrPath?: string): ParsedReleaseInfo {
  if (!titleOrPath) return { episode: null, resolution: null };
  const str = String(titleOrPath);

  // Resolution: 1080p, 720p, 480p, etc.
  const resMatch = str.match(/(1080p|720p|480p|2160p|4k)/i);
  const resolution = resMatch ? resMatch[1].toLowerCase() : null;

  // Episode: " - 05 ", " - 05 (", " EP05", " E05"
  const epMatch = str.match(/(?:-\s*|ep(?:isode)?\.?\s*|e)(\d+(?:\.\d+)?)/i);
  const episode = epMatch ? epMatch[1].replace(/^0+/, '') || '0' : null;

  return { episode, resolution };
}
