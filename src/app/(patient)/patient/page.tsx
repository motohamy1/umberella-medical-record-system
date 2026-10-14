'use client';

/**
 * Patient Home Shell — S0 Foundation (§6.7).
 * Patient route group inside AppFrame with NotchHeader.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppFrame } from '@/components/primitives/AppFrame';
import { NotchHeader } from '@/components/primitives/NotchHeader';
import { CircleButton } from '@/components/primitives/CircleButton';
import { ModuleCard } from '@/components/cards/ModuleCard';
import { EmptyState } from '@/components/state/EmptyState';
import { getDictionary, type Locale } from '@/i18n';
import { Bell, LogOut } from 'lucide-react';

export default function PatientHomePage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('en');
  const dict = getDictionary(locale);

  const toggleLocale = () => {
    setLocale((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const handleSignOut = () => {
    router.push('/login');
  };

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <AppFrame margin>
        <NotchHeader
          title={dict.screens.myCare}
          controls={
            <div className="flex items-center gap-2">
              <CircleButton
                size="sm"
                icon={<Bell className="w-3.5 h-3.5" />}
                label="Notifications"
              />

              <button
                type="button"
                onClick={toggleLocale}
                className="px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-ink)] text-xs font-semibold hover:bg-[var(--color-white)] transition-colors"
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

        <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <ModuleCard title={dict.patientHome.nextUp}>
            <EmptyState
              title={dict.patientHome.nothingDue}
              description="Upcoming medication reminders appear in S13"
            />
          </ModuleCard>

          <ModuleCard title={dict.patientHome.healthSnapshot}>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[var(--color-surface)] flex justify-between items-center">
                <span className="text-xs font-medium text-[var(--color-ink)]">{dict.patientHome.bloodPressure}</span>
                <span className="text-xs text-[var(--color-ink-muted)]">Target 110–130 / 70–90 mmHg</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-surface)] flex justify-between items-center">
                <span className="text-xs font-medium text-[var(--color-ink)]">{dict.patientHome.bloodGlucose}</span>
                <span className="text-xs text-[var(--color-ink-muted)]">Target 80–120 mg/dL</span>
              </div>
            </div>
          </ModuleCard>

          <ModuleCard title={dict.patientHome.quickLog}>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Patient observation logging sheet connects in S13.
            </p>
          </ModuleCard>

          <ModuleCard title={dict.patientHome.myCarePlan}>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Active care plan checklist connects in S13.
            </p>
          </ModuleCard>
        </main>
      </AppFrame>
    </div>
  );
}
