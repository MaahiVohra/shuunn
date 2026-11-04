import React, { useState } from 'react';
import { Play, FolderOpen, Film, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { LibraryFile } from '../types/library';

interface LibraryItemProps {
  item: LibraryFile;
  onPlay: (path: string) => void;
  onReveal: (path: string) => void;
  onDelete: (path: string) => void;
}

export function LibraryItem({ item, onPlay, onReveal, onDelete }: LibraryItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { filePath, fileName, sizeFormatted, modifiedAt } = item;

  let formattedDate = '';
  try {
    const d = new Date(modifiedAt);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  } catch {
    // fallback
  }

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(filePath);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-[var(--radius-panel)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors gap-3 group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--surface-hover)] flex items-center justify-center text-[var(--accent)] shrink-0">
          <Film className="w-4 h-4" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <h4
            className="text-xs font-semibold text-[var(--text)] truncate"
            title={fileName}
          >
            {fileName}
          </h4>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">
            <span className="text-[var(--text)] font-medium">{sizeFormatted}</span>
            {formattedDate && <span>• {formattedDate}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="quiet"
          size="sm"
          onClick={() => onPlay(filePath)}
          className="text-xs"
        >
          <Play className="w-3 h-3 mr-1 fill-current text-[var(--accent)]" strokeWidth={1.75} />
          Play
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="quiet"
              size="icon-sm"
              onClick={() => onReveal(filePath)}
              aria-label="Open in file explorer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open folder</TooltipContent>
        </Tooltip>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              className="h-7 px-2 text-[11px]"
            >
              Recycle?
            </Button>
            <Button
              variant="quiet"
              size="icon-sm"
              onClick={() => setConfirmDelete(false)}
              aria-label="Cancel deletion"
            >
              <X className="w-3 h-3" strokeWidth={1.75} />
            </Button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="quiet"
                size="icon-sm"
                onClick={handleDelete}
                aria-label="Delete file"
                className="opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to Recycle Bin</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
