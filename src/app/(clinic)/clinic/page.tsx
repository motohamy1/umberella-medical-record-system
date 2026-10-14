'use client';

/**
 * Provider Home — S2 Slice (§6.2).
 * Displays today's schedule, patient folders grid with search/filtering,
 * needs-attention list, today's stats, and interactive Add Patient modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppFrame } from '@/components/primitives/AppFrame';
import { NotchHeader } from '@/components/primitives/NotchHeader';
import { CircleButton } from '@/components/primitives/CircleButton';
import { ModuleCard } from '@/components/cards/ModuleCard';
import { EmptyState } from '@/components/state/EmptyState';
import { PatientFolderCard } from '@/components/cards/PatientFolderCard';
import { AddPatientSheet } from '@/components/forms/AddPatientSheet';
import { getDictionary, type Locale } from '@/i18n';
import { Bell, LogOut, Search, Plus, Calendar, AlertTriangle } from 'lucide-react';
import { fetchPatientsAction, fetchClinicStatsAction, fetchClinicAppointmentsAction } from '@/data/actions';
import type { Patient, ClinicStats, Appointment } from '@/data/types';

export default function ClinicHomePage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('en');
  const dict = getDictionary(locale);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<ClinicStats>({
    totalPatients: 0,
    completedToday: 0,
    waitTimes: '0 min',
    newAdmits: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'today' | 'needsAttention' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pts, apts, st] = await Promise.all([
        fetchPatientsAction(activeFilter, searchQuery),
        fetchClinicAppointmentsAction(),
        fetchClinicStatsAction(),
      ]);
      setPatients(pts);
      setAppointments(apts);
      setStats(st);
    } catch (err) {
      console.error('Failed to load clinic data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleLocale = () => {
    setLocale((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const handleSignOut = () => {
    router.push('/login');
  };

  const handlePatientCreated = (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev]);
    setStats((prev) => ({
      ...prev,
      totalPatients: prev.totalPatients + 1,
      newAdmits: prev.newAdmits + 1,
    }));
  };

  const needsAttentionPatients = patients.filter(
    (p) => p.status === 'Needs review' || p.status === 'Critical'
  );

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <AppFrame>
        <NotchHeader
          title={dict.screens.patients}
          controls={
            <div className="flex items-center gap-2">
              {/* Search pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-white)] text-[var(--color-ink)] text-xs shadow-xs border border-[var(--color-ink-soft)]/20">
                <Search className="w-3.5 h-3.5 text-[var(--color-ink-muted)] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={dict.common.searchPlaceholder}
                  className="bg-transparent border-none outline-none text-xs w-28 sm:w-44 text-[var(--color-ink)]"
                />
              </div>

              {/* Add patient primary button */}
              <button
                type="button"
                onClick={() => setIsAddPatientOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-white)] font-bold text-xs shadow-xs hover:opacity-90 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{dict.common.add}</span>
              </button>

              <CircleButton
                size="sm"
                icon={<Bell className="w-3.5 h-3.5" />}
                label="Notifications"
              />

              <button
                type="button"
                onClick={toggleLocale}
                className="px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-ink)] text-xs font-semibold hover:bg-[var(--color-white)] transition-colors border border-[var(--color-ink-soft)]/20"
              >
                {locale === 'en' ? 'العربية' : 'EN'}
              </button>

              <CircleButton
                size="sm"
                icon={<LogOut className="w-3.5 h-3.5" />}
                label="Sign out"
                onClick={handleSignOut}
              />
            </div>
          }
        />

        <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 overflow-y-auto">
          {/* Left Column (3 cols): Today's schedule */}
          <div className="md:col-span-3 space-y-4">
            <ModuleCard title={dict.screens.schedule} className="min-h-[400px]">
              {appointments.length === 0 ? (
                <EmptyState
                  title={dict.states.noAppointments}
                  description="No appointments scheduled for today"
                />
              ) : (
                <div className="space-y-2.5 mt-2">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/20 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-ink-muted)]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {apt.scheduledTime}
                        </span>
                        <span className="capitalize text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-white)]">
                          {apt.status}
                        </span>
                      </div>
                      <span className="font-bold text-xs text-[var(--color-ink)]">
                        {apt.patientName}
                      </span>
                      <span className="text-[11px] text-[var(--color-ink-muted)]">
                        {apt.visitType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ModuleCard>
          </div>

          {/* Center Column (6 cols): Patients Folders Grid */}
          <div className="md:col-span-6 space-y-4">
            <ModuleCard
              title={dict.screens.patients}
              className="min-h-[600px]"
              badge={
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface)] font-mono text-[var(--color-ink-muted)]">
                  {patients.length}
                </span>
              }
            >
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-2 mb-3 scrollbar-none">
                {[
                  { id: 'all', label: dict.common.all },
                  { id: 'recent', label: dict.filters.recent },
                  { id: 'today', label: dict.filters.today },
                  { id: 'needsAttention', label: dict.filters.needsAttention },
                  { id: 'critical', label: dict.filters.critical },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFilter(f.id as typeof activeFilter)}
                    className={`px-3 py-1 rounded-[var(--radius-pill)] text-xs font-semibold transition-all whitespace-nowrap ${
                      activeFilter === f.id
                        ? 'bg-[var(--color-ink)] text-[var(--color-white)] shadow-xs'
                        : 'bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Grid or Empty State */}
              {isLoading ? (
                <div className="p-12 text-center text-xs text-[var(--color-ink-muted)]">
                  Loading clinical folders...
                </div>
              ) : patients.length === 0 ? (
                <EmptyState
                  title={dict.states.noPatients}
                  description="No patient records match the current filter"
                  actionLabel={dict.common.add}
                  onAction={() => setIsAddPatientOpen(true)}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {patients.map((p) => (
                    <PatientFolderCard key={p.id} patient={p} />
                  ))}
                </div>
              )}
            </ModuleCard>
          </div>

          {/* Right Column (3 cols): Needs Attention & Today Stats */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <ModuleCard title={dict.screens.needsAttention}>
              {needsAttentionPatients.length === 0 ? (
                <p className="text-xs text-[var(--color-ink-muted)] py-4 text-center">
                  All patients are currently stable.
                </p>
              ) : (
                <div className="space-y-2 mt-2">
                  {needsAttentionPatients.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/20 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-status-warning)] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-[var(--color-ink)] block truncate">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-[var(--color-ink-muted)] block truncate">
                          {p.primaryConcern}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ModuleCard>

            <ModuleCard title={dict.screens.todayStats}>
              <div className="grid grid-cols-2 gap-3 text-center mt-2">
                <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/20">
                  <span className="text-[11px] text-[var(--color-ink-muted)] block">Total Patients</span>
                  <span className="text-xl font-bold text-[var(--color-ink)]">{stats.totalPatients}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/20">
                  <span className="text-[11px] text-[var(--color-ink-muted)] block">Completed</span>
                  <span className="text-xl font-bold text-[var(--color-ink)]">{stats.completedToday}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/20">
                  <span className="text-[11px] text-[var(--color-ink-muted)] block">Wait Times</span>
                  <span className="text-sm font-bold text-[var(--color-ink)]">{stats.waitTimes}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/20">
                  <span className="text-[11px] text-[var(--color-ink-muted)] block">New Admits</span>
                  <span className="text-xl font-bold text-[var(--color-ink)]">{stats.newAdmits}</span>
                </div>
              </div>
            </ModuleCard>
          </div>
        </main>

        {/* Interactive Add Patient Modal Sheet */}
        <AddPatientSheet
          isOpen={isAddPatientOpen}
          onClose={() => setIsAddPatientOpen(false)}
          onSuccess={handlePatientCreated}
        />
      </AppFrame>
    </div>
  );
}
