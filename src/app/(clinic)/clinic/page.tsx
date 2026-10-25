'use client';

/**
 * Provider Home — S2 Slice (§6.2).
 * Conforms strictly to layout from ref-3, theme from ref-1/ref-2, and §4.6 closed inventory.
 * Features:
 * - Header: Notch "Patients", Search pill, Accent "Add patient" button, Bell with unread dot, Doctor profile menu dropdown
 * - Left column (~22%): "Today's schedule" with appointment cards (time block, name, visit type, 2 circle buttons)
 * - Center column (~54%): "Patients" with the 4 filter pills (Recent, Today, Needs attention, Critical),
 *   3-col desktop folder grid, Load more pagination, empty state for new folder
 * - Right column (~24%): "Needs attention" card with critical indicators, and "Today" stats card with 2 tiles + monochrome sparklines (D7)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppFrame } from '@/components/primitives/AppFrame';
import { NotchHeader } from '@/components/primitives/NotchHeader';
import { CircleButton } from '@/components/primitives/CircleButton';
import { ModuleCard } from '@/components/cards/ModuleCard';
import { EmptyState } from '@/components/state/EmptyState';
import { LoadingSkeleton } from '@/components/state/LoadingSkeleton';
import { PatientFolderCard } from '@/components/cards/PatientFolderCard';
import { AddPatientSheet } from '@/components/forms/AddPatientSheet';
import { SyncStatusBadge } from '@/components/sync/SyncStatusBadge';
import { AnchoredPopover } from '@/components/overlays/AnchoredPopover';
import { getDictionary, type Locale } from '@/i18n';
import { authClient } from '@/lib/auth/client';
import {
  Bell,
  Search,
  Plus,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ArrowUpRight,
  FileText,
  User,
  MessageSquare,
  Users,
  ShieldCheck,
  Languages,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';
import {
  fetchPatientsAction,
  fetchClinicStatsAction,
  fetchClinicAppointmentsAction,
  deletePatientAction,
} from '@/data/actions';
import type { Patient, ClinicStats, Appointment } from '@/data/types';

const PAGE_SIZE = 9;

export default function ClinicHomePage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('en');
  const dict = getDictionary(locale);

  // Neon Auth Session (Google OAuth user info)
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user;
  const doctorDisplayName = sessionUser?.name || sessionUser?.email?.split('@')[0] || dict.doctorMenu.doctorName;
  const doctorAvatarUrl = sessionUser?.image;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<ClinicStats>({
    totalPatients: 0,
    completedToday: 0,
    waitTimes: '0 min',
    newAdmits: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pageOffset, setPageOffset] = useState(0);

  // The 4 canonical filter pills per PACK.md §6.2: Recent, Today, Needs attention, Critical
  const [activeFilter, setActiveFilter] = useState<'recent' | 'today' | 'needsAttention' | 'critical'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  // Doctor profile menu state
  const [isDoctorMenuOpen, setIsDoctorMenuOpen] = useState(false);
  const doctorMenuRef = useRef<HTMLDivElement>(null);

  // Interactive Onboarding Walkthrough Guide Banner state
  const [showGuideBanner, setShowGuideBanner] = useState(true);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('umbrella_guide_dismissed');
      if (dismissed === 'true') {
        setShowGuideBanner(false);
      }
    } catch {}
  }, []);

  const handleDismissGuide = () => {
    setShowGuideBanner(false);
    try {
      localStorage.setItem('umbrella_guide_dismissed', 'true');
    } catch {}
  };

  // Selected appointment notes modal state
  const [activeNotesAppointment, setActiveNotesAppointment] = useState<Appointment | null>(null);

  // Initial load or filter/search change
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setPageOffset(0);
    try {
      const [pts, apts, st] = await Promise.all([
        fetchPatientsAction(activeFilter, searchQuery, PAGE_SIZE + 1, 0),
        fetchClinicAppointmentsAction(),
        fetchClinicStatsAction(),
      ]);

      if (pts.length > PAGE_SIZE) {
        setHasMore(true);
        setPatients(pts.slice(0, PAGE_SIZE));
      } else {
        setHasMore(false);
        setPatients(pts);
      }

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

  // Load more pagination handler
  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const nextOffset = pageOffset + PAGE_SIZE;
    try {
      const nextBatch = await fetchPatientsAction(activeFilter, searchQuery, PAGE_SIZE + 1, nextOffset);
      if (nextBatch.length > PAGE_SIZE) {
        setHasMore(true);
        setPatients((prev) => [...prev, ...nextBatch.slice(0, PAGE_SIZE)]);
      } else {
        setHasMore(false);
        setPatients((prev) => [...prev, ...nextBatch]);
      }
      setPageOffset(nextOffset);
    } catch (err) {
      console.error('Failed to load more patients:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleLocale = () => {
    setLocale((prev) => (prev === 'en' ? 'ar' : 'en'));
    setIsDoctorMenuOpen(false);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  const handlePatientCreated = (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev]);
    setStats((prev) => ({
      ...prev,
      totalPatients: prev.totalPatients + 1,
    }));
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      const res = await deletePatientAction(patientId);
      if (res.success) {
        setPatients((prev) => prev.filter((p) => p.id !== patientId));
        setStats((prev) => ({
          ...prev,
          totalPatients: Math.max(0, prev.totalPatients - 1),
        }));
      } else {
        alert(res.error || 'Failed to delete patient');
      }
    } catch (err) {
      console.error('Failed to delete patient:', err);
    }
  };

  // Patients requiring attention (§8.5 attention rules)
  const needsAttentionPatients = patients.filter(
    (p) => p.status === 'Needs review' || p.status === 'Critical'
  );

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="w-full h-[100dvh] overflow-hidden flex flex-col">
      <AppFrame>
        {/* ── NOTCH HEADER (ref-1 shell & ref-3 controls) ── */}
        <NotchHeader
          title={dict.screens.patients}
          controls={
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-white)] text-[var(--color-ink)] text-xs shadow-2xs border border-[var(--color-ink-soft)]/20 focus-within:ring-2 focus-within:ring-[var(--color-accent)] transition-all min-w-0">
                <Search className="w-3.5 h-3.5 text-[var(--color-ink-muted)] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={dict.common.searchPlaceholder}
                  className="bg-transparent border-none outline-none text-xs w-16 min-w-0 sm:w-44 text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)]"
                  aria-label={dict.common.searchPlaceholder}
                />
              </div>

              {/* Add Patient primary button: accent fill, ink text, pill, plus icon (PACK.md §6.2) */}
              <button
                type="button"
                onClick={() => setIsAddPatientOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 rounded-[var(--radius-pill)] bg-[var(--color-accent)] text-[var(--color-ink)] font-bold text-xs shadow-2xs hover:opacity-95 active:scale-95 transition-all select-none cursor-pointer"
                aria-label={dict.common.addPatient}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">{dict.common.addPatient}</span>
              </button>

              {/* Offline & Cloud Sync Center Badge (§572) */}
              <SyncStatusBadge />

              {/* Notifications CircleButton with unread dot indicator */}
              <div className="relative">
                <CircleButton
                  size="sm"
                  icon={<Bell className="w-3.5 h-3.5 text-[var(--color-ink)]" />}
                  label="Notifications"
                />
                <span className="absolute top-1 end-1 w-2 h-2 rounded-full bg-[var(--color-ink)] ring-2 ring-[var(--color-frame)]" />
              </div>

              {/* Doctor Profile Menu Dropdown (ref-3) */}
              <div className="relative" ref={doctorMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsDoctorMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/20 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-white)] transition-colors select-none cursor-pointer"
                  aria-haspopup="true"
                  aria-expanded={isDoctorMenuOpen}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-[var(--color-white)] border border-[var(--color-ink-soft)]/30 flex items-center justify-center font-bold text-[10px] text-[var(--color-ink)] shrink-0">
                    {doctorAvatarUrl ? (
                      <img src={doctorAvatarUrl} alt={doctorDisplayName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-[var(--color-ink)]" />
                    )}
                  </div>
                  <span className="hidden sm:inline font-bold truncate max-w-[120px]">{doctorDisplayName}</span>
                  <ChevronDown className={`w-3 h-3 text-[var(--color-ink-muted)] transition-transform ${isDoctorMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnchoredPopover
                  open={isDoctorMenuOpen}
                  onClose={() => setIsDoctorMenuOpen(false)}
                  anchorRef={doctorMenuRef}
                  align="end"
                  offset={6}
                  ariaLabel={dict.doctorMenu.doctorName}
                  className="w-48 rounded-xl bg-[var(--color-white)] border border-[var(--color-ink-soft)]/30 shadow-lg py-1.5 text-xs"
                >
                    <div className="px-3 py-2 border-b border-[var(--color-ink-soft)]/20">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/30 flex items-center justify-center shrink-0">
                          {doctorAvatarUrl ? (
                            <img src={doctorAvatarUrl} alt={doctorDisplayName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[var(--color-ink)] block truncate text-xs">{doctorDisplayName}</span>
                          <span className="text-[10px] text-[var(--color-ink-muted)] block truncate">{sessionUser?.email || dict.roles.doctor}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDoctorMenuOpen(false)}
                      className="w-full px-3 py-1.5 text-start font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface)] flex items-center gap-2"
                      role="menuitem"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                      <span>{dict.doctorMenu.communication}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsDoctorMenuOpen(false)}
                      className="w-full px-3 py-1.5 text-start font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface)] flex items-center gap-2"
                      role="menuitem"
                    >
                      <Users className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                      <span>{dict.doctorMenu.members}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsDoctorMenuOpen(false)}
                      className="w-full px-3 py-1.5 text-start font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface)] flex items-center gap-2"
                      role="menuitem"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                      <span>{dict.doctorMenu.audit}</span>
                    </button>

                    <div className="my-1 border-t border-[var(--color-ink-soft)]/20" />

                    <button
                      type="button"
                      onClick={toggleLocale}
                      className="w-full px-3 py-1.5 text-start font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface)] flex items-center justify-between"
                      role="menuitem"
                    >
                      <span className="flex items-center gap-2">
                        <Languages className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                        <span>{dict.doctorMenu.language}</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-surface)]">
                        {locale === 'en' ? 'العربية' : 'English'}
                      </span>
                    </button>

                    <div className="my-1 border-t border-[var(--color-ink-soft)]/20" />

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full px-3 py-1.5 text-start font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                      role="menuitem"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{dict.doctorMenu.signOut}</span>
                    </button>
                </AnchoredPopover>
              </div>
            </div>
          }
        />

        {/* ── MAIN CANVAS CONTENT ── */}
        <main className="flex-1 p-3.5 sm:p-5 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
            {/* ── LEFT COLUMN (~22% / 3 cols): Today's Schedule ── */}
            <div className="lg:col-span-3 space-y-4">
              <ModuleCard
                title={dict.screens.schedule}
                className="min-h-[420px]"
                badge={
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface)] font-mono font-bold text-[var(--color-ink-muted)]">
                    {appointments.length}
                  </span>
                }
              >
                {appointments.length === 0 ? (
                  <EmptyState
                    title={dict.states.noAppointments}
                    description="No appointments scheduled for today"
                  />
                ) : (
                  <div className="space-y-3 mt-2">
                    {appointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/25 flex flex-col gap-2 shadow-2xs hover:border-[var(--color-ink-soft)]/50 transition-colors"
                      >
                        {/* Time block + Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[var(--color-ink)] tracking-tight">
                            {apt.scheduledTime}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-white)] text-[var(--color-ink-muted)] font-medium capitalize border border-[var(--color-ink-soft)]/20">
                            {apt.status}
                          </span>
                        </div>

                        {/* Patient Name & Visit Type */}
                        <div>
                          <h4 className="font-bold text-xs text-[var(--color-ink)] truncate leading-tight">
                            {apt.patientName}
                          </h4>
                          <span className="text-[11px] text-[var(--color-ink-muted)] block truncate mt-0.5">
                            {apt.visitType}
                          </span>
                        </div>

                        {/* Two Small CircleButtons (PACK.md §6.2) */}
                        <div className="pt-2 border-t border-[var(--color-ink-soft)]/20 flex items-center justify-end gap-1.5">
                          {/* CircleButton 1: Open workspace */}
                          <CircleButton
                            size="sm"
                            icon={<ArrowUpRight className="w-3 h-3 text-[var(--color-ink)]" />}
                            label={dict.schedule.openWorkspace}
                            onClick={() => router.push(`/clinic/patients/${apt.patientId}`)}
                          />

                          {/* CircleButton 2: Open visit notes */}
                          <CircleButton
                            size="sm"
                            icon={<FileText className="w-3 h-3 text-[var(--color-ink)]" />}
                            label={dict.schedule.openNotes}
                            onClick={() => setActiveNotesAppointment(apt)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ModuleCard>
            </div>

            {/* ── CENTER COLUMN (~54% / 6 cols): Patients Folders Grid ── */}
            <div className="lg:col-span-6 space-y-4">
              <ModuleCard
                title={dict.screens.patients}
                className="min-h-[640px]"
                badge={
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface)] font-mono font-bold text-[var(--color-ink-muted)]">
                    {patients.length}
                  </span>
                }
              >
                {/* ── Welcome & Interactive Walkthrough Guide Banner ── */}
                {showGuideBanner && (
                  <div className="mb-4 p-4 sm:p-4.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/35 shadow-xs relative overflow-hidden transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-lemon)] flex items-center justify-center text-[var(--color-ink)] shadow-2xs shrink-0">
                          <Sparkles className="w-4 h-4 text-[var(--color-ink)]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-[var(--color-ink)]">
                              Welcome to ClinicUmberella
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-[var(--color-ink)] text-white text-[9px] font-bold uppercase tracking-wider">
                              Getting Started
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                            Clean workspace initialized. Here is how to navigate and manage your clinic:
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDismissGuide}
                        className="p-1 rounded-full text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-white)] transition-colors cursor-pointer"
                        title="Dismiss guide"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--color-ink-soft)]/20 text-xs">
                      <div className="p-2.5 rounded-xl bg-[var(--color-white)] border border-[var(--color-ink-soft)]/20 flex flex-col justify-between">
                        <div>
                          <span className="font-bold text-[11px] text-[var(--color-ink)] block">
                            1. Explore UI Walkthrough
                          </span>
                          <span className="text-[10px] text-[var(--color-ink-muted)] leading-tight block mt-1">
                            Click the sample folder below to inspect vital charts, stepladder tabs, AI summary, and DICOM MRI viewer.
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[var(--color-white)] border border-[var(--color-ink-soft)]/20 flex flex-col justify-between">
                        <div>
                          <span className="font-bold text-[11px] text-[var(--color-ink)] block">
                            2. Add Real Patients
                          </span>
                          <span className="text-[10px] text-[var(--color-ink-muted)] leading-tight block mt-1">
                            Use the <strong className="font-bold text-[var(--color-ink)]">+ Add patient</strong> button in the top header anytime to register your first patient.
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[var(--color-white)] border border-[var(--color-ink-soft)]/20 flex flex-col justify-between">
                        <div>
                          <span className="font-bold text-[11px] text-[var(--color-ink)] block">
                            3. Remove Sample Folder
                          </span>
                          <span className="text-[10px] text-[var(--color-ink-muted)] leading-tight block mt-1">
                            Click the (•••) menu on the sample card or inside the record to remove the walkthrough patient whenever ready.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 4 Filter Pills (PACK.md §6.2: Recent, Today, Needs attention, Critical) ── */}
                <div className="flex items-center gap-2 overflow-x-auto py-1 mb-4 scrollbar-none" role="tablist">
                  {[
                    { id: 'recent', label: dict.filters.recent },
                    { id: 'today', label: dict.filters.today },
                    { id: 'needsAttention', label: dict.filters.needsAttention },
                    { id: 'critical', label: dict.filters.critical },
                  ].map((f) => {
                    const isSelected = activeFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => setActiveFilter(f.id as typeof activeFilter)}
                        className={`px-3.5 py-1.5 rounded-[var(--radius-pill)] text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--color-ink)] text-[var(--color-white)] shadow-xs'
                            : 'bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

                {/* Grid or Empty/Loading State */}
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-48 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4 flex flex-col justify-between animate-pulse border border-[var(--color-ink-soft)]/20">
                        <div className="space-y-2">
                          <div className="w-16 h-3 bg-[var(--color-ink-soft)]/30 rounded" />
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[var(--color-ink-soft)]/30" />
                            <div className="space-y-1">
                              <div className="w-24 h-3 bg-[var(--color-ink-soft)]/30 rounded" />
                              <div className="w-14 h-2 bg-[var(--color-ink-soft)]/20 rounded" />
                            </div>
                          </div>
                        </div>
                        <div className="w-full h-8 bg-[var(--color-ink-soft)]/20 rounded" />
                      </div>
                    ))}
                  </div>
                ) : patients.length === 0 ? (
                  <EmptyState
                    title={dict.states.noPatients}
                    description="No patient records match the current filter"
                    actionLabel={dict.common.addPatient}
                    onAction={() => setIsAddPatientOpen(true)}
                  />
                ) : (
                  <>
                    {/* 3-column desktop layout (2 tablet, 1-2 mobile) per §6.2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                      {patients.map((p) => (
                        <PatientFolderCard
                          key={p.id}
                          patient={p}
                          locale={locale}
                          onOpenWorkspace={(id) => router.push(`/clinic/patients/${id}`)}
                          onDeletePatient={handleDeletePatient}
                        />
                      ))}
                    </div>

                    {/* Server Pagination: "Load more" button (§6.2 & §11) */}
                    {hasMore && (
                      <div className="pt-6 pb-2 flex justify-center">
                        <button
                          type="button"
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                          className="px-6 py-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] hover:bg-[var(--color-white)] border border-[var(--color-ink-soft)]/30 font-bold text-xs text-[var(--color-ink)] shadow-2xs hover:shadow-xs transition-all disabled:opacity-50"
                        >
                          {isLoadingMore ? dict.common.loading : dict.common.loadMore}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </ModuleCard>
            </div>

            {/* ── RIGHT COLUMN (~24% / 3 cols): Needs Attention & Today Stats ── */}
            <div className="lg:col-span-3 space-y-4">
              {/* Needs Attention ModuleCard (PACK.md §6.2) */}
              <ModuleCard
                title={dict.screens.needsAttention}
                badge={
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface)] font-mono font-bold text-[var(--color-ink-muted)]">
                    {needsAttentionPatients.length}
                  </span>
                }
              >
                {needsAttentionPatients.length === 0 ? (
                  <p className="text-xs text-[var(--color-ink-muted)] py-4 text-center italic">
                    {dict.attention.allStable}
                  </p>
                ) : (
                  <div className="space-y-2.5 mt-2">
                    {needsAttentionPatients.map((p) => {
                      const isCritical = p.status === 'Critical';
                      return (
                        <div
                          key={p.id}
                          onClick={() => router.push(`/clinic/patients/${p.id}`)}
                          className="p-3 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/25 flex items-start gap-2.5 hover:border-[var(--color-ink-soft)]/50 cursor-pointer transition-colors shadow-2xs"
                        >
                          {/* Alert icon with red dot on critical items */}
                          <div className="relative shrink-0 mt-0.5">
                            <AlertTriangle className="w-4 h-4 text-[var(--color-ink)]" />
                            {isCritical && (
                              <span className="absolute -top-0.5 -end-0.5 w-1.5 h-1.5 rounded-full bg-red-600 ring-1 ring-white" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs text-[var(--color-ink)] truncate">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-[var(--color-ink-muted)] shrink-0 font-mono">
                                {p.lastVisitDate || 'Today'}
                              </span>
                            </div>
                            <span className="text-[11px] text-[var(--color-ink-muted)] block truncate mt-0.5">
                              {p.primaryConcern}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ModuleCard>

              {/* Today Stats ModuleCard: Exactly 2 tiles (Total patients & Completed today) per D7 & §6.2 */}
              <ModuleCard title={dict.screens.todayStats}>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {/* Tile 1: Total Patients */}
                  <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/20 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-[var(--color-ink-muted)] block">
                        {dict.common.totalPatients}
                      </span>
                      <span className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">
                        {stats.totalPatients}
                      </span>
                    </div>

                    {/* Monochrome ink sparkline (ref-3 styled per D7) */}
                    <div className="mt-3 h-5 w-full flex items-end gap-1">
                      {[40, 65, 55, 80, 70, 95, 85].map((val, idx) => (
                        <div
                          key={idx}
                          style={{ height: `${val}%` }}
                          className="flex-1 bg-[var(--color-ink)]/75 rounded-t-xs"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Tile 2: Completed Today */}
                  <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/20 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-[var(--color-ink-muted)] block">
                        {dict.common.completedToday}
                      </span>
                      <span className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">
                        {stats.completedToday}
                      </span>
                    </div>

                    {/* Monochrome ink sparkline (ref-3 styled per D7) */}
                    <div className="mt-3 h-5 w-full flex items-end gap-1">
                      {[25, 45, 60, 50, 75, 90, 100].map((val, idx) => (
                        <div
                          key={idx}
                          style={{ height: `${val}%` }}
                          className="flex-1 bg-[var(--color-ink)]/75 rounded-t-xs"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </ModuleCard>
            </div>
          </div>
        </main>

        {/* ── INTERACTIVE ADD PATIENT MODAL SHEET ── */}
        <AddPatientSheet
          isOpen={isAddPatientOpen}
          onClose={() => setIsAddPatientOpen(false)}
          onSuccess={handlePatientCreated}
        />

        {/* ── VISIT NOTES MODAL POPUP ── */}
        {activeNotesAppointment && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
            onClick={() => setActiveNotesAppointment(null)}
          >
            <div
              className="w-full max-w-md bg-[var(--color-white)] rounded-[var(--radius-card)] p-5 border border-[var(--color-ink-soft)]/30 shadow-xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--color-ink-soft)]/20 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-[var(--color-ink)]">
                    {activeNotesAppointment.patientName}
                  </h3>
                  <span className="text-[11px] text-[var(--color-ink-muted)]">
                    {activeNotesAppointment.scheduledTime} · {activeNotesAppointment.visitType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNotesAppointment(null)}
                  className="px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-ink)] hover:bg-[var(--color-ink-soft)]/30"
                >
                  {dict.common.close}
                </button>
              </div>

              <div className="text-xs text-[var(--color-ink)] space-y-2 bg-[var(--color-surface)] p-3.5 rounded-xl border border-[var(--color-ink-soft)]/20">
                <span className="font-bold block text-[11px] text-[var(--color-ink-muted)] uppercase tracking-wider">
                  Scheduled Encounter Details
                </span>
                <p>
                  Status: <span className="font-semibold capitalize">{activeNotesAppointment.status}</span>
                </p>
                <p>
                  Visit Type: <span className="font-semibold">{activeNotesAppointment.visitType}</span>
                </p>
                <p className="text-[11px] text-[var(--color-ink-muted)]">
                  Clinical chart notes can be reviewed and edited in the patient workspace.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const pid = activeNotesAppointment.patientId;
                    setActiveNotesAppointment(null);
                    router.push(`/clinic/patients/${pid}`);
                  }}
                  className="px-4 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-white)] font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <span>{dict.schedule.openWorkspace}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </AppFrame>
    </div>
  );
}
