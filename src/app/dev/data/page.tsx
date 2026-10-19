'use client';

/**
 * /dev/data — Slice S1 Development Data Inspector.
 * Governed by PACK.md §8.1 & §11 (S1).
 * Displays row counts per table, hero patient trajectory, action buttons
 * ("Add 30 days of vitals", "Add a random visit"), and direct links to each patient workspace.
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppFrame } from '@/components/primitives/AppFrame';
import { NotchHeader } from '@/components/primitives/NotchHeader';
import { ModuleCard } from '@/components/cards/ModuleCard';
import {
  fetchPatientsAction,
  fetchDevSummaryAction,
  add30DaysVitalsAction,
  addRandomVisitAction,
} from '@/data/actions';
import type { Patient } from '@/data/types';
import { Plus, RefreshCw, Activity, Calendar } from 'lucide-react';

export default function DevDataPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [pts, sum] = await Promise.all([
      fetchPatientsAction(),
      fetchDevSummaryAction(),
    ]);
    setPatients(pts);
    setSummary(sum);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddVitals = async () => {
    setIsUpdating(true);
    try {
      const res = await add30DaysVitalsAction('p-001');
      setFeedback(`Added ${res.added} vitals to Mostafa Ibrahim.`);
      await loadData();
    } catch {
      setFeedback('Failed to add vitals.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddVisit = async () => {
    setIsUpdating(true);
    try {
      await addRandomVisitAction('p-001');
      setFeedback('Added a new visit to Mostafa Ibrahim.');
      await loadData();
    } catch {
      setFeedback('Failed to add visit.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AppFrame>
      <NotchHeader
        title="Development Data Inspector (/dev/data)"
        controls={
          <div className="flex items-center gap-2">
            <Link
              href="/clinic"
              className="px-3 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-white)] text-xs font-bold shadow-xs hover:opacity-90 transition-all"
            >
              Go to Clinic
            </Link>
          </div>
        }
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto font-['Inter',sans-serif]">
        {/* Feedback pill */}
        {feedback && (
          <div className="p-3 rounded-xl bg-[var(--color-accent)] text-[var(--color-ink)] text-xs font-semibold flex items-center justify-between">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="font-bold underline text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. ROW COUNTS PER TABLE (§8.1) */}
        <div>
          <h2 className="text-sm font-bold text-[var(--color-ink)] mb-3">
            Table Row Counts (S1 Core Schema)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {summary?.tableCounts &&
              Object.entries(summary.tableCounts).map(([tbl, count]) => (
                <div
                  key={tbl}
                  className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/20 text-center"
                >
                  <span className="block text-[11px] font-semibold text-[var(--color-ink-muted)] capitalize">
                    {tbl}
                  </span>
                  <span className="text-xl font-bold text-[var(--color-ink)]">
                    {String(count)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* 2. HERO PATIENT TRAJECTORY (§8.5) & ACTIONS */}
        <ModuleCard title="Hero Patient: Mostafa Ibrahim (54, M) — S1 Clinical Trajectory">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--color-surface)]/70">
              <div>
                <span className="text-xs font-bold text-[var(--color-ink)]">
                  MRN: MRN-2026-0814 · Status: Follow-up
                </span>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                  18-month trajectory: {summary?.heroVisitsCount ?? 0} visits · {summary?.heroVitalsCount ?? 0} vitals · {summary?.heroEventsCount ?? 0} care events in index
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddVitals}
                  disabled={isUpdating}
                  className="px-3 py-1.5 rounded-full bg-[var(--color-white)] text-[var(--color-ink)] border border-[var(--color-ink-soft)]/40 text-xs font-semibold hover:bg-[var(--color-surface)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Activity className="w-3.5 h-3.5 text-[var(--color-ink)]" />
                  +30 Days Vitals
                </button>
                <button
                  type="button"
                  onClick={handleAddVisit}
                  disabled={isUpdating}
                  className="px-3 py-1.5 rounded-full bg-[var(--color-white)] text-[var(--color-ink)] border border-[var(--color-ink-soft)]/40 text-xs font-semibold hover:bg-[var(--color-surface)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Calendar className="w-3.5 h-3.5 text-[var(--color-ink)]" />
                  +Random Visit
                </button>
                <Link
                  href="/clinic/patients/p-001"
                  className="px-3.5 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold hover:bg-black transition-colors"
                >
                  Open Hero Workspace →
                </Link>
              </div>
            </div>
          </div>
        </ModuleCard>

        {/* 3. PATIENTS DIRECTORY TABLE (§8.3 — 8 SYNTHETIC PATIENTS) */}
        <ModuleCard title="Synthetic Patients Directory (8 Canonical Patients)">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-ink-soft)]/20 text-[var(--color-ink-muted)]">
                  <th className="py-2.5 px-3 font-semibold">MRN</th>
                  <th className="py-2.5 px-3 font-semibold">Name</th>
                  <th className="py-2.5 px-3 font-semibold">Demographics</th>
                  <th className="py-2.5 px-3 font-semibold">Phone</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Primary Clinical Concern</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[var(--color-ink-soft)]/10 hover:bg-[var(--color-surface)]/50"
                  >
                    <td className="py-2 px-3 font-mono font-bold text-[var(--color-ink)]">
                      {p.mrn}
                    </td>
                    <td className="py-2 px-3 font-bold text-[var(--color-ink)]">
                      {p.name}
                      {p.id === 'p-001' && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--color-accent)] text-[var(--color-ink)]">
                          HERO
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {p.sex} · {p.age}y
                    </td>
                    <td className="py-2 px-3">{p.phone}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[10px] font-semibold">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[var(--color-ink-muted)] truncate max-w-xs">
                      {p.primaryConcern}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Link
                        href={`/clinic/patients/${p.id}`}
                        className="text-[var(--color-ink)] font-bold hover:underline"
                      >
                        Workspace →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModuleCard>
      </main>
    </AppFrame>
  );
}
