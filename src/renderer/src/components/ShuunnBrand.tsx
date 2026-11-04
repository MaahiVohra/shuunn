import React from 'react';
import brandMarkUrl from '../assets/shuunn-logo-mark.png';

export interface ShuunnLogoProps {
  variant?: 'icon' | 'compact' | 'full';
  className?: string;
  iconSize?: number;
}

/**
 * Official shuunn brand logo component
 * Renders the authentic transparent fox logomark alongside clean brand typography
 */
export function ShuunnLogo({ variant = 'compact', className = '', iconSize = 30 }: ShuunnLogoProps): React.JSX.Element {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src={brandMarkUrl}
        alt="shuunn"
        style={{ width: iconSize, height: iconSize }}
        className="object-contain shrink-0"
        draggable={false}
      />

      {variant !== 'icon' && (
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-bold text-[17px] tracking-tight text-[var(--text)] lowercase">
              shuunn
            </span>
          </div>

          {variant === 'full' && (
            <span className="text-[10px] text-[var(--text-muted)] font-normal tracking-tight mt-0.5 leading-none">
              Your media, in motion.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export interface SparkleStarProps {
  className?: string;
}

/**
 * Official shuunn brand sparkle accent
 */
export function SparkleStar({ className = 'w-3 h-3 text-[var(--peach)]' }: SparkleStarProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2 Q12 12, 22 12 Q12 12, 12 22 Q12 12, 12 2 Z" />
    </svg>
  );
}
