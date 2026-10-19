'use client';

/**
 * Interactive care timeline (ref-2 "zoomed-out lens").
 * - D3 owns the time scale; React renders everything (D3 never mutates React DOM).
 * - Milestones sit on the axis as neon document nodes; children hang below on curved
 *   connectors with kind icons and count badges; imaging renders as a photo card.
 * - Bottom scrubber: density dots with counts, month ticks + labels, dark window with
 *   rounded caps. Drag the window to pan, drag caps to resize the period, wheel to zoom.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { Plus, X } from 'lucide-react';
import type { CareEvent } from '@/data/types';

interface Props {
  careEvents: CareEvent[];
  onAddEntry?: () => void;
  activeFilters?: string[];
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

export function InteractiveTimeline({ careEvents, onAddEntry, activeFilters = ['Office Visits', 'Medications', 'Labs'] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragCap, setDragCap] = useState<'left' | 'right' | 'move' | null>(null);

  const allowedKinds = new Set(activeFilters.flatMap((f) => filterMap[f] || []));
  const source = careEvents.length ? careEvents : fallback;
  const events = source.filter((e) => allowedKinds.has(e.kind));

  const allDates = events.map((e) => parseDate(e.occurredAt).getTime());
  const fullMin = allDates.length ? new Date(Math.min(...allDates)) : new Date();
  const fullMax = allDates.length ? new Date(Math.max(...allDates)) : new Date(Date.now() + DAY);
  fullMax.setDate(fullMax.getDate() + 21);

  const [viewStart, setViewStart] = useState<Date>(fullMin);
  const [viewEnd, setViewEnd] = useState<Date>(fullMax);

  /* Reset the visible window only when the data's real time bounds change.
   * Keying on array identity would loop forever when the caller passes an
   * inline/default array (new identity every render). */
  const boundsKey = allDates.length ? `${Math.min(...allDates)}|${Math.max(...allDates)}` : 'empty';
  useEffect(() => {
    setViewStart(fullMin);
    setViewEnd(fullMax);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey]);

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

  const totalSpanForZoom = () => Math.max(fullMax.getTime() - fullMin.getTime(), DAY);

  const zoomSimple = (factor: number) => {
    const mid = (viewStart.getTime() + viewEnd.getTime()) / 2;
    const span = (viewEnd.getTime() - viewStart.getTime()) / factor;
    const clamped = Math.max(5 * DAY, Math.min(span, totalSpanForZoom() * 1.6));
    setViewStart(new Date(mid - clamped / 2));
    setViewEnd(new Date(mid + clamped / 2));
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
      const ns = anchor - (anchor - s) / factor;
      const ne = anchor + (en - anchor) / factor;
      if (ne - ns < 5 * DAY || ne - ns > (fullMax.getTime() - fullMin.getTime()) * 1.6) return;
      setViewStart(new Date(ns));
      setViewEnd(new Date(ne));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewStart, viewEnd, width]);

  /* drag to pan on canvas */
  const panFrom = useRef<{ x: number; s: number; e: number } | null>(null);
  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,a,[role="button"]')) return;
    panFrom.current = { x: e.clientX, s: viewStart.getTime(), e: viewEnd.getTime() };
    const onMove = (ev2: PointerEvent) => {
      const p = panFrom.current;
      if (!p) return;
      const msPerPx = (p.e - p.s) / Math.max(width - 110, 1);
      const shift = -(ev2.clientX - p.x) * msPerPx;
      setViewStart(new Date(p.s + shift));
      setViewEnd(new Date(p.e + shift));
    };
    const onUp = () => {
      panFrom.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* keyboard */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') zoomSimple(1.5);
      if (e.key === '-') zoomSimple(1 / 1.5);
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewStart, viewEnd]);

  /* ---- layout: milestones + assigned children (nearest previous milestone within 14d) ---- */
  const milestones = events.filter((e) => e.kind === 'visit').sort((a, b) => +parseDate(a.occurredAt) - +parseDate(b.occurredAt));
  const orphans: CareEvent[] = [];
  const childrenByMilestone = new Map<string, CareEvent[]>();
  events
    .filter((e) => e.kind !== 'visit')
    .forEach((e) => {
      const t = parseDate(e.occurredAt).getTime();
      let parent: CareEvent | null = null;
      for (const m of milestones) {
        const mt = parseDate(m.occurredAt).getTime();
        if (mt <= t && t - mt <= 14 * DAY && (!parent || mt > parseDate(parent.occurredAt).getTime())) parent = m;
      }
      if (parent) {
        const arr = childrenByMilestone.get(parent.id) || [];
        arr.push(e);
        childrenByMilestone.set(parent.id, arr);
      } else orphans.push(e);
    });

  /* merge same-label children into one node with count; assign a staggered lane index and parent milestone */
  interface ChildNode { id: string; label: string; kind: CareEvent['kind']; date: Date; count: number; ids: string[]; lane: number; parent: string }
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
      childNodes.push({ id: first.id, label: first.label, kind: first.kind, date: parseDate(first.occurredAt), count: arr.length, ids: arr.map((a) => a.id), lane: li++, parent: m.id });
    });
  });

  /* ---- collision-aware lane packing ----
   * Estimate each node's horizontal footprint (circle + label, or full card width
   * for imaging), sort by x, then greedily assign lanes so nothing overlaps at any
   * zoom level. Lane rows grow as needed; the canvas height follows. */
  const nodeFootprint = (c: ChildNode, x: number) => {
    if (c.kind === 'imaging') return { left: x - 74, right: x + 74, height: 156 };
    const labelW = Math.min(130, c.label.length * 6.0);
    return { left: x - 20, right: x + 20 + 6 + labelW, height: 34 };
  };
  const laid = (() => {
    const items = childNodes.map((c) => ({ c, x: tx(c.date) })).sort((a, b) => a.x - b.x);
    const laneSpans: Array<Array<[number, number]>> = [];
    const laneHeights: number[] = [];
    const laneAssign = new Map<string, number>();
    for (const { c, x } of items) {
      const fp = nodeFootprint(c, x);
      let lane = -1;
      for (let i = 0; i < laneSpans.length; i++) {
        if (laneSpans[i].every(([l, r]) => fp.right < l - 10 || fp.left > r + 10)) { lane = i; break; }
      }
      if (lane === -1) { lane = laneSpans.length; laneSpans.push([]); laneHeights.push(0); }
      laneSpans[lane].push([fp.left, fp.right]);
      laneHeights[lane] = Math.max(laneHeights[lane], fp.height);
      laneAssign.set(c.id, lane);
    }
    const laneTops: number[] = [];
    let y = 96;
    for (let i = 0; i < laneSpans.length; i++) { laneTops.push(y); y += laneHeights[i] + 18; }
    const bottom = laneTops.length ? laneTops[laneTops.length - 1] + laneHeights[laneHeights.length - 1] : 130;
    return { laneTop: (id: string) => laneTops[laneAssign.get(id) ?? 0] ?? 96, canvasH: Math.max(250, bottom + 34) };
  })();

  /* density buckets on axis (weekly) */
  const weeks = d3.timeWeeks(viewStart, viewEnd);
  const weekCount = weeks.map((w) => events.filter((e) => { const t = +parseDate(e.occurredAt); return t >= +w && t < +d3.timeWeek.offset(w, 1); }).length);

  const daysSpan = (viewEnd.getTime() - viewStart.getTime()) / DAY;
  const showChildren = daysSpan <= 420;

  /* ---- scrubber geometry ---- */
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
        setViewStart(new Date(s0 + dx));
        setViewEnd(new Date(e0 + dx));
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

  const selected = events.find((e) => e.id === selectedId);

  return (
    <div className="w-full">
      {/* header row: zoom + range readout */}
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={() => zoomSimple(1 / 1.5)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs font-bold" title="Zoom out">&minus;</button>
        <button type="button" onClick={() => zoomSimple(1.5)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs font-bold" title="Zoom in">+</button>
        <span className="text-[11px] font-mono text-[var(--color-ink-muted)] ml-1">
          {d3.timeFormat('%d %b')(viewStart)} &rarr; {d3.timeFormat('%d %b %Y')(viewEnd)} &middot; {events.length} events
        </span>
      </div>

      {/* ===================== TIMELINE CANVAS ===================== */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-[24px] bg-[var(--color-surface-subtle)] ${dragCap ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ height: laid.canvasH }}
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

        {/* connectors (behind nodes) */}
        {showChildren && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
            {childNodes.map((c) => {
              const pm = milestones.find((m) => m.id === c.parent);
              if (!pm) return null;
              const mx = tx(parseDate(pm.occurredAt));
              const cx = tx(c.date);
              const nodeTop = laid.laneTop(c.id) + (c.kind === 'imaging' ? 2 : 1);
              const my = AXIS_Y + 20;
              return (
                <path
                  key={`c-${c.id}`}
                  d={`M ${mx} ${my} C ${mx} ${my + (nodeTop - my) * 0.55}, ${cx} ${nodeTop - (nodeTop - my) * 0.55}, ${cx} ${nodeTop}`}
                  stroke="var(--color-border-hairline)"
                  strokeWidth={1.2}
                />
              );
            })}
          </svg>
        )}

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

        {/* orphan dots (no parent milestone) */}
        {orphans.map((e) => (
          <div
            key={e.id}
            className="absolute w-2 h-2 rounded-full bg-[var(--color-ink-muted)] cursor-pointer"
            style={{ left: tx(parseDate(e.occurredAt)), top: AXIS_Y - 4, transform: 'translateX(-50%)' }}
            title={e.label}
            onClick={() => setSelectedId((p) => (p === e.id ? null : e.id))}
          />
        ))}

        {/* milestones: neon circles with document glyph, ON the axis */}
        {milestones.map((m) => {
          const x = tx(parseDate(m.occurredAt));
          const sel = selectedId === m.id;
          return (
            <motion.div
              key={m.id}
              whileHover={{ scale: 1.08 }}
              className="absolute -translate-x-1/2 cursor-pointer z-20 focus:outline-none rounded-full"
              style={{ left: x, top: AXIS_Y - 20 }}
              tabIndex={0}
              role="button"
              aria-label={m.label}
              onClick={() => setSelectedId((p) => (p === m.id ? null : m.id))}
              onDoubleClick={() => {
                const t = parseDate(m.occurredAt).getTime();
                setViewStart(new Date(t - 21 * DAY));
                setViewEnd(new Date(t + 21 * DAY));
              }}
            >
              <div className={`w-10 h-10 rounded-full bg-[var(--color-accent-neon)] flex items-center justify-center shadow-md transition-all ${sel ? 'ring-4 ring-[var(--color-accent-neon)]/40 ring-offset-2 ring-offset-[var(--color-surface-subtle)]' : ''}`}>
                <DocGlyph className="w-5 h-5 text-[var(--color-ink)]" />
              </div>
            </motion.div>
          );
        })}

        {/* child nodes: medication pills, labs, imaging card */}
        {showChildren && childNodes.map((c) => {
          const x = tx(c.date);
          const y = laid.laneTop(c.id);
          const sel = selectedId === c.id;
          const isImaging = c.kind === 'imaging';

          if (isImaging) {
            return (
              <div key={c.id} className="absolute z-20" style={{ left: x, top: y, transform: 'translateX(-50%)' }}>
                <div className="w-[1.5px] h-4 bg-[var(--color-border-hairline)] mx-auto" />
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent-neon)] mx-auto -mt-px" />
                <motion.div whileHover={{ y: -3 }} className="mt-1 relative w-36 h-32 rounded-[18px] overflow-hidden bg-[var(--color-ink)] cursor-pointer" onClick={() => setSelectedId((p) => (p === c.id ? null : c.id))}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/mri-scan.jpg" alt={c.label} className="w-full h-full object-cover" draggable={false} />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-bold tracking-wide">MRI</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}
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
            <div key={c.id} className="absolute z-10" style={{ left: x, top: y, transform: 'translateX(-16px)' }}>
              <motion.div
                whileHover={{ scale: 1.06 }}
                className="flex items-center gap-1.5 cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={c.label}
                onClick={() => setSelectedId((p) => (p === c.id ? null : c.id))}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId((p) => (p === c.id ? null : c.id)); }}
              >
                <div className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${accent ? 'bg-[var(--color-accent-neon)] border-transparent text-[var(--color-ink)]' : 'bg-white border-[var(--color-border-hairline)] text-[var(--color-ink-muted)]'} ${sel ? 'ring-4 ring-[var(--color-accent-neon)]/40' : ''}`}>
                  <Glyph className="w-4 h-4" />
                  {c.count > 1 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-accent-neon)] border border-white text-[var(--color-ink)] text-[9px] font-bold flex items-center justify-center">
                      {c.count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-[var(--color-ink)] leading-tight whitespace-nowrap max-w-[92px]">
                  {c.label}
                </span>
              </motion.div>
            </div>
          );
        })}

        {/* end + node */}
        <button
          type="button"
          onClick={onAddEntry}
          className="absolute z-20 w-10 h-10 rounded-full bg-white border border-[var(--color-border-hairline)] flex items-center justify-center hover:bg-stone-50 transition-colors"
          style={{ right: 10, top: AXIS_Y - 20 }}
          title="Add clinical event"
        >
          <Plus className="w-4 h-4 text-[var(--color-ink)]" />
        </button>

        {/* month labels along the bottom */}
        {d3.timeMonths(viewStart, viewEnd).map((m: Date, i: number) => (
          <span key={i} className="absolute bottom-2 text-[11px] font-medium text-[var(--color-ink-muted)]" style={{ left: tx(m) + 6 }}>
            {d3.timeFormat('%B')(m)}
          </span>
        ))}
      </div>

      {/* ===================== SCRUBBER ===================== */}
      <div className="mt-3 flex items-center gap-2.5">
        <button type="button" onClick={() => zoomSimple(1 / 1.5)} className="w-8 h-8 shrink-0 rounded-full bg-white border border-[var(--color-border-hairline)] flex items-center justify-center text-[var(--color-ink)] font-bold" title="Zoom out">&minus;</button>
        <button type="button" onClick={() => zoomSimple(1.5)} className="w-8 h-8 shrink-0 rounded-full bg-white border border-[var(--color-border-hairline)] flex items-center justify-center text-[var(--color-ink)] font-bold" title="Zoom in">+</button>

        <div
          ref={scrubberRef}
          className="relative flex-1 h-11 bg-[var(--color-surface-subtle)] rounded-full border border-[var(--color-border-hairline)] select-none overflow-hidden"
        >
          {/* month ticks */}
          {scrubMonths.map((m, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-[var(--color-border-hairline)]" style={{ left: `${((+m - +fullMin) / totalSpan) * 100}%` }} />
          ))}

          {/* weekly density dots + counts */}
          {scrubWeeks.map((w, i) => scrubWeekCount[i] > 0 ? (
            <div key={i} className="absolute top-1.5 flex flex-col items-center pointer-events-none" style={{ left: `${((+d3.timeWeek.offset(w, 0.5) - +fullMin) / totalSpan) * 100}%`, transform: 'translateX(-50%)' }}>
              <span className="text-[8px] leading-none text-[var(--color-ink-muted)] font-medium">{scrubWeekCount[i]}</span>
              <span className="mt-0.5 rounded-full bg-[var(--color-ink-muted)]" style={{ width: 3 + Math.min(scrubWeekCount[i], 4), height: 3 + Math.min(scrubWeekCount[i], 4) }} />
            </div>
          ) : null)}

          {/* month labels */}
          {scrubMonths.map((m, i) => (
            <span key={i} className="absolute bottom-1 text-[9px] font-medium text-[var(--color-ink-muted)] pointer-events-none" style={{ left: `${((+m - +fullMin) / totalSpan) * 100}%`, marginLeft: 4 }}>
              {d3.timeFormat('%b')(m)}
            </span>
          ))}

          {/* dark visible-period window with rounded caps */}
          <div
            className="absolute top-1 bottom-1 rounded-full bg-[var(--color-ink)] flex items-center justify-between px-1.5 shadow-md"
            style={{ left: `${Math.max(0, Math.min(98, winPctLeft))}%`, width: `${Math.max(2, Math.min(100 - winPctLeft, winPctWidth))}%`, cursor: dragCap === 'move' ? 'grabbing' : 'grab' }}
            onPointerDown={onScrubPointerDown('move')}
            role="slider"
            aria-label="Visible period"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(winPctLeft)}
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

      {/* ===================== DETAIL DRAWER ===================== */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 w-full bg-white rounded-[20px] p-4 border border-[var(--color-border-hairline)] shadow-sm flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${selected.kind === 'visit' ? 'bg-[var(--color-accent-neon)] text-[var(--color-ink)]' : selected.kind === 'medication' ? 'bg-[var(--color-accent-neon)] text-[var(--color-ink)]' : 'bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] border border-[var(--color-border-hairline)]'}`}>
                {selected.kind === 'medication' ? <PillGlyph className="w-4 h-4" /> : selected.kind === 'lab' ? <FlaskGlyph className="w-4 h-4" /> : selected.kind === 'imaging' ? <DocGlyph className="w-4 h-4" /> : <DocGlyph className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[var(--color-ink)] truncate">{selected.label}</h4>
                <p className="text-xs text-[var(--color-ink-muted)] line-clamp-2">{selected.summary}</p>
                <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{selected.occurredAt} &middot; {selected.kind} &middot; {selected.createdBy}</span>
              </div>
            </div>
            <button type="button" onClick={() => setSelectedId(null)} className="w-7 h-7 shrink-0 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]" aria-label="Close details">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sr-only" aria-live="polite">
        Showing {d3.timeFormat('%d %b %Y')(viewStart)} to {d3.timeFormat('%d %b %Y')(viewEnd)}, {events.length} events
      </div>
    </div>
  );
}
