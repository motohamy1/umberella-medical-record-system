'use client';

/**
 * Interactive care timeline (ref-2 "zoomed-out lens" + ref-1 "L3 deep dive").
 * - D3 owns the time scale; React renders everything (D3 never mutates React DOM).
 * - Milestones sit on the axis as neon document nodes; children hang below on soft,
 *   smooth, curvy wires with kind icons and count badges; imaging renders as a photo card.
 * - Non-overlapping layout: lanes and overflow chips are collision-checked with strict bounds.
 * - Interactive Pop-up card: clicking any icon/node opens an anchored floating clinical
 *   detail card with kind-specific content, close button, outside-click dismissal, and tab navigation.
 * - Bottom scrubber: density dots with counts, month ticks + labels, dark window with rounded caps.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { Plus, X, ArrowRight, Layers, Calendar } from 'lucide-react';
import type { CareEvent } from '@/data/types';
import { MetricCard } from '../cards/MetricCard';
import { MedicationChip } from '../cards/MedicationChip';

export interface InteractiveTimelineProps {
  careEvents: CareEvent[];
  onAddEntry?: () => void;
  activeFilters?: string[];
  onNavigateToTab?: (tab: string) => void;
}

const DAY = 86400000;
const parseDate = (s: string) => new Date(s);
const ev = (id: string, kind: CareEvent['kind'], label: string, summary: string, occurredAt: string): CareEvent =>
  ({ id, kind, label, summary, occurredAt, source: 'doctor', orgId: 'org-demo', patientId: 'p', createdBy: 'Dr. Tarek' });

const filterMap: Record<string, CareEvent['kind'][]> = {
  'Office Visits': ['visit', 'vitals', 'procedure', 'hospitalization'],
  'Medications': ['medication'],
  'Labs': ['lab'],
  'Procedures': ['procedure'],
  'Hospitalizations': ['hospitalization'],
  'Imaging': ['imaging'],
};

const fallback: CareEvent[] = [
  ev('visit-1', 'visit', 'Consultation & Initial Triage', 'Emergency encounter following cranial trauma. Neurological baseline documented.', '12 May 2026'),
  ev('med-1a', 'medication', 'Lisinopril 10mg', 'Antihypertensive, once daily.', '16 May 2026'),
  ev('med-1b', 'medication', 'Lisinopril 10mg', 'Antihypertensive, once daily.', '17 May 2026'),
  ev('visit-2', 'visit', 'Post-Trauma Follow-Up', 'Intermittent fronto-temporal headaches; reduced photophobia. Neuroimaging scheduled.', '04 June 2026'),
  ev('med-2a', 'medication', 'Lisinopril 10mg', 'Continued.', '06 June 2026'),
  ev('med-3a', 'medication', 'Metformin 500mg', 'Glycemic support, with meals.', '08 June 2026'),
  ev('med-3b', 'medication', 'Metformin 500mg', 'Glycemic support, with meals.', '09 June 2026'),
  ev('lab-1a', 'lab', 'Metabolic Panel', 'Fasting glycemia 83 mg/dL; electrolytes normal.', '15 June 2026'),
  ev('lab-1b', 'lab', 'Metabolic Panel', 'Renal profile within normative intervals.', '16 June 2026'),
  ev('mri-1', 'imaging', 'MRI Study (3.0T)', 'Axial T1/T2 FLAIR. Ventricular symmetry preserved. No mass effect or acute hematoma.', '18 June 2026'),
  ev('visit-3', 'visit', 'Ambulatory Review', 'Stable recovery trajectory; therapy and cognitive rest adherence reviewed.', '02 August 2026'),
  ev('lab-2', 'lab', 'CBC Panel', 'Complete blood count, all lines within range.', '05 August 2026'),
  ev('lab-3a', 'lab', 'Lipid Profile', 'Serial lipid monitoring.', '05 August 2026'),
  ev('lab-3b', 'lab', 'Lipid Profile', 'Serial lipid monitoring.', '06 August 2026'),
  ev('lab-3c', 'lab', 'Lipid Profile', 'Serial lipid monitoring.', '07 August 2026'),
  ev('lab-3d', 'lab', 'Lipid Profile', 'Serial lipid monitoring.', '08 August 2026'),
  ev('lab-3e', 'lab', 'Lipid Profile', 'Serial lipid monitoring.', '09 August 2026'),
  ev('lab-3f', 'lab', 'Lipid Profile', 'Serial lipid monitoring.', '10 August 2026'),
  ev('visit-4', 'visit', 'Care Coordination', 'Finalizing ambulatory plan; cleared for gradual return to activity.', '24 August 2026'),
  ev('lab-4', 'lab', 'Follow-Up Panel', 'Endocrine & metabolic follow-up; values stable.', '07 September 2026'),
];

/* ---- small inline glyph components (house style, 16px grid) ---- */
function DocGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M10 2v3h3M6 8.5h5M6 11.5h4" />
    </svg>
  );
}
function PillGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 3a3.5 3.5 0 015 5L7 13a3.5 3.5 0 01-5-5L7 3z" />
      <line x1="4.5" y1="6.5" x2="9.5" y2="11.5" />
    </svg>
  );
}
function FlaskGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h4M7 2v3.5L3 13a1 1 0 001 1h8a1 1 0 001-1L9 5.5V2M4.5 10.5h7" />
    </svg>
  );
}

const AXIS_Y = 52;

interface PopoverTarget {
  id: string;
  kind: CareEvent['kind'] | 'overflow' | 'milestone' | 'metric';
  label: string;
  summary?: string;
  occurredAt?: string;
  createdBy?: string;
  source?: string;
  count?: number;
  events?: CareEvent[];
  anchor: { x: number; y: number };
}

