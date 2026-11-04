import React, { useMemo } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface SpeedPoint {
  down: number;
  up: number;
}

interface SpeedChartProps {
  history?: SpeedPoint[];
  currentDown?: number;
  currentUp?: number;
  peakDown?: number;
  peakUp?: number;
  height?: number;
}

export function SpeedChart({
  history = [],
  currentDown = 0,
  currentUp = 0,
  peakDown = 0,
  peakUp = 0,
  height = 68
}: SpeedChartProps) {
  const width = 280;
  const paddingBottom = 4;
  const chartHeight = height - paddingBottom;

  // Compute maximum scale value (at least 512 KB/s to prevent zero-division or jitter on tiny transfers)
  const maxVal = useMemo(() => {
    let max = 512 * 1024; // 512 KB/s minimum ceiling
    for (const p of history) {
      if (p.down > max) max = p.down;
      if (p.up > max) max = p.up;
    }
    if (currentDown > max) max = currentDown;
    if (currentUp > max) max = currentUp;
    return max * 1.15; // 15% head room for smooth curves
  }, [history, currentDown, currentUp]);

  // Generate SVG path for download curve and filled area
  const { downPath, downAreaPath, upPath } = useMemo(() => {
    if (!history || history.length === 0) {
      return { downPath: '', downAreaPath: '', upPath: '' };
    }

    const n = history.length;
    const stepX = width / Math.max(1, n - 1);

    const downPoints: [number, number][] = history.map((pt, i) => {
      const x = i * stepX;
      const y = chartHeight - (Math.min(pt.down, maxVal) / maxVal) * chartHeight;
      return [x, y];
    });

    const upPoints: [number, number][] = history.map((pt, i) => {
      const x = i * stepX;
      const y = chartHeight - (Math.min(pt.up, maxVal) / maxVal) * chartHeight;
      return [x, y];
    });

    // Create SVG path strings
    const createPath = (pts: [number, number][]) =>
      pts.reduce((acc, [x, y], idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`, '');

    const dPath = createPath(downPoints);
    const uPath = createPath(upPoints);

    // Closed area for download fill
    const lastX = (n - 1) * stepX;
    const dAreaPath = `${dPath} L ${lastX.toFixed(1)},${chartHeight} L 0,${chartHeight} Z`;

    return { downPath: dPath, downAreaPath: dAreaPath, upPath: uPath };
  }, [history, maxVal, width, chartHeight]);

  return (
    <div className="space-y-2.5 select-none">
      {/* Current and Peak Rates */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-base font-bold font-mono text-[var(--text)] tabular-nums leading-tight">
            <ArrowDown className="w-4 h-4 text-[var(--accent)] shrink-0" strokeWidth={2} />
            <span>{currentDown > 0 ? `${formatBytes(currentDown)}/s` : 'Idle'}</span>
          </div>
          {currentUp > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] tabular-nums">
              <ArrowUp className="w-3 h-3 text-[var(--success)] shrink-0" strokeWidth={2} />
              <span>{formatBytes(currentUp)}/s</span>
            </div>
          )}
        </div>

        <div className="text-right text-[11px] font-mono tabular-nums text-[var(--text-muted)] space-y-0.5">
          <div className="opacity-80">
            Peak: <span className="text-[var(--text)] font-semibold">{formatBytes(peakDown)}/s</span>
          </div>
          <div className="opacity-60 text-[10px]">
            Scale: {formatBytes(maxVal)}/s
          </div>
        </div>
      </div>

      {/* Realtime Waveform SVG Graph */}
      <div className="relative rounded-[var(--radius-control)] bg-[var(--bg)] overflow-hidden p-1.5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-16 overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Subtle Horizontal Reference Gridlines */}
          <line
            x1="0"
            y1={chartHeight * 0.25}
            x2={width}
            y2={chartHeight * 0.25}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="2 3"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1={chartHeight * 0.5}
            x2={width}
            y2={chartHeight * 0.5}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="2 3"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1={chartHeight * 0.75}
            x2={width}
            y2={chartHeight * 0.75}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="2 3"
            strokeWidth="1"
          />

          {/* Download Area Fill */}
          {downAreaPath && (
            <path
              d={downAreaPath}
              fill="var(--accent)"
              fillOpacity="0.14"
            />
          )}

          {/* Upload Speed Line */}
          {upPath && (
            <path
              d={upPath}
              fill="none"
              stroke="var(--success)"
              strokeWidth="1.25"
              strokeDasharray="3 2"
              opacity="0.85"
            />
          )}

          {/* Download Speed Line */}
          {downPath && (
            <path
              d={downPath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* Timeline Axis Labels */}
        <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] opacity-60 px-0.5 pt-1 tabular-nums">
          <span>60s ago</span>
          <span>30s</span>
          <span>now</span>
        </div>
      </div>

      {/* Graph Legend */}
      <div className="flex items-center justify-between text-[10px] font-medium text-[var(--text-muted)] pt-0.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span>Download</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-0.5 bg-[var(--success)]" />
          <span>Upload</span>
        </div>
      </div>
    </div>
  );
}
