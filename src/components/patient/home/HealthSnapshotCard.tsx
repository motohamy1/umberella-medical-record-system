'use client';

/**
 * HealthSnapshotCard — Section 6.7 Patient Home: Health Snapshot.
 * Two internal modules:
 * 1. Blood pressure: monochrome sparkline of last readings, last value with unit (mmHg), target range.
 * 2. Blood glucose: last readings as markers on RangeBar-style strip, target range (mg/dL).
 */

import React from 'react';
import { clsx } from 'clsx';
import { Activity, Droplet } from 'lucide-react';
import { ModuleCard } from '@/components/cards/ModuleCard';
import { RangeBar } from '@/components/cards/RangeBar';
import type { CopyDeck } from '@/i18n';
import { en } from '@/i18n/en';

interface HealthSnapshotCardProps {
  latestBp?: string;
  bpReadings?: Array<{ at: string; systolic: number; diastolic: number }>;
  latestGlucose?: string;
  glucoseReadings?: Array<{ at: string; value: number }>;
  bpTarget?: string;
  glucoseTarget?: string;
  dict?: CopyDeck['patientHome'];
  className?: string;
}

export function HealthSnapshotCard({
  latestBp = '122/81',
  bpReadings = [
    { at: '2026-10-08', systolic: 135, diastolic: 88 },
    { at: '2026-10-10', systolic: 130, diastolic: 85 },
    { at: '2026-10-12', systolic: 126, diastolic: 82 },
    { at: '2026-10-14', systolic: 122, diastolic: 81 },
  ],
  latestGlucose = '83',
  glucoseReadings = [
    { at: '2026-10-08', value: 110 },
    { at: '2026-10-10', value: 95 },
    { at: '2026-10-12', value: 88 },
    { at: '2026-10-14', value: 83 },
  ],
  bpTarget = 'Target 110–130 / 70–90',
  glucoseTarget = 'Target 80–120 mg/dL',
  dict = en.patientHome,
  className,
}: HealthSnapshotCardProps) {
  // Generate monochrome SVG path for systolic readings
  const systolicPoints = bpReadings.map((r) => r.systolic);
  const minSys = Math.min(...systolicPoints, 100);
  const maxSys = Math.max(...systolicPoints, 140);
  const rangeSys = maxSys - minSys || 1;

  const width = 160;
  const height = 36;
  const padding = 4;

  const pathCoordinates = systolicPoints.map((val, idx) => {
    const x = padding + (idx / Math.max(systolicPoints.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((val - minSys) / rangeSys) * (height - padding * 2);
    return `${x},${y}`;
  });

  const sparklineD = pathCoordinates.length > 0 ? `M ${pathCoordinates.join(' L ')}` : '';

  return (
    <ModuleCard
      title={dict.healthSnapshot}
      className={clsx('h-full flex flex-col justify-between', className)}
      data-testid="health-snapshot-card"
    >
      <div className="flex flex-col gap-3.5">
        {/* Module 1: Blood Pressure */}
        <div className="p-3.5 sm:p-4 rounded-[16px] bg-[var(--color-surface)] border border-black/5 shadow-2xs flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[var(--color-white)] flex items-center justify-center text-[var(--color-ink)] shadow-2xs">
                <Activity className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-xs font-bold text-[var(--color-ink)]">
                {dict.bloodPressure}
              </span>
            </div>

            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
              {bpTarget}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 mt-1">
            <div>
              <span className="text-xl sm:text-2xl font-bold text-[var(--color-ink)] leading-none" data-testid="latest-bp-value">
                {latestBp}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)] ml-1 font-mono">
                mmHg
              </span>
            </div>

            {/* Monochrome sparkline of last readings */}
            <div className="flex items-center gap-2">
              <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="overflow-visible"
                aria-label="Blood pressure sparkline"
              >
                {sparklineD && (
                  <path
                    d={sparklineD}
                    fill="none"
                    stroke="var(--color-ink)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-80"
                  />
                )}
                {pathCoordinates.map((coord, idx) => {
                  const [cx, cy] = coord.split(',');
                  const isLast = idx === pathCoordinates.length - 1;
                  return (
                    <circle
                      key={idx}
                      cx={cx}
                      cy={cy}
                      r={isLast ? 3.5 : 2}
                      fill={isLast ? 'var(--color-accent-neon)' : 'var(--color-ink)'}
                      stroke="var(--color-ink)"
                      strokeWidth={isLast ? 1.5 : 1}
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Module 2: Blood Glucose */}
        <div className="p-3.5 sm:p-4 rounded-[16px] bg-[var(--color-surface)] border border-black/5 shadow-2xs flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[var(--color-white)] flex items-center justify-center text-amber-600 shadow-2xs">
                <Droplet className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-xs font-bold text-[var(--color-ink)]">
                {dict.bloodGlucose}
              </span>
            </div>

            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
              {glucoseTarget}
            </span>
          </div>

          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl sm:text-2xl font-bold text-[var(--color-ink)] leading-none" data-testid="latest-glucose-value">
              {latestGlucose}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)] font-mono">
              mg/dL
            </span>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 ml-2">
              Normal Fasting
            </span>
          </div>

          {/* RangeBar telemetry strip */}
          <div className="pt-1">
            <RangeBar
              value={parseFloat(latestGlucose) || 83}
              referenceLow={80}
              referenceHigh={120}
              min={60}
              max={160}
              unit="mg/dL"
              showLabels={false}
              className="py-1"
            />
          </div>
        </div>
      </div>
    </ModuleCard>
  );
}
