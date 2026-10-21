'use client';

/**
 * SyncStatusBadge.tsx — Phase L6: Real-Time Sync Status Pill
 * Specification: docs/PACK.md §11 (Phase L6), §572.
 *
 * Invariant: Never claim "saved" while local.
 * Always renders pending indicator if queue has uncommitted items.
 */

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  offlineSyncEngine,
  type SyncSummary,
} from '@/lib/offlineSync';
import { SyncCenterModal } from './SyncCenterModal';
import { en } from '@/i18n/en';

interface SyncStatusBadgeProps {
  className?: string;
  showText?: boolean;
}

export function SyncStatusBadge({
  className,
  showText = true,
}: SyncStatusBadgeProps) {
  const [summary, setSummary] = useState<SyncSummary>(offlineSyncEngine.getSummary());
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineSyncEngine.subscribe(() => {
      setSummary(offlineSyncEngine.getSummary());
    });
    return unsubscribe;
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-2xs cursor-pointer select-none border',
          !summary.isOnline || summary.totalPending > 0
            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            : summary.conflictCount > 0
            ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
            : summary.syncingCount > 0
            ? 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
            : 'bg-white text-[var(--color-ink)] border-black/10 hover:bg-stone-50',
          className
        )}
        data-testid="sync-status-badge"
        title="Offline & Sync Center"
      >
        <span
          className={clsx(
            'w-2 h-2 rounded-full',
            !summary.isOnline || summary.totalPending > 0
              ? 'bg-amber-500 animate-pulse'
              : summary.conflictCount > 0
              ? 'bg-rose-500 animate-pulse'
              : summary.syncingCount > 0
              ? 'bg-blue-500 animate-ping'
              : 'bg-emerald-500'
          )}
        />
        {showText && (
          <span className="text-[11px] truncate max-w-[160px] sm:max-w-[200px]">
            {summary.statusLabelEn}
          </span>
        )}
      </button>

      <SyncCenterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
