'use client';

/**
 * MyCarePlanCard — Section 6.7 Patient Home: My Care Plan.
 * - Daily checklist (checkbox rows, subtle "2 of 3 done")
 * - Next appointment (doctor, date and time)
 * - Goal line (for example "Maintain 66 kg" / "Goal: Maintain BP < 130/80 mmHg")
 */

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { CheckSquare, Square, Calendar, User, Target } from 'lucide-react';
import { ModuleCard } from '@/components/cards/ModuleCard';
import type { CopyDeck } from '@/i18n';
import { en } from '@/i18n/en';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

interface MyCarePlanCardProps {
  initialChecklist?: ChecklistItem[];
  nextAppointment?: {
    doctorName?: string;
    scheduledTime?: string;
    visitType?: string;
  } | null;
  goal?: string;
  dict?: CopyDeck['patientHome'];
  className?: string;
}

export function MyCarePlanCard({
  initialChecklist = [
    { id: 'chk-1', label: 'Morning Blood Pressure Check', done: true },
    { id: 'chk-2', label: 'Take morning medications with breakfast', done: true },
    { id: 'chk-3', label: '30-minute moderate aerobic walk', done: false },
  ],
  nextAppointment = {
    doctorName: 'Dr. Tarek',
    scheduledTime: 'Tomorrow, 09:00 AM',
    visitType: 'Follow-up Consultation',
  },
  goal = 'Goal: Maintain fasting blood glucose < 100 mg/dL & BP < 130/80 mmHg',
  dict = en.patientHome,
  className,
}: MyCarePlanCardProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const doneCount = checklist.filter((item) => item.done).length;
  const totalCount = checklist.length;

  return (
    <ModuleCard
      title={dict.myCarePlan}
      className={clsx('h-full flex flex-col justify-between', className)}
      data-testid="care-plan-card"
    >
      <div className="flex flex-col gap-4">
        {/* Section 1: Daily Checklist */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
              {dict.dailyChecklist}
            </span>
            <span
              className="text-xs font-mono font-medium text-[var(--color-ink-muted)] bg-black/5 px-2 py-0.5 rounded-full"
              data-testid="checklist-counter"
            >
              {doneCount} of {totalCount} done
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {checklist.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id)}
                className={clsx(
                  'w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left cursor-pointer',
                  item.done
                    ? 'bg-emerald-50/60 border-emerald-200/50 text-[var(--color-ink)]'
                    : 'bg-white border-black/10 text-[var(--color-ink)] hover:bg-stone-50'
                )}
                data-testid={`checklist-item-${item.id}`}
              >
                {item.done ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-stone-400 shrink-0" />
                )}
                <span
                  className={clsx(
                    'text-xs font-medium flex-1 truncate',
                    item.done && 'line-through text-[var(--color-ink-muted)]'
                  )}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Next Appointment */}
        {nextAppointment && (
          <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-black/5 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[var(--color-white)] flex items-center justify-center text-[var(--color-ink)] shadow-2xs shrink-0">
                <Calendar className="w-4 h-4 stroke-[1.75]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider block">
                  {dict.nextAppointment}
                </span>
                <span className="text-xs font-bold text-[var(--color-ink)] block truncate">
                  {nextAppointment.scheduledTime} · {nextAppointment.doctorName}
                </span>
                <span className="text-[11px] text-[var(--color-ink-muted)] block truncate">
                  {nextAppointment.visitType}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Goal Line */}
        <div className="pt-2 border-t border-black/5 flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-[var(--color-ink)] truncate" data-testid="care-plan-goal">
            {goal}
          </p>
        </div>
      </div>
    </ModuleCard>
  );
}
