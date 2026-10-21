/**
 * offlineSync.ts — Phase L6: Offline & Sync State Machine
 * Specification: docs/PACK.md §11 (Phase L6), §572.
 *
 * Invariant: Never claim "saved" while local.
 * State machine:
 * local_draft -> queued -> syncing -> synced / failed / conflict
 */

export type SyncState =
  | 'local_draft'
  | 'queued'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'conflict';

export type EntityType =
  | 'care_event'
  | 'vital'
  | 'medication'
  | 'visit'
  | 'lab'
  | 'allergy'
  | 'patient';

export interface SyncQueueItem {
  id: string;
  entityType: EntityType;
  entityId: string;
  payload: Record<string, unknown>;
  state: SyncState;
  createdAt: string;
  lastAttemptAt?: string;
  retryCount: number;
  errorMessage?: string;
  clientVersion: number;
  serverVersion?: number;
}

export interface SyncSummary {
  isOnline: boolean;
  totalPending: number;
  syncingCount: number;
  failedCount: number;
  conflictCount: number;
  statusLabelEn: string;
  statusLabelAr: string;
}

class OfflineSyncEngine {
  private queue: SyncQueueItem[] = [];
  private isOnline: boolean = true;
  private listeners: Array<() => void> = [];

  constructor() {
    // Default seeded offline draft and sync items for testing
    this.queue = [
      {
        id: 'sync-item-1',
        entityType: 'vital',
        entityId: 'vit-offline-1',
        payload: { metric: 'pressure', value: '122/80', patientId: 'p-tiffany' },
        state: 'synced',
        createdAt: '2026-10-20T10:00:00Z',
        retryCount: 0,
        clientVersion: 1,
        serverVersion: 1,
      },
    ];
  }

  public setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    this.notify();
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  public getPendingItems(): SyncQueueItem[] {
    return this.queue.filter((i) => i.state !== 'synced');
  }

  /**
   * Enqueue a new mutation as local draft / queued.
   * Invariant: Marked 'local_draft' or 'queued', never claimed as 'synced'.
   */
  public enqueue(
    entityType: EntityType,
    entityId: string,
    payload: Record<string, unknown>,
    clientVersion = 1,
    startAsLocalDraft = false
  ): SyncQueueItem {
    const item: SyncQueueItem = {
      id: `sync-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entityType,
      entityId,
      payload,
      state: startAsLocalDraft ? 'local_draft' : 'queued',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      clientVersion,
    };

    this.queue.push(item);
    this.notify();
    return item;
  }

  /**
   * Promote local draft to queued
   */
  public markQueued(id: string): void {
    const item = this.queue.find((i) => i.id === id);
    if (item && item.state === 'local_draft') {
      item.state = 'queued';
      this.notify();
    }
  }

  /**
   * Execute batch sync against server.
   * Simulates network attempt and conflict detection.
   */
  public async processQueue(simulatedServerVersionMap?: Record<string, number>): Promise<{
    processed: number;
    synced: number;
    conflicted: number;
    failed: number;
  }> {
    if (!this.isOnline) {
      return { processed: 0, synced: 0, conflicted: 0, failed: 0 };
    }

    const eligible = this.queue.filter((i) => i.state === 'queued' || i.state === 'failed');
    let synced = 0;
    let conflicted = 0;
    let failed = 0;

    for (const item of eligible) {
      item.state = 'syncing';
      item.lastAttemptAt = new Date().toISOString();
      this.notify();

      // Check conflict if simulated server version is ahead
      const remoteVersion = simulatedServerVersionMap?.[item.entityId];
      if (remoteVersion !== undefined && remoteVersion > item.clientVersion) {
        item.state = 'conflict';
        item.serverVersion = remoteVersion;
        item.errorMessage = `Conflict detected: Local version ${item.clientVersion} is superseded by Server version ${remoteVersion}.`;
        conflicted++;
      } else {
        item.state = 'synced';
        item.serverVersion = item.clientVersion;
        item.errorMessage = undefined;
        synced++;
      }
    }

    this.notify();
    return {
      processed: eligible.length,
      synced,
      conflicted,
      failed,
    };
  }

  /**
   * Resolve conflict: choose 'local', 'server', or 'merge'
   */
  public resolveConflict(
    itemId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedPayload?: Record<string, unknown>
  ): SyncQueueItem {
    const item = this.queue.find((i) => i.id === itemId);
    if (!item) {
      throw new Error(`Sync item not found: ${itemId}`);
    }

    if (item.state !== 'conflict') {
      throw new Error(`Item ${itemId} is not in conflict state.`);
    }

    if (resolution === 'local') {
      item.clientVersion = (item.serverVersion || 1) + 1;
      item.state = 'queued';
      item.errorMessage = undefined;
    } else if (resolution === 'server') {
      item.state = 'synced';
      item.errorMessage = undefined;
    } else {
      item.payload = { ...item.payload, ...mergedPayload };
      item.clientVersion = (item.serverVersion || 1) + 1;
      item.state = 'queued';
      item.errorMessage = undefined;
    }

    this.notify();
    return item;
  }

  /**
   * Summary of current sync state
   */
  public getSummary(): SyncSummary {
    const pending = this.getPendingItems();
    const syncingCount = this.queue.filter((i) => i.state === 'syncing').length;
    const failedCount = this.queue.filter((i) => i.state === 'failed').length;
    const conflictCount = this.queue.filter((i) => i.state === 'conflict').length;

    let statusLabelEn = 'All changes synced';
    let statusLabelAr = 'تمت مزامنة جميع البيانات';

    if (!this.isOnline) {
      statusLabelEn = pending.length > 0
        ? `${pending.length} changes pending sync (Offline)`
        : 'Offline mode (Connected locally)';
      statusLabelAr = pending.length > 0
        ? `${pending.length} تغييرات قيد المزامنة (وضع غير متصل)`
        : 'وضع غير متصل (يعمل محلياً)';
    } else if (conflictCount > 0) {
      statusLabelEn = `${conflictCount} sync conflict detected`;
      statusLabelAr = `يوجد ${conflictCount} تعارض في المزامنة`;
    } else if (syncingCount > 0) {
      statusLabelEn = 'Syncing changes with server...';
      statusLabelAr = 'جاري المزامنة مع الخادم...';
    } else if (pending.length > 0) {
      statusLabelEn = `${pending.length} changes queued for sync`;
      statusLabelAr = `${pending.length} تغييرات في انتظار المزامنة`;
    }

    return {
      isOnline: this.isOnline,
      totalPending: pending.length,
      syncingCount,
      failedCount,
      conflictCount,
      statusLabelEn,
      statusLabelAr,
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  public clearQueue(): void {
    this.queue = [];
    this.notify();
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();
