'use client';

/**
 * Patient Home — Section 6.7 Patient Home (`/patient`).
 * Specification: docs/PACK.md §6.7, §11 (S13) & docs/design/pages.md
 * 
 * Layout & Content:
 * - NotchHeader: tab titled "My care", no close button. Right: bell CircleButton, avatar + name opening menu (Language, Sign out).
 * - Canvas: a 2×2 arrangement (stacked on mobile):
 *   1. Next up: Next due medication from active care plan, flat line icon in white circle (NO 3D pill, NO clock illustration), "Log taken" button. Empty state: "Nothing due right now".
 *   2. Health snapshot: Blood pressure (monochrome sparkline, last value, target range) and Blood glucose (RangeBar strip, target range).
 *   3. Quick log: Symptoms (Fever, Cough, Headache) and Vitals (Heart rate, Weight, Mood) CircleButtons + pill quick note field. Patient observation path (§9.3).
 *   4. My care plan: Daily checklist (checkbox rows, subtle "2 of 3 done"), next appointment (doctor, date, time), goal line.
 * 
 * Anti-patterns strictly avoided:
 * - Plain headings ("Next up", "Health snapshot", "Quick log", "My care plan"). Never "Next Action Hero Card".
 * - No tablet frames, no pastel buttons, no 3D elements, no points, no streaks.
 * - Zero raw hex colors.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppFrame } from '@/components/primitives/AppFrame';
import { NotchHeader } from '@/components/primitives/NotchHeader';
import { CircleButton } from '@/components/primitives/CircleButton';
import { AnchoredPopover } from '@/components/overlays/AnchoredPopover';
import { NextUpCard } from '@/components/patient/home/NextUpCard';
import { HealthSnapshotCard } from '@/components/patient/home/HealthSnapshotCard';
import { QuickLogCard } from '@/components/patient/home/QuickLogCard';
import { MyCarePlanCard } from '@/components/patient/home/MyCarePlanCard';
import { getDictionary, type Locale } from '@/i18n';
import { authClient } from '@/lib/auth/client';
import { Bell, LogOut, User, Globe, ChevronDown, Check } from 'lucide-react';
import {
  fetchPatientHomeDataAction,
  recordPatientObservationAction,
  recordPatientMedicationTakenAction,
} from '@/data/actions';
import type { PatientObservationInput } from '@/data/repository';
import type { Patient, Medication } from '@/data/types';

export default function PatientHomePage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('en');
  const dict = getDictionary(locale);

  // Active patient selection (defaults to hero patient p-001 Mostafa Ibrahim, allows toggle to p-007 for empty state)
  const [patientId, setPatientId] = useState<string>('p-001');
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Home data state
  const [patient, setPatient] = useState<Patient | null>(null);
  const [nextDueMedication, setNextDueMedication] = useState<Medication | null>(null);
  const [latestBp, setLatestBp] = useState<string>('122/81');
  const [bpReadings, setBpReadings] = useState<Array<{ at: string; systolic: number; diastolic: number }>>([]);
  const [latestGlucose, setLatestGlucose] = useState<string>('83');
  const [glucoseReadings, setGlucoseReadings] = useState<Array<{ at: string; value: number }>>([]);
  const [nextAppointment, setNextAppointment] = useState<{
    doctorName?: string;
    scheduledTime?: string;
    visitType?: string;
  } | null>(null);
  const [carePlanGoal, setCarePlanGoal] = useState<string>(
    'Goal: Maintain fasting blood glucose < 100 mg/dL & BP < 130/80 mmHg'
  );

  const loadHomeData = useCallback(async (pid: string) => {
    setIsLoading(true);
    try {
      const data = await fetchPatientHomeDataAction(pid);
      if (data) {
        setPatient(data.patient);
        setNextDueMedication(data.nextDueMedication);
        setLatestBp(data.latestBp);
        setBpReadings(data.bpReadings);
        setLatestGlucose(data.latestGlucose);
        setGlucoseReadings(data.glucoseReadings);
        setNextAppointment(data.nextAppointment);
        setCarePlanGoal(data.carePlanGoal);
      }
    } catch (err) {
      console.error('Failed to load patient home data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData(patientId);
  }, [patientId, loadHomeData]);

  const toggleLocale = () => {
    setLocale((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  const handleLogTaken = async (medId: string, medName: string) => {
    await recordPatientMedicationTakenAction({
      patientId,
      medicationId: medId,
      medicationName: medName,
    });
  };

  const handleSaveObservation = async (input: PatientObservationInput) => {
    await recordPatientObservationAction(input);
  };

  const patientName = patient?.name || (patientId === 'p-001' ? 'Mostafa Ibrahim' : 'Nour El-Sayed');

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)] font-['Inter',system-ui,sans-serif]">
      <AppFrame margin>
        {/* ========================================================================= */}
        {/* NOTCH HEADER: Tab titled "My care", no close button. Bell & profile menu.   */}
        {/* ========================================================================= */}
        <NotchHeader
          title={dict.screens.myCare}
          controls={
            <div className="flex items-center gap-2 relative">
              <CircleButton
                size="sm"
                icon={<Bell className="w-3.5 h-3.5" />}
                label="Notifications"
              />

              {/* Patient Profile Dropdown trigger */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] hover:bg-[var(--color-white)] text-[var(--color-ink)] border border-black/5 shadow-2xs transition-all cursor-pointer"
                  data-testid="patient-profile-menu-button"
                >
                  <div className="w-5 h-5 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center text-[10px] font-bold text-[var(--color-ink)]">
                    {patientName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold max-w-[120px] truncate hidden sm:inline">
                    {patientName}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[var(--color-ink-muted)]" />
                </button>

                {/* Profile Dropdown Menu */}
                <AnchoredPopover
                  open={isProfileMenuOpen}
                  onClose={() => setIsProfileMenuOpen(false)}
                  anchorRef={profileMenuRef}
                  align="end"
                  offset={8}
                  ariaLabel={patientName}
                  className="w-56 rounded-2xl bg-[var(--color-white)] border border-black/10 shadow-lg p-2 flex flex-col gap-1 text-left"
                >
                    <div className="px-3 py-2 border-b border-black/5">
                      <span className="text-[10px] font-medium text-[var(--color-ink-muted)] uppercase tracking-wider block">
                        Signed in as Patient
                      </span>
                      <span className="text-xs font-bold text-[var(--color-ink)] block truncate mt-0.5">
                        {patientName}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-ink-muted)] block">
                        {patient?.mrn || 'MRN-2026-0814'}
                      </span>
                    </div>

                    {/* Patient Switcher for demo/testing */}
                    <div className="px-3 py-1.5">
                      <span className="text-[10px] font-medium text-[var(--color-ink-muted)] block mb-1">
                        Active Patient Profile:
                      </span>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPatientId('p-001');
                            setIsProfileMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                            patientId === 'p-001' ? 'bg-stone-100 font-bold' : 'hover:bg-stone-50'
                          }`}
                        >
                          <span>Mostafa Ibrahim (Hero)</span>
                          {patientId === 'p-001' && <Check className="w-3 h-3 text-emerald-600" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPatientId('p-007');
                            setIsProfileMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                            patientId === 'p-007' ? 'bg-stone-100 font-bold' : 'hover:bg-stone-50'
                          }`}
                        >
                          <span>Nour El-Sayed (Baseline)</span>
                          {patientId === 'p-007' && <Check className="w-3 h-3 text-emerald-600" />}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-black/5 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          toggleLocale();
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-ink)] hover:bg-stone-100 transition-colors text-left cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                        <span>Language: {locale === 'en' ? 'العربية' : 'English'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </AnchoredPopover>
              </div>
            </div>
          }
        />

        {/* ========================================================================= */}
        {/* CANVAS: 2×2 ARRANGEMENT (STACKED ON MOBILE)                               */}
        {/* Top-Left: Next up                                                         */}
        {/* Top-Right: Health snapshot                                                */}
        {/* Bottom-Left: Quick log                                                    */}
        {/* Bottom-Right: My care plan                                                */}
        {/* ========================================================================= */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full border-3 border-[var(--color-ink)] border-t-transparent animate-spin mb-3" />
              <span className="text-xs font-semibold text-[var(--color-ink-muted)]">
                Loading My Care Home...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
              {/* 1. Next Up Card */}
              <NextUpCard
                medication={nextDueMedication}
                onLogTaken={handleLogTaken}
                dict={dict.patientHome}
              />

              {/* 2. Health Snapshot Card */}
              <HealthSnapshotCard
                latestBp={latestBp}
                bpReadings={bpReadings}
                latestGlucose={latestGlucose}
                glucoseReadings={glucoseReadings}
                dict={dict.patientHome}
              />

              {/* 3. Quick Log Card */}
              <QuickLogCard
                patientId={patientId}
                patientName={patientName}
                onSaveObservation={handleSaveObservation}
                dict={dict.patientHome}
              />

              {/* 4. My Care Plan Card */}
              <MyCarePlanCard
                nextAppointment={nextAppointment}
                goal={carePlanGoal}
                dict={dict.patientHome}
              />
            </div>
          )}
        </main>
      </AppFrame>
    </div>
  );
}
