'use client';

/**
 * /dev/data — Slice S1 Development data inspection page.
 * Displays data tables, patient counts, and hero patient record details.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppFrame } from '@/components/primitives/AppFrame';
import { NotchHeader } from '@/components/primitives/NotchHeader';
import { ModuleCard } from '@/components/cards/ModuleCard';
import { fetchPatientsAction, fetchClinicStatsAction } from '@/data/actions';
import type { Patient, ClinicStats } from '@/data/types';

export default function DevDataPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<ClinicStats | null>(null);

  useEffect(() => {
    Promise.all([fetchPatientsAction(), fetchClinicStatsAction()]).then(([pts, st]) => {
      setPatients(pts);
      setStats(st);
    });
  }, []);

  return (
    <AppFrame>
      <NotchHeader
        title="Development Data Inspector (/dev/data)"
        controls={
          <Link
            href="/clinic"
            className="px-3 py-1.5 rounded-full bg-[var(--color-ink)] text-[var(--color-white)] text-xs font-bold"
          >
            Go to Clinic
          </Link>
        }
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ModuleCard title="Total Patients">
            <span className="text-2xl font-bold text-[var(--color-ink)]">{stats?.totalPatients ?? 0}</span>
          </ModuleCard>
          <ModuleCard title="Completed Today">
            <span className="text-2xl font-bold text-[var(--color-ink)]">{stats?.completedToday ?? 0}</span>
          </ModuleCard>
          <ModuleCard title="Wait Times">
            <span className="text-2xl font-bold text-[var(--color-ink)]">{stats?.waitTimes ?? '0 min'}</span>
          </ModuleCard>
          <ModuleCard title="New Admits">
            <span className="text-2xl font-bold text-[var(--color-ink)]">{stats?.newAdmits ?? 0}</span>
          </ModuleCard>
        </div>

        <ModuleCard title="Patients Table (S1 Demo Dataset)">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-ink-soft)]/20 text-[var(--color-ink-muted)]">
                  <th className="py-2 px-3 font-semibold">MRN</th>
                  <th className="py-2 px-3 font-semibold">Name</th>
                  <th className="py-2 px-3 font-semibold">Sex / Age</th>
                  <th className="py-2 px-3 font-semibold">Phone</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                  <th className="py-2 px-3 font-semibold">Primary Concern</th>
                  <th className="py-2 px-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-ink-soft)]/10 hover:bg-[var(--color-surface)]/50">
                    <td className="py-2 px-3 font-mono font-bold">{p.mrn}</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-ink)]">{p.name}</td>
                    <td className="py-2 px-3">{p.sex} · {p.age}y</td>
                    <td className="py-2 px-3">{p.phone}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[10px] font-semibold">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[var(--color-ink-muted)] truncate max-w-xs">{p.primaryConcern}</td>
                    <td className="py-2 px-3">
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
