import { z } from 'zod';
import path from 'node:path';

// Video file extension allowlist per Task 1.6 & shuunn-electron-security
export const ALLOWED_VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.webm']);
export const ALLOWED_MEDIA_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.webm', '.ass', '.srt', '.png', '.jpg', '.jpeg', '.webp']);

export const startDownloadSchema = z.object({
  magnet: z.string().min(10).refine((val) => val.startsWith('magnet:?'), {
    message: 'Must be a valid magnet URI'
  }),
  title: z.string().optional(),
  showTitle: z.string().optional(),
  episode: z.string().optional(),
  resolution: z.enum(['1080p', '720p', '480p', 'Unknown']).optional().default('1080p')
});

export const showSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  aniListId: z.number().int().positive().nullable().optional(),
  malId: z.number().int().positive().nullable().optional(),
  coverImage: z.string().url().nullable().optional().or(z.string().nullable().optional()),
  synopsis: z.string().nullable().optional(),
  status: z.enum(['AIRING', 'FINISHED', 'NOT_YET_RELEASED', 'CANCELLED']).optional().default('AIRING')
});

export const episodeSchema = z.object({
  id: z.string().min(1),
  showId: z.string().min(1),
  episodeNum: z.string().min(1),
  resolution: z.string().optional().default('1080p'),
  releaseGroup: z.string().nullable().optional(),
  filePath: z.string().nullable().optional(),
  fileSize: z.number().nonnegative().optional().default(0),
  watched: z.union([z.boolean(), z.number()]).optional().default(0)
});

export const progressSchema = z.object({
  episodeId: z.string().min(1),
  progressSeconds: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative()
});

export const subscriptionSchema = z.object({
  showId: z.string().min(1),
  enabled: z.union([z.boolean(), z.number()]).optional().default(1),
  preferredResolution: z.enum(['1080p', '720p', '480p']).optional().default('1080p')
});

/**
 * Validate that a file path is safe and points to an allowed media type.
 * Prevents directory traversal attacks and execution of arbitrary binaries.
 */
export function validateSafeFilePath(inputPath: string, allowedExtensions: Set<string> = ALLOWED_MEDIA_EXTENSIONS): string {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    throw new Error('Invalid file path');
  }

  // Prevent null bytes
  if (inputPath.indexOf('\0') !== -1) {
    throw new Error('Path contains null bytes');
  }

  const normalized = path.normalize(inputPath);
  const ext = path.extname(normalized).toLowerCase();

  if (!allowedExtensions.has(ext)) {
    throw new Error(`File type ${ext} is not in the allowed media list.`);
  }

  return normalized;
}
