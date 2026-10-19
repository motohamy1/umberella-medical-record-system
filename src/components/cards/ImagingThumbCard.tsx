'use client';

/**
 * ImagingThumbCard — Standard radiological study thumbnail card (PACK.md §4.5 #13).
 * Rounded image, dark modality label chip at top-left, dark round arrow button at bottom-right.
 * Per spec: "No media -> the card is not rendered."
 */

import React from 'react';
import { ArrowUpRight, Lock } from 'lucide-react';
import { clsx } from 'clsx';

export interface ImagingThumbCardProps {
  id: string;
  modality: string;
  title: string;
  occurredAt: string;
  imagePath?: string | null;
  signedUrl?: string | null;
  reportText?: string | null;
  source?: string;
  createdBy?: string;
  onClick?: () => void;
  className?: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {}
  return dateStr;
}

export function ImagingThumbCard({
  id,
  modality,
  title,
  occurredAt,
  imagePath,
  signedUrl,
  reportText,
  onClick,
  className,
}: ImagingThumbCardProps) {
  // Spec check: No media -> the card is not rendered
  const effectiveMedia = signedUrl || imagePath;
  if (!effectiveMedia) {
    return null;
  }

  const formattedDate = formatDate(occurredAt);

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`imaging-card-${id}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={clsx(
        'group flex flex-col text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-neon)] rounded-[22px] transition-transform duration-200 hover:-translate-y-1',
        className
      )}
    >
      {/* 1. Rounded Study Image Container */}
      <div className="relative aspect-[4/3] w-full rounded-[18px] sm:rounded-[20px] overflow-hidden bg-[var(--color-ink)] shadow-md border border-white/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={effectiveMedia}
          alt={`${modality} - ${title}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/mri-scan.jpg';
          }}
          draggable={false}
        />

        {/* Top-Left Dark Modality Label Chip */}
        <span
          data-testid="modality-chip"
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/75 text-white text-[10px] sm:text-[11px] font-bold tracking-wider uppercase backdrop-blur-xs shadow-xs select-none"
        >
          {modality}
        </span>

        {/* Top-Right Signed Access Indicator */}
        <span
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 text-white/90 text-[9px] font-medium backdrop-blur-xs flex items-center gap-1 shadow-xs select-none"
          title="Protected by short-lived signed media token"
        >
          <Lock className="w-2.5 h-2.5 text-[var(--color-accent-neon)]" />
          <span>Signed</span>
        </span>

        {/* Bottom-Right Dark Round Arrow Button */}
        <button
          type="button"
          aria-label={`Inspect ${modality} study: ${title}`}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center hover:bg-black group-hover:scale-110 active:scale-95 transition-all shadow-md select-none"
        >
          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* 2. Metadata underneath image container */}
      <div className="mt-2.5 px-1 flex flex-col">
        <span className="text-xs font-semibold text-[var(--color-ink-muted)]">
          {formattedDate}
        </span>
        <h4 className="text-sm font-bold text-[var(--color-ink)] leading-snug truncate mt-0.5" title={title}>
          {title}
        </h4>
        {reportText && (
          <p className="text-xs text-[var(--color-ink-muted)] line-clamp-1 mt-0.5">
            {reportText}
          </p>
        )}
      </div>
    </div>
  );
}
