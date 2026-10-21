'use client';

/**
 * SyncCenterModal.tsx — Phase L6: Offline & Cloud Sync Center
 * Specification: docs/PACK.md §11 (Phase L6), §572.
 *
 * Invariant: Never claim "saved" while local.
 * State machine:
 * local_draft -> queued -> syncing -> synced / failed / conflict
 */

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Wifi,
  WifiOff,
  GitMerge,
  Server,
  Smartphone,
} from 'lucide-react';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import {
  offlineSyncEngine,
  type SyncQueueItem,
  type SyncSummary,
} from '@/lib/offlineSync';
import { en } from '@/i18n/en';

interface SyncCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: typeof en.sync;
}

export function SyncCenterModal({
  isOpen,
  onClose,
  dict = en.sync,
}: SyncCenterModalProps) {
  const [summary, setSummary] = useState<SyncSummary>(offlineSyncEngine.getSummary());
  const [queue, setQueue] = useState<SyncQueueItem[]>(offlineSyncEngine.getQueue());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineSyncEngine.subscribe(() => {
      setSummary(offlineSyncEngine.getSummary());
      setQueue(offlineSyncEngine.getQueue());
    });
    return unsubscribe;
  }, []);

  const handleSyncNow = async () => {
    setIsProcessing(true);
    try {
      await offlineSyncEngine.processQueue();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleOnline = () => {
    offlineSyncEngine.setOnlineStatus(!summary.isOnline);
  };

  const handleResolveConflict = (itemId: string, resolution: 'local' | 'server' | 'merge') => {
    offlineSyncEngine.resolveConflict(itemId, resolution);
  };

  const renderStateBadge = (state: SyncQueueItem['state']) => {
    switch (state) {
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{dict.synced}</span>
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-300">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span>{dict.syncing}</span>
          </span>
        );
      case 'conflict':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>{dict.conflict}</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>{dict.failed}</span>
          </span>
        );
      case 'local_draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>{dict.localDraft}</span>
          </span>
        );
      case 'queued':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>{dict.queued}</span>
          </span>
        );
    }
  };

  return (
    <OverlaySheet
      isOpen={isOpen}
      onClose={onClose}
      title={dict.title}
    >
      <div className="flex flex-col gap-4 text-start font-['Inter',sans-serif]">
        {/* ========================================================================= */}
        {/* 1. STATUS BANNER & CONTROLS                                               */}
        {/* ========================================================================= */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-black/5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={clsx(
                'w-9 h-9 rounded-full flex items-center justify-center shadow-xs',
                summary.isOnline
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              )}
            >
              {summary.isOnline ? (
                <Wifi className="w-4 h-4 stroke-[2.2]" />
              ) : (
                <WifiOff className="w-4 h-4 stroke-[2.2]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-ink)]">
                  {summary.statusLabelEn}
                </span>
                <span className="text-[10px] font-mono text-[var(--color-ink-muted)] bg-black/5 px-2 py-0.5 rounded-full">
                  {summary.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-ink-muted)]">
                {dict.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleOnline}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-xs font-semibold text-[var(--color-ink)] shadow-2xs transition-all cursor-pointer"
              data-testid="toggle-offline-simulation"
            >
              {summary.isOnline ? dict.toggleOffline : dict.toggleOnline}
            </button>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isProcessing || !summary.isOnline || summary.totalPending === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-ink)] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
              data-testid="sync-now-button"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isProcessing && 'animate-spin')} />
              <span>{dict.syncNow}</span>
            </button>
          </div>
        </div>

        {/* Invariant Warning Banner (§572) */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>{dict.invariantNote}</p>
        </div>

        {/* ========================================================================= */}
        {/* 2. SYNC QUEUE ITEM LIST                                                   */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
          {queue.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[var(--color-surface-subtle)] border border-black/5 text-center flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 stroke-[1.8]" />
              <p className="text-xs text-[var(--color-ink-muted)] max-w-sm">
                {dict.queueEmpty}
              </p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-[var(--color-surface)] border border-black/5 shadow-2xs flex flex-col gap-2.5"
                data-testid={`sync-item-${item.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-stone-100 font-bold text-[var(--color-ink)]">
                      {item.entityType.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono font-medium text-[var(--color-ink-muted)]">
                      {item.entityId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {renderStateBadge(item.state)}
                    <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                      v{item.clientVersion}
                    </span>
                  </div>
                </div>

                {/* Payload snippet */}
                <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/80 font-mono text-[10.5px] text-[var(--color-ink)]">
                  {JSON.stringify(item.payload)}
                </div>

                {/* Conflict Resolution Block */}
                {item.state === 'conflict' && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{item.errorMessage || dict.conflictDetected}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleResolveConflict(item.id, 'local')}
                        className="px-2.5 py-1 rounded-full bg-white hover:bg-stone-50 border border-rose-300 text-xs font-semibold text-rose-900 shadow-2xs cursor-pointer"
                        data-testid={`resolve-local-${item.id}`}
                      >
                        {dict.keepLocal}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveConflict(item.id, 'server')}
                        className="px-2.5 py-1 rounded-full bg-white hover:bg-stone-50 border border-rose-300 text-xs font-semibold text-rose-900 shadow-2xs cursor-pointer"
                        data-testid={`resolve-server-${item.id}`}
                      >
                        {dict.acceptServer}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveConflict(item.id, 'merge')}
                        className="px-2.5 py-1 rounded-full bg-stone-900 hover:bg-black text-xs font-semibold text-white shadow-2xs cursor-pointer"
                        data-testid={`resolve-merge-${item.id}`}
                      >
                        {dict.merge}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </OverlaySheet>
  );
}