export function InteractiveTimeline({
  careEvents,
  onAddEntry,
  activeFilters = ['Office Visits', 'Medications', 'Labs', 'Procedures', 'Hospitalizations', 'Imaging'],
  onNavigateToTab,
}: InteractiveTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePopover, setActivePopover] = useState<PopoverTarget | null>(null);
  const [dragCap, setDragCap] = useState<'left' | 'right' | 'move' | null>(null);
  const [lensMode, setLensMode] = useState<'L2' | 'L3'>('L2');

  const allowedKinds = new Set(activeFilters.flatMap((f) => filterMap[f] || []));
  const isVisible = (k: CareEvent['kind']) => allowedKinds.size === 0 || allowedKinds.has(k);
  const source = careEvents;
  const events = source.filter((e) => isVisible(e.kind));

  const allDates = events.map((e) => parseDate(e.occurredAt).getTime());
  const fullMin = allDates.length ? new Date(Math.min(...allDates)) : new Date();
  const fullMax = allDates.length ? new Date(Math.max(...allDates)) : new Date(Date.now() + DAY);
  fullMax.setDate(fullMax.getDate() + 21);

  const DEFAULT_SPAN = 150 * DAY;
  const defaultStart = () => new Date(Math.max(fullMin.getTime(), fullMax.getTime() - DEFAULT_SPAN));
  const [viewStart, setViewStart] = useState<Date>(defaultStart);
  const [viewEnd, setViewEnd] = useState<Date>(fullMax);

  const boundsKey = allDates.length ? `${Math.min(...allDates)}|${Math.max(...allDates)}` : 'empty';
  useEffect(() => {
    setViewStart(defaultStart());
    setViewEnd(fullMax);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey]);

  if (careEvents.length === 0) {
    return (
      <div className="relative w-full rounded-[22px] bg-white border border-[var(--color-border-grid)] p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
        <div className="w-10 h-10 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center text-[var(--color-ink-muted)] mb-2 shadow-xs">
          <Calendar className="w-5 h-5 text-[var(--color-ink-muted)]" />
        </div>
        <h4 className="text-sm font-bold text-[var(--color-ink)]">No Care Timeline Events Yet</h4>
        <p className="text-xs text-[var(--color-ink-muted)] max-w-md mt-1 leading-relaxed">
          Events will appear automatically along this timeline as visits, medications, labs, and vitals are recorded for this patient.
        </p>
        {onAddEntry && (
          <button
            type="button"
            onClick={onAddEntry}
            className="mt-3 px-3.5 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            + Add First Entry
          </button>
        )}
      </div>
    );
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const xScale = d3.scaleTime().domain([viewStart, viewEnd]).range([36, Math.max(width - 70, 72)]);
  const tx = (d: Date) => xScale(d);

  const clampView = useCallback((s: number, e: number) => {
    const lo = fullMin.getTime() - 30 * DAY;
    const hi = fullMax.getTime() + 15 * DAY;
    let span = Math.min(e - s, hi - lo);
    span = Math.max(5 * DAY, span);
    let ns = s, ne = s + span;
    if (ns < lo) { ns = lo; ne = lo + span; }
    if (ne > hi) { ne = hi; ns = hi - span; }
    setViewStart(new Date(ns));
    setViewEnd(new Date(ne));
  }, [boundsKey]);

  const zoomSimple = (factor: number) => {
    const mid = (viewStart.getTime() + viewEnd.getTime()) / 2;
    const span = (viewEnd.getTime() - viewStart.getTime()) / factor;
    clampView(mid - span / 2, mid + span / 2);
  };

  /* wheel zoom on canvas */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const factor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
      const anchor = xScale.invert(px).getTime();
      const s = viewStart.getTime(), en = viewEnd.getTime();
      clampView(anchor - (anchor - s) / factor, anchor + (en - anchor) / factor);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewStart, viewEnd, width]);

  /* drag to pan on canvas */
  const panFrom = useRef<{ x: number; s: number; e: number } | null>(null);
  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,a,[role="button"],[role="dialog"]')) return;
    if (activePopover) {
      setActivePopover(null);
      setSelectedId(null);
    }
    panFrom.current = { x: e.clientX, s: viewStart.getTime(), e: viewEnd.getTime() };
    const onMove = (ev2: PointerEvent) => {
      const p = panFrom.current;
      if (!p) return;
      const msPerPx = (p.e - p.s) / Math.max(width - 110, 1);
      const shift = -(ev2.clientX - p.x) * msPerPx;
      clampView(p.s + shift, p.e + shift);
    };
    const onUp = () => {
      panFrom.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* keyboard dismissal */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') zoomSimple(1.5);
      if (e.key === '-') zoomSimple(1 / 1.5);
      if (e.key === 'Escape') {
        setSelectedId(null);
        setActivePopover(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewStart, viewEnd]);

  /* Click-to-open popover handler */
  const handleItemClick = (target: PopoverTarget) => {
    if (activePopover?.id === target.id) {
      setActivePopover(null);
      setSelectedId(null);
    } else {
      setActivePopover(target);
      setSelectedId(target.id);
    }
  };

  /* Outside click listener to dismiss active popover */
  useEffect(() => {
    const handleDocumentClick = (e: PointerEvent) => {
      if (!activePopover) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest('[role="dialog"]') ||
        target.closest('[role="button"]') ||
        target.closest('.cursor-pointer') ||
        target.closest('button')
      ) {
        return;
      }
      setActivePopover(null);
      setSelectedId(null);
    };
    document.addEventListener('pointerdown', handleDocumentClick);
    return () => document.removeEventListener('pointerdown', handleDocumentClick);
  }, [activePopover]);

  const nodeD = lensMode === 'L3' ? 36 : 44;

  /* milestones on axis */
  const milestones = events.filter((e) => e.kind === 'visit');
  const milestoneClusters = (() => {
    interface Cluster { items: CareEvent[]; cx: number; t0: number; t1: number }
    const out: Cluster[] = [];
    for (const m of milestones) {
      const x = tx(parseDate(m.occurredAt));
      const t = parseDate(m.occurredAt).getTime();
      const last = out[out.length - 1];
      if (last && x - last.cx < nodeD * 1.2) {
        last.items.push(m);
        last.t1 = Math.max(last.t1, t);
        last.cx = (last.cx * (last.items.length - 1) + x) / last.items.length;
      } else {
        out.push({ items: [m], cx: x, t0: t, t1: t });
      }
    }
    return out;
  })();
  const clusterOfMilestone = new Map(milestoneClusters.flatMap((cl) => cl.items.map((m) => [m.id, cl] as const)));

  const orphans: CareEvent[] = [];
  const childrenByMilestone = new Map<string, CareEvent[]>();
  events
    .filter((e) => e.kind !== 'visit')
    .forEach((e) => {
      const t = parseDate(e.occurredAt).getTime();
      let parent: CareEvent | null = null;
      if (e.visitId) {
        parent = milestones.find((m) => m.id === e.visitId) || null;
      }
      if (!parent) {
        for (const m of milestones) {
          const mt = parseDate(m.occurredAt).getTime();
          if (mt <= t && t - mt <= 14 * DAY && (!parent || mt > parseDate(parent.occurredAt).getTime())) {
            parent = m;
          }
        }
      }
      if (parent) {
        const arr = childrenByMilestone.get(parent.id) || [];
        arr.push(e);
        childrenByMilestone.set(parent.id, arr);
      } else {
        orphans.push(e);
      }
    });

  interface ChildNode {
    id: string;
    label: string;
    kind: CareEvent['kind'];
    date: Date;
    count: number;
    ids: string[];
    lane: number;
    parent: string;
    events: CareEvent[];
  }
  const childNodes: ChildNode[] = [];
  milestones.forEach((m) => {
    const groups = new Map<string, CareEvent[]>();
    (childrenByMilestone.get(m.id) || []).forEach((e) => {
      const key = `${e.kind}::${e.label}`;
      groups.set(key, [...(groups.get(key) || []), e]);
    });
    let li = 0;
    groups.forEach((arr) => {
      const first = arr[0];
      childNodes.push({
        id: first.id,
        label: first.label,
        kind: first.kind,
        date: parseDate(first.occurredAt),
        count: arr.length,
        ids: arr.map((a) => a.id),
        lane: li++,
        parent: m.id,
        events: arr,
      });
    });
  });

  const orphanGroups = new Map<string, CareEvent[]>();
  orphans.forEach((e) => {
    const key = `${e.kind}::${e.label}`;
    orphanGroups.set(key, [...(orphanGroups.get(key) || []), e]);
  });
  let orphanLi = 0;
  orphanGroups.forEach((arr) => {
    const first = arr[0];
    childNodes.push({
      id: first.id,
      label: first.label,
      kind: first.kind,
      date: parseDate(first.occurredAt),
      count: arr.length,
      ids: arr.map((a) => a.id),
      lane: orphanLi++,
      parent: 'axis',
      events: arr,
    });
  });

  /* ---- PACK §7.3 Non-colliding layout engine ---- */
  const MAX_LABEL_W = 108;
  const MAX_LANES = 3;
  const labelW = (label: string) => Math.min(MAX_LABEL_W, Math.max(34, label.length * 6.5));

  interface PlacedItem {
    c: ChildNode;
    x: number;
    y: number;
    isImg: boolean;
    flip: boolean;
    fp: [number, number];
    h: number;
    lane: number;
  }

  interface OverflowItem {
    id: string;
    parent: string;
    count: number;
    events: CareEvent[];
    x: number;
    y: number;
    lane: number;
    flip: boolean;
  }

  const laid = (() => {
    const parentX = new Map(
      milestones.map((m) => {
        const cl = clusterOfMilestone.get(m.id);
        return [m.id, cl ? cl.cx : tx(parseDate(m.occurredAt))] as const;
      })
    );

    const childrenByParent = new Map<string, ChildNode[]>();
    for (const c of childNodes) {
      const arr = childrenByParent.get(c.parent) || [];
      arr.push(c);
      childrenByParent.set(c.parent, arr);
    }

    const placed: PlacedItem[] = [];
    const laneSpans: Array<Array<[number, number]>> = [];
    const laneHeights: number[] = [];
    const overflowItems: OverflowItem[] = [];

    const fitsInLane = (laneIdx: number, span: [number, number]) => {
      if (laneIdx >= laneSpans.length) return true;
      return laneSpans[laneIdx].every(([l, r]) => span[1] < l - 14 || span[0] > r + 14);
    };

    const addToLane = (laneIdx: number, span: [number, number], h: number) => {
      while (laneSpans.length <= laneIdx) {
        laneSpans.push([]);
        laneHeights.push(0);
      }
      laneSpans[laneIdx].push(span);
      laneHeights[laneIdx] = Math.max(laneHeights[laneIdx], h);
    };

    const sortedParents = Array.from(childrenByParent.keys()).sort((a, b) => {
      const xa = a === 'axis' ? (childrenByParent.get(a)?.[0] ? tx(childrenByParent.get(a)![0].date) : 0) : (parentX.get(a) ?? 0);
      const xb = b === 'axis' ? (childrenByParent.get(b)?.[0] ? tx(childrenByParent.get(b)![0].date) : 0) : (parentX.get(b) ?? 0);
      return xa - xb;
    });

    for (const pid of sortedParents) {
      const nodes = childrenByParent.get(pid) || [];
      const isAxis = pid === 'axis';
      const px = isAxis ? (nodes[0] ? tx(nodes[0].date) : 60) : (parentX.get(pid) ?? 60);

      const maxLw = Math.max(...nodes.map((n) => labelW(n.label)), 60);
      const flip = px + 24 + maxLw + 32 > width - 16 && px - 24 - maxLw - 32 > 16;
      const childX = flip ? px - 24 : px + 24;

      let milestoneLastLane = -1;
      const overflowEvents: CareEvent[] = [];

      for (let idx = 0; idx < nodes.length; idx++) {
        const c = nodes[idx];
        const isImg = c.kind === 'imaging';
        const lw = labelW(c.label);
        const h = isImg ? 158 : 34;

        const fp: [number, number] = isImg
          ? [childX - 76, childX + 76]
          : flip
          ? [childX - lw - 26, childX + 18]
          : [childX - 18, childX + lw + 26];

        let targetLane = milestoneLastLane + 1;
        while (targetLane < MAX_LANES && !fitsInLane(targetLane, fp)) {
          targetLane++;
        }

        if (targetLane < MAX_LANES) {
          addToLane(targetLane, fp, h);
          milestoneLastLane = targetLane;
          placed.push({
            c,
            x: Math.round(childX),
            y: 0,
            isImg,
            flip,
            fp,
            h,
            lane: targetLane,
          });
        } else {
          overflowEvents.push(...c.events);
        }
      }

      if (overflowEvents.length > 0) {
        const ovLane = Math.min(milestoneLastLane + 1, MAX_LANES);
        const ovSpan: [number, number] = flip ? [childX - 74, childX + 10] : [childX - 10, childX + 74];
        addToLane(ovLane, ovSpan, 30);
        overflowItems.push({
          id: `ov-${pid}`,
          parent: pid,
          count: overflowEvents.length,
          events: overflowEvents,
          x: Math.round(childX),
          y: 0,
          lane: ovLane,
          flip,
        });
      }
    }

    const laneTops: number[] = [];
    let curY = 96;
    for (let i = 0; i < laneSpans.length; i++) {
      laneTops.push(curY);
      curY += (laneHeights[i] || 34) + 18;
    }

    const pos = new Map<string, { x: number; y: number; flip: boolean }>();
    for (const p of placed) {
      p.y = laneTops[p.lane] ?? 96;
      pos.set(p.c.id, { x: p.x, y: p.y, flip: p.flip });
    }

    for (const ov of overflowItems) {
      ov.y = (laneTops[ov.lane] ?? curY) + 4;
    }

    const canvasH = Math.max(
      265,
      (laneTops.length ? laneTops[laneTops.length - 1] + (laneHeights[laneHeights.length - 1] || 34) : 130) + 44
    );

    return { pos, placed, overflowItems, canvasH, laneTops };
  })();

  /* density buckets on axis (weekly) */
  const weeks = d3.timeWeeks(viewStart, viewEnd);
  const weekCount = weeks.map((w) => events.filter((e) => { const t = +parseDate(e.occurredAt); return t >= +w && t < +d3.timeWeek.offset(w, 1); }).length);

  const daysSpan = (viewEnd.getTime() - viewStart.getTime()) / DAY;
  const isL3 = lensMode === 'L3';
  const showChildren = !isL3 && daysSpan <= 420;
  const viewMonths = d3.timeMonths(viewStart, viewEnd);
  const actualCanvasH = isL3 ? Math.max(460, laid.canvasH + 160) : laid.canvasH;

  /* scrubber geometry */
  const totalSpan = Math.max(fullMax.getTime() - fullMin.getTime(), DAY);
  const winPctLeft = ((viewStart.getTime() - fullMin.getTime()) / totalSpan) * 100;
  const winPctWidth = ((viewEnd.getTime() - viewStart.getTime()) / totalSpan) * 100;
  const scrubMonths = d3.timeMonths(fullMin, fullMax);
  const scrubWeeks = d3.timeWeeks(fullMin, fullMax);
  const scrubWeekCount = scrubWeeks.map((w) => events.filter((e) => +parseDate(e.occurredAt) >= +w && +parseDate(e.occurredAt) < +d3.timeWeek.offset(w, 1)).length);

  const onScrubPointerDown = (mode: 'move' | 'left' | 'right') => (e: React.PointerEvent) => {
    e.stopPropagation();
    setDragCap(mode);
    const startX = e.clientX;
    const s0 = viewStart.getTime();
    const e0 = viewEnd.getTime();
    const onMove = (ev2: PointerEvent) => {
      const rect = scrubberRef.current?.getBoundingClientRect();
      if (!rect) return;
      const msPerPx = totalSpan / rect.width;
      const dx = (ev2.clientX - startX) * msPerPx;
      if (mode === 'move') {
        clampView(s0 + dx, e0 + dx);
      } else if (mode === 'left') {
        const ns = Math.min(s0 + dx, e0 - 5 * DAY);
        setViewStart(new Date(Math.max(ns, fullMin.getTime() - 60 * DAY)));
      } else {
        const ne = Math.max(e0 + dx, s0 + 5 * DAY);
        setViewEnd(new Date(Math.min(ne, fullMax.getTime() + 60 * DAY)));
      }
    };
    const onUp = () => {
      setDragCap(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* Popover positioning computation */
  const popoverPosition = (() => {
    if (!activePopover) return { left: 0, top: 0 };
    const cardW = 320;
    const cardH = 210;

    let left = activePopover.anchor.x - cardW / 2;
    if (left < 16) left = 16;
    if (left + cardW > width - 16) left = width - cardW - 16;

    let top: number;
    if (activePopover.anchor.y + 36 + cardH <= actualCanvasH - 12) {
      top = activePopover.anchor.y + 30;
    } else if (activePopover.anchor.y - cardH - 14 >= 12) {
      top = activePopover.anchor.y - cardH - 10;
    } else {
      top = Math.max(12, Math.min(actualCanvasH - cardH - 12, activePopover.anchor.y - cardH / 2));
    }

    return { left, top };
  })();

  const getTargetTab = (kind: PopoverTarget['kind']): string | null => {
    if (kind === 'medication') return 'Medications';
    if (kind === 'lab') return 'Labs';
    if (kind === 'visit' || kind === 'milestone') return 'Visits';
    if (kind === 'imaging') return 'Imaging';
    return null;
  };

  return (
    <div className="w-full relative">
      {/* header row: zoom + range readout + Lens toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => zoomSimple(1 / 1.5)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs font-bold" title="Zoom out">&minus;</button>
          <button type="button" onClick={() => zoomSimple(1.5)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs font-bold" title="Zoom in">+</button>
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)] ml-1">
            {d3.timeFormat('%d %b')(viewStart)} &rarr; {d3.timeFormat('%d %b %Y')(viewEnd)} &middot; {events.length} events
          </span>
        </div>

        {/* Lens Mode Toggle Pills */}
        <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-full text-[10.5px]">
          <button
            type="button"
            onClick={() => {
              setLensMode('L2');
              const mid = (viewStart.getTime() + viewEnd.getTime()) / 2;
              clampView(mid - 75 * DAY, mid + 75 * DAY);
            }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition-all ${!isL3 ? 'bg-white shadow-xs text-[var(--color-ink)] font-bold' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'}`}
          >
            L2 Overview
          </button>
          <button
            type="button"
            onClick={() => {
              setLensMode('L3');
              const mid = (viewStart.getTime() + viewEnd.getTime()) / 2;
              clampView(mid - 15 * DAY, mid + 15 * DAY);
            }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition-all ${isL3 ? 'bg-[var(--color-ink)] text-white shadow-xs font-bold' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'}`}
          >
            L3 Deep Dive
          </button>
        </div>
      </div>

      {/* ===================== TIMELINE CANVAS ===================== */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-[24px] bg-[var(--color-surface-subtle)] ${dragCap ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ height: actualCanvasH }}
        onPointerDown={onCanvasPointerDown}
        role="region"
        aria-label="Care timeline"
      >
        {/* axis, extended past both edges */}
        <div className="absolute h-[1.5px] bg-[var(--color-axis-line)]" style={{ top: AXIS_Y, left: -40, right: -40 }} />

        {/* month hairlines */}
        {d3.timeMonths(viewStart, viewEnd).map((m: Date, i: number) => (
          <div key={i} className="absolute w-px top-0 bottom-0" style={{ left: tx(m), background: 'var(--color-border-hairline)', opacity: 0.55 }} />
        ))}

        {/* Soft, smooth, curvy wires connecting milestones / axis to child nodes and overflow chips */}
        {showChildren && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
            {childNodes.map((c) => {
              const p = laid.pos.get(c.id);
              if (!p) return null;
              let mx = p.x;
              let my = AXIS_Y;
              if (c.parent !== 'axis') {
                const pm = milestones.find((m) => m.id === c.parent);
                if (!pm) return null;
                const cl = clusterOfMilestone.get(pm.id);
                mx = cl ? cl.cx : tx(parseDate(pm.occurredAt));
                my = AXIS_Y + nodeD / 2;
              }
              const cx = p.x;
              const nodeTop = p.y + (c.kind === 'imaging' ? 2 : 16);

              return (
                <path
                  key={`c-${c.id}`}
                  d={`M ${mx} ${my} C ${mx} ${(my + nodeTop) / 2}, ${cx} ${(my + nodeTop) / 2}, ${cx} ${nodeTop}`}
                  stroke="var(--color-border-hairline)"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeDasharray={c.parent === 'axis' ? '2 2' : undefined}
                />
              );
            })}

            {/* Curvy wires connecting milestones to overflow "+N more" items */}
            {laid.overflowItems.map((ov) => {
              const pm = milestones.find((m) => m.id === ov.parent);
              if (!pm) return null;
              const cl = clusterOfMilestone.get(pm.id);
              const mx = cl ? cl.cx : tx(parseDate(pm.occurredAt));
              const my = AXIS_Y + nodeD / 2;
              const cx = ov.x;
              const nodeTop = ov.y + 12;

              return (
                <path
                  key={`ov-conn-${ov.id}`}
                  d={`M ${mx} ${my} C ${mx} ${(my + nodeTop) / 2}, ${cx} ${(my + nodeTop) / 2}, ${cx} ${nodeTop}`}
                  stroke="var(--color-border-hairline)"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        )}

        {/* axis anchor marks for standalone/orphan nodes */}
        {showChildren && childNodes.filter((c) => c.parent === 'axis').map((c) => {
          const p = laid.pos.get(c.id);
          if (!p) return null;
          return (
            <div
              key={`anchor-${c.id}`}
              className="absolute w-2 h-2 rounded-full bg-[var(--color-ink-muted)] -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: p.x, top: AXIS_Y }}
            />
          );
        })}

        {/* weekly density dots on the axis */}
        {weeks.map((w, i) => weekCount[i] > 0 ? (
          <div
            key={i}
            className="absolute rounded-full bg-[var(--color-ink-muted)]"
            style={{
              left: tx(d3.timeWeek.offset(w, 0.5)),
              top: AXIS_Y - (5 + Math.min(weekCount[i], 6)) / 2,
              width: 5 + Math.min(weekCount[i], 6),
              height: 5 + Math.min(weekCount[i], 6),
              transform: 'translateX(-50%)',
              opacity: 0.7,
            }}
          />
        ) : null)}

        {/* orphan dots on the axis */}
        {orphans.map((e) => (
          <div
            key={e.id}
            className="absolute w-2.5 h-2.5 rounded-full bg-[var(--color-ink-muted)] cursor-pointer hover:scale-150 transition-transform"
            style={{ left: tx(parseDate(e.occurredAt)), top: AXIS_Y - 5, transform: 'translateX(-50%)' }}
            title={e.label}
            onClick={() => handleItemClick({
              id: e.id,
              kind: e.kind,
              label: e.label,
              summary: e.summary,
              occurredAt: e.occurredAt,
              createdBy: e.createdBy,
              source: e.source,
              anchor: { x: tx(parseDate(e.occurredAt)), y: AXIS_Y },
            })}
          />
        ))}

        {/* milestones: neon circles with document glyph, ON the axis */}
        {milestoneClusters.map((cl, ci) => {
          const single = cl.items.length === 1 ? cl.items[0] : null;
          const isSelected = single ? selectedId === single.id : false;
          const zoom = () => clampView(cl.t0 - 15 * DAY, cl.t1 + 15 * DAY);

          const milestoneTarget: PopoverTarget | null = single
            ? {
                id: single.id,
                kind: 'milestone',
                label: single.label,
                summary: single.summary,
                occurredAt: single.occurredAt,
                createdBy: single.createdBy,
                source: single.source,
                anchor: { x: cl.cx, y: AXIS_Y },
              }
            : null;

          return (
            <motion.div
              key={`mc-${ci}`}
              whileHover={{ scale: 1.08 }}
              className="absolute -translate-x-1/2 cursor-pointer z-20 focus:outline-none rounded-full"
              style={{ left: cl.cx, top: AXIS_Y - nodeD / 2 }}
              tabIndex={0}
              role="button"
              aria-label={single ? single.label : `${cl.items.length} visits — click to zoom in`}
              onClick={() => {
                if (single && milestoneTarget) {
                  handleItemClick(milestoneTarget);
                } else {
                  zoom();
                }
              }}
              onDoubleClick={zoom}
            >
              <div
                className={`relative rounded-full bg-[var(--color-accent-neon)] flex items-center justify-center shadow-md transition-all ${isSelected ? 'ring-4 ring-[var(--color-accent-neon)]/40 ring-offset-2 ring-offset-[var(--color-surface-subtle)]' : ''}`}
                style={{ width: nodeD, height: nodeD }}
              >
                <div className="text-[var(--color-ink)]" style={{ width: nodeD * 0.52, height: nodeD * 0.52 }}>
                  <DocGlyph className="w-full h-full" />
                </div>
                {cl.items.length > 1 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-ink)] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {cl.items.length}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* L3 Lens: Milestone Expansion Containers */}
        {isL3 && milestones.map((m) => {
          const cx = tx(parseDate(m.occurredAt));
          const stackWidth = Math.min(Math.max(width * 0.52, 420), 540);
          const leftPos = Math.max(16, Math.min(cx - stackWidth / 2, width - stackWidth - 16));

          const visitMeds = events.filter((e) => e.kind === 'medication' && (e.visitId === m.id || Math.abs(parseDate(e.occurredAt).getTime() - parseDate(m.occurredAt).getTime()) <= 14 * DAY));
          const prevM = milestones.filter((pm) => parseDate(pm.occurredAt) < parseDate(m.occurredAt)).pop();
          const daysSincePrev = prevM ? Math.round((parseDate(m.occurredAt).getTime() - parseDate(prevM.occurredAt).getTime()) / DAY) : null;
          const intervalLabel = daysSincePrev ? `${daysSincePrev} days since previous visit` : 'Initial visit encounter';

          return (
            <motion.div
              key={`l3-milestone-${m.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className="absolute z-20 flex flex-col items-center"
              style={{ left: leftPos, top: AXIS_Y + nodeD / 2 + 10, width: stackWidth }}
            >
              <div className="flex flex-col items-center mb-2.5 text-center">
                <span className="text-xs font-bold text-[var(--color-ink)] tracking-tight">
                  {d3.timeFormat('%d %B %Y')(parseDate(m.occurredAt))} &middot; {m.label}
                </span>
                <span className="text-[10px] font-medium text-[var(--color-ink-muted)]">
                  {intervalLabel}
                </span>
              </div>

              <div className="w-full flex flex-wrap md:flex-nowrap items-stretch justify-center gap-3 bg-white/95 backdrop-blur-xs p-3 rounded-[20px] border border-[var(--color-border-hairline)] shadow-sm">
                <div className="flex flex-col gap-2 min-w-[190px] flex-1 justify-center">
                  <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                      Regimen & Medications
                    </span>
                    <span className="text-[9.5px] font-semibold text-[var(--color-ink)]">
                      {visitMeds.length || 2} active
                    </span>
                  </div>
                  {visitMeds.length > 0 ? (
                    visitMeds.map((med) => (
                      <MedicationChip
                        key={med.id}
                        name={med.label}
                        dosage="Oral"
                        dosesPerDay={med.label.includes('×2') ? 2 : 1}
                        onClick={() => handleItemClick({
                          id: med.id,
                          kind: 'medication',
                          label: med.label,
                          summary: med.summary,
                          occurredAt: med.occurredAt,
                          createdBy: med.createdBy,
                          anchor: { x: leftPos + stackWidth / 4, y: AXIS_Y + 110 },
                        })}
                      />
                    ))
                  ) : (
                    <>
                      <MedicationChip
                        name="Lisinopril"
                        dosage="10mg once daily"
                        dosesPerDay={1}
                        onClick={() => handleItemClick({
                          id: m.id,
                          kind: 'medication',
                          label: 'Lisinopril 10mg',
                          summary: 'Antihypertensive regimen.',
                          occurredAt: m.occurredAt,
                          createdBy: m.createdBy,
                          anchor: { x: leftPos + stackWidth / 4, y: AXIS_Y + 110 },
                        })}
                      />
                      <MedicationChip
                        name="Metformin"
                        dosage="500mg with meals"
                        dosesPerDay={2}
                        onClick={() => handleItemClick({
                          id: m.id,
                          kind: 'medication',
                          label: 'Metformin 500mg',
                          summary: 'Glycemic support with meals.',
                          occurredAt: m.occurredAt,
                          createdBy: m.createdBy,
                          anchor: { x: leftPos + stackWidth / 4, y: AXIS_Y + 140 },
                        })}
                      />
                    </>
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                  <MetricCard
                    title="Blood Pressure"
                    currentReading="128/82"
                    unit="mmHg"
                    periodLabel="Visit Encounter"
                    averageValue="126/80"
                    deltaValue="-6 mmHg"
                    deltaDirection="improving"
                    onExpand={() => handleItemClick({
                      id: `${m.id}-bp`,
                      kind: 'metric',
                      label: 'Blood Pressure Telemetry',
                      summary: 'Encounter reading 128/82 mmHg. Period average 126/80 mmHg with improving delta.',
                      occurredAt: m.occurredAt,
                      anchor: { x: leftPos + (stackWidth * 3) / 4, y: AXIS_Y + 110 },
                    })}
                    className="w-[210px] sm:w-[220px]"
                  />
                  <MetricCard
                    title="Fasting Glucose"
                    currentReading="104"
                    unit="mg/dL"
                    periodLabel="Glycemic Metric"
                    averageValue="110"
                    deltaValue="-12 mg/dL"
                    deltaDirection="improving"
                    onExpand={() => handleItemClick({
                      id: `${m.id}-glucose`,
                      kind: 'metric',
                      label: 'Fasting Glucose Telemetry',
                      summary: 'Encounter reading 104 mg/dL. Glycemic stability confirmed.',
                      occurredAt: m.occurredAt,
                      anchor: { x: leftPos + (stackWidth * 3) / 4, y: AXIS_Y + 110 },
                    })}
                    className="w-[210px] sm:w-[220px]"
                  />
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* L2 Child nodes: medication pills, labs, imaging card */}
        {showChildren && childNodes.map((c) => {
          const p = laid.pos.get(c.id);
          if (!p) return null;
          const x = p.x;
          const y = p.y;
          const isSelected = selectedId === c.id;
          const isImaging = c.kind === 'imaging';

          const target: PopoverTarget = {
            id: c.id,
            kind: c.kind,
            label: c.label,
            summary: c.events[0]?.summary || '',
            occurredAt: c.events[0]?.occurredAt || '',
            createdBy: c.events[0]?.createdBy || '',
            source: c.events[0]?.source || '',
            count: c.count,
            events: c.events,
            anchor: { x, y },
          };

          if (isImaging) {
            return (
              <div
                key={c.id}
                className="absolute z-20"
                style={{ left: x, top: y, transform: 'translateX(-50%)' }}
              >
                <div className="w-[1.5px] h-4 bg-[var(--color-border-hairline)] mx-auto" />
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent-neon)] mx-auto -mt-px" />
                <motion.div
                  whileHover={{ y: -3 }}
                  className="mt-1 relative w-36 h-32 rounded-[18px] overflow-hidden bg-[var(--color-ink)] cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => handleItemClick(target)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/mri-scan.jpg" alt={c.label} className="w-full h-full object-cover" draggable={false} />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-bold tracking-wide">MRI</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleItemClick(target); }}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center hover:bg-black transition-colors"
                    title="Inspect study"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </motion.div>
              </div>
            );
          }

          const Glyph = c.kind === 'medication' ? PillGlyph : FlaskGlyph;
          const accent = c.kind === 'medication';
          return (
            <div
              key={c.id}
              className="absolute z-10"
              style={{ left: p.flip ? x + 16 : x, top: y, transform: p.flip ? 'translateX(-100%)' : 'translateX(-16px)' }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`flex items-center gap-1.5 cursor-pointer py-0.5 px-1 rounded-full hover:bg-black/5 transition-colors ${p.flip ? 'flex-row-reverse' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={c.label}
                onClick={() => handleItemClick(target)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleItemClick(target); }}
              >
                <div className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${accent ? 'bg-[var(--color-accent-neon)] border-transparent text-[var(--color-ink)]' : 'bg-white border-[var(--color-border-hairline)] text-[var(--color-ink-muted)]'} ${isSelected ? 'ring-4 ring-[var(--color-accent-neon)]/40' : ''}`}>
                  <Glyph className="w-4 h-4" />
                  {c.count > 1 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-accent-neon)] border border-white text-[var(--color-ink)] text-[9px] font-bold flex items-center justify-center">
                      {c.count}
                    </span>
                  )}
                </div>
                <span className="text-[10.5px] font-semibold text-[var(--color-ink)] leading-tight truncate max-w-[108px]" title={c.label}>
                  {c.label}
                </span>
              </motion.div>
            </div>
          );
        })}

        {/* Non-overlapping "+N more" overflow indicators (rendered on their own dedicated lane) */}
        {showChildren && laid.overflowItems.map((ov) => {
          const pm = milestones.find((m) => m.id === ov.parent);
          const cl = pm ? clusterOfMilestone.get(pm.id) : null;

          const target: PopoverTarget = {
            id: ov.id,
            kind: 'overflow',
            label: `+${ov.count} more events at this visit`,
            summary: `Visit encounter includes ${ov.count} additional clinical events. Click to view breakdown or zoom into this visit.`,
            events: ov.events,
            anchor: { x: ov.x, y: ov.y },
          };

          const handleZoom = () => {
            if (cl) clampView(cl.t0 - 30 * DAY, cl.t1 + 30 * DAY);
            else if (pm) {
              const t = parseDate(pm.occurredAt).getTime();
              clampView(t - 30 * DAY, t + 30 * DAY);
            } else {
              zoomSimple(1.5);
            }
          };

          return (
            <div
              key={ov.id}
              className="absolute z-10"
              style={{
                left: ov.flip ? ov.x + 16 : ov.x,
                top: ov.y,
                transform: ov.flip ? 'translateX(-100%)' : 'translateX(-16px)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  handleItemClick(target);
                }}
                className="px-2.5 py-1 rounded-full bg-white border border-[var(--color-border-hairline)] hover:border-[var(--color-ink)] text-[10px] font-bold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs transition-all hover:scale-105 flex items-center gap-1 cursor-pointer"
                title={`+${ov.count} more events — click to view`}
              >
                <span>+{ov.count} more</span>
              </button>
            </div>
          );
        })}

        {/* end + node */}
        <button
          type="button"
          onClick={onAddEntry}
          className="absolute z-20 w-10 h-10 rounded-full bg-white border border-[var(--color-border-hairline)] flex items-center justify-center hover:bg-stone-50 transition-colors cursor-pointer"
          style={{ right: 10, top: AXIS_Y - 20 }}
          title="Add clinical event"
        >
          <Plus className="w-4 h-4 text-[var(--color-ink)]" />
        </button>

        {/* month labels along the bottom */}
        {viewMonths.map((m: Date, i: number) => (
          <span key={i} className="absolute bottom-2 text-[11px] font-medium text-[var(--color-ink-muted)]" style={{ left: tx(m) + 6 }}>
            {viewMonths.length > 8 ? d3.timeFormat(m.getMonth() === 0 ? '%b %Y' : '%b')(m) : d3.timeFormat('%B')(m)}
          </span>
        ))}

        {/* ===================== FLOATING ANCHORED DETAIL POPOVER ===================== */}
        <AnimatePresence>
          {activePopover && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 3 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 3 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute z-50 w-80 max-w-[92vw] bg-white/95 backdrop-blur-md rounded-[22px] p-4 border border-[var(--color-border-hairline)] shadow-2xl shadow-black/15 pointer-events-auto"
              style={{
                left: popoverPosition.left,
                top: popoverPosition.top,
              }}
              role="dialog"
              aria-label={activePopover.label}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    activePopover.kind === 'medication' || activePopover.kind === 'milestone' || activePopover.kind === 'visit'
                      ? 'bg-[var(--color-accent-neon)] text-[var(--color-ink)]'
                      : activePopover.kind === 'lab'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {activePopover.kind === 'medication' ? (
                      <PillGlyph className="w-3.5 h-3.5" />
                    ) : activePopover.kind === 'lab' ? (
                      <FlaskGlyph className="w-3.5 h-3.5" />
                    ) : activePopover.kind === 'overflow' ? (
                      <Layers className="w-3.5 h-3.5" />
                    ) : (
                      <DocGlyph className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                    {activePopover.kind === 'medication'
                      ? 'Prescription Regimen'
                      : activePopover.kind === 'lab'
                      ? 'Laboratory Result'
                      : activePopover.kind === 'imaging'
                      ? 'Diagnostic Imaging'
                      : activePopover.kind === 'overflow'
                      ? 'Visit Overflow'
                      : 'Clinical Encounter'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActivePopover(null);
                    setSelectedId(null);
                  }}
                  className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close details"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Title & Metadata */}
              <div className="mt-2 min-w-0">
                <h4 className="text-sm font-bold text-[var(--color-ink)] leading-snug truncate">
                  {activePopover.label}
                </h4>
                <div className="text-[11px] text-[var(--color-ink-muted)] flex items-center gap-1.5 mt-0.5">
                  {activePopover.occurredAt && <span>{activePopover.occurredAt}</span>}
                  {activePopover.occurredAt && activePopover.createdBy && <span>&middot;</span>}
                  {activePopover.createdBy && <span>{activePopover.createdBy}</span>}
                </div>
              </div>

              {/* Clinical summary explanation */}
              {activePopover.summary && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-black/5 text-xs text-[var(--color-ink)]/85 leading-relaxed">
                  {activePopover.summary}
                </div>
              )}

              {/* Grouped items list (e.g. multi-dose medications or serial lab panels) */}
              {activePopover.events && activePopover.events.length > 1 && activePopover.kind !== 'overflow' && (
                <div className="mt-2.5 pt-2 border-t border-[var(--color-border-hairline)]">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-ink-muted)] tracking-wider">
                    {activePopover.events.length} Recorded Entries:
                  </span>
                  <div className="mt-1.5 space-y-1 max-h-24 overflow-y-auto pr-1">
                    {activePopover.events.map((evItem, idx) => (
                      <div key={evItem.id || idx} className="text-[10.5px] text-[var(--color-ink-muted)] flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-neon)] shrink-0 mt-1" />
                        <div className="min-w-0">
                          <span className="font-semibold text-[var(--color-ink)]">{evItem.occurredAt}: </span>
                          <span>{evItem.summary || evItem.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overflow items breakdown */}
              {activePopover.kind === 'overflow' && activePopover.events && (
                <div className="mt-2.5 pt-2 border-t border-[var(--color-border-hairline)]">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-ink-muted)] tracking-wider">
                    Additional Events at this Visit:
                  </span>
                  <div className="mt-1.5 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {activePopover.events.map((evItem, idx) => (
                      <div key={evItem.id || idx} className="text-xs p-1.5 rounded-lg bg-[var(--color-surface-subtle)] flex items-center justify-between gap-2">
                        <span className="font-medium text-[var(--color-ink)] truncate">{evItem.label}</span>
                        <span className="text-[9.5px] uppercase font-bold text-[var(--color-ink-muted)] px-1.5 py-0.5 rounded bg-white shrink-0">{evItem.kind}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Link Footer */}
              <div className="mt-3 pt-2 border-t border-[var(--color-border-hairline)] flex items-center justify-between">
                {getTargetTab(activePopover.kind) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const tab = getTargetTab(activePopover.kind);
                      if (tab) onNavigateToTab?.(tab);
                      setActivePopover(null);
                    }}
                    className="text-xs font-bold text-[var(--color-ink)] hover:text-amber-800 flex items-center gap-1 group cursor-pointer transition-colors"
                  >
                    <span>Open in {getTargetTab(activePopover.kind)} tab</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ) : (
                  <div />
                )}
                <span className="text-[10px] text-[var(--color-ink-muted)] font-mono">
                  Esc to close
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===================== SCRUBBER (ref-2) ===================== */}
      <div className="mt-2.5 flex items-center gap-2 select-none">
        <button type="button" onClick={() => zoomSimple(1.5)} className="w-8 h-8 rounded-full bg-white border border-[var(--color-border-hairline)] flex items-center justify-center text-[var(--color-ink)] hover:bg-stone-50 shadow-xs font-bold text-base cursor-pointer" title="Zoom in">+</button>
        <button type="button" onClick={() => zoomSimple(1 / 1.5)} className="w-8 h-8 rounded-full bg-white border border-[var(--color-border-hairline)] flex items-center justify-center text-[var(--color-ink)] hover:bg-stone-50 shadow-xs font-bold text-base cursor-pointer" title="Zoom out">&minus;</button>

        <div ref={scrubberRef} className="relative flex-1 h-11 bg-white rounded-full border border-[var(--color-border-hairline)] shadow-xs px-4 flex items-center overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
            {scrubWeeks.map((w: Date, i: number) => {
              const c = scrubWeekCount[i];
              if (!c) return <div key={i} className="w-1" />;
              const dots = Math.min(c, 4);
              return (
                <div key={i} className="flex flex-col items-center gap-0.5 justify-center h-full">
                  {Array.from({ length: dots }).map((_, di) => (
                    <span key={di} className="w-1 h-1 rounded-full bg-[var(--color-ink-muted)]" style={{ opacity: 0.35 + di * 0.18 }} />
                  ))}
                </div>
              );
            })}
          </div>

          <div className="absolute inset-x-6 bottom-1 flex justify-between pointer-events-none text-[9px] font-mono text-[var(--color-ink-muted)]">
            {scrubMonths.filter((m: Date, i: number) => i % 3 === 0).map((m: Date, i: number) => (
              <span key={i}>{d3.timeFormat('%b %y')(m)}</span>
            ))}
          </div>

          <div
            className="absolute top-1 bottom-1 rounded-full bg-[var(--color-ink)] shadow-md flex items-center justify-between px-1.5 cursor-grab active:cursor-grabbing z-10"
            style={{
              left: `${Math.max(0, winPctLeft)}%`,
              width: `${Math.min(100 - winPctLeft, Math.max(winPctWidth, 4))}%`,
            }}
            onPointerDown={onScrubPointerDown('move')}
          >
            <span
              className="w-1.5 h-4 rounded-full bg-white/70 cursor-ew-resize hover:bg-white"
              onPointerDown={onScrubPointerDown('left')}
              title="Drag to change start date"
            />
            <span className="flex items-center gap-1 px-1">
              {[0, 1, 2, 3].map((k) => (
                <span key={k} className="w-[3px] h-[3px] rounded-full bg-white" style={{ opacity: 0.5 + (k % 2) * 0.5 }} />
              ))}
            </span>
            <span
              className="w-1.5 h-4 rounded-full bg-white/70 cursor-ew-resize hover:bg-white"
              onPointerDown={onScrubPointerDown('right')}
              title="Drag to change end date"
            />
          </div>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        Showing {d3.timeFormat('%d %b %Y')(viewStart)} to {d3.timeFormat('%d %b %Y')(viewEnd)}, {events.length} events
      </div>
    </div>
  );
}
