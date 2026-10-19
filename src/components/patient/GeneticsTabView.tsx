'use client';

/**
 * GeneticsTabView — Restrained Genomic Findings Tab (Slice S12).
 * Specification: docs/PACK.md §6.5 (Genetics) & §11 (S12), docs/design/pages.md
 * 
 * Strict Canonical Guidelines:
 * - "restrained rows: finding, source document, date. Nothing decorative. INVENTORY: rows, '+'"
 * - Restrained typography and unembellished layout.
 * - Rows: finding, source document, date, interpretation.
 * - "+ Add Finding" modal with Zod/controlled validation, writes provenance, projects to care_events.
 * - Designed empty state for baseline patients with 0 findings (e.g. p-007).
 * - Zero raw hex colors.
 */

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Plus, FileText, Calendar, User } from 'lucide-react';
import type { GeneticFinding } from '@/data/types';
import { EmptyState } from '@/components/state/EmptyState';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import { en } from '@/i18n/en';

interface GeneticsTabViewProps {
  patientId: string;
  patientName: string;
  genetics?: GeneticFinding[];
  onAddFinding?: (newFinding: {
    finding: string;
    sourceDocument?: string;
    occurredAt?: string;
    interpretation?: string;
  }) => Promise<void>;
  onShowOnTimeline?: () => void;
  className?: string;
}

export function GeneticsTabView({
  patientId,
  patientName,
  genetics = [],
  onAddFinding,
  onShowOnTimeline,
  className,
}: GeneticsTabViewProps) {
  const dict = en.genetics;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [finding, setFinding] = useState('');
  const [sourceDocument, setSourceDocument] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().split('T')[0]);
  const [interpretation, setInterpretation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setFinding('');
    setSourceDocument('');
    setOccurredAt(new Date().toISOString().split('T')[0]);
    setInterpretation('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finding.trim()) {
      setFormError('Genomic finding description is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      if (onAddFinding) {
        await onAddFinding({
          finding: finding.trim(),
          sourceDocument: sourceDocument.trim() || undefined,
          occurredAt: occurredAt || undefined,
          interpretation: interpretation.trim() || undefined,
        });
      }
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to record genetic finding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {}
    return dateStr;
  };

  return (
    <div className={clsx('w-full flex flex-col gap-5', className)} data-testid="genetics-tab-view">
      {/* ========================================================================= */}
      {/* HEADER ROW WITH ACTION BUTTONS (RESTRAINED)                               */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-[20px] bg-[var(--color-surface)] border border-black/5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-ink)]">
              {dict.title}
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] border border-black/5">
              {genetics.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-1">
            {dict.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onShowOnTimeline && (
            <button
              type="button"
              onClick={onShowOnTimeline}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-stone-50 text-[var(--color-ink)] border border-black/10 transition-colors shadow-2xs"
            >
              Timeline View
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[var(--color-ink)] hover:bg-black text-white transition-all shadow-xs cursor-pointer active:scale-95"
            data-testid="add-genetic-finding-button"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{dict.addFinding}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RESTRAINED ROWS LIST                                                      */}
      {/* ========================================================================= */}
      {genetics.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-[24px] p-8 sm:p-12 border border-black/5 shadow-xs">
          <EmptyState
            title={dict.noGenetics}
            description={dict.noGeneticsDesc}
            actionLabel={dict.addFinding}
            onAction={handleOpenAdd}
            icon={<FileText className="w-6 h-6 text-stone-500" />}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5" data-testid="genetics-list">
          {genetics.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-[16px] bg-[var(--color-surface)] border border-black/5 shadow-2xs hover:border-black/15 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              data-testid={`genetic-finding-row-${item.id}`}
            >
              <div className="flex-1 min-w-0">
                {/* Finding Title */}
                <h3 className="text-base font-bold text-[var(--color-ink)] leading-snug">
                  {item.finding}
                </h3>

                {/* Interpretation / Clinical notes */}
                {item.interpretation && (
                  <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-1.5 leading-relaxed">
                    {item.interpretation}
                  </p>
                )}

                {/* Metadata Row: Source document, date, verified */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-ink-muted)] mt-2.5 pt-2 border-t border-black/5 font-mono">
                  {item.sourceDocument && (
                    <span className="inline-flex items-center gap-1 font-sans font-medium text-[var(--color-ink)]">
                      <FileText className="w-3 h-3 text-[var(--color-ink-muted)] shrink-0" />
                      <span>{item.sourceDocument}</span>
                    </span>
                  )}
                  {item.sourceDocument && <span>•</span>}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>{formatDate(item.occurredAt)}</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-sans text-stone-600">
                    <User className="w-3 h-3 shrink-0" />
                    <span>{item.createdBy || 'Dr. Tarek'}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD GENETIC FINDING MODAL SHEET                                           */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={dict.newFindingTitle}
      >
        <p className="text-xs text-[var(--color-ink-muted)] -mt-2 mb-3">
          Patient: {patientName} ({patientId})
        </p>
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-4 text-left">
          {formError && (
            <div className="p-3 rounded-xl bg-[var(--color-status-critical)]/10 border border-[var(--color-status-critical)]/30 text-xs font-semibold text-[var(--color-ink)]">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
              {dict.finding} *
            </label>
            <input
              type="text"
              required
              value={finding}
              onChange={(e) => setFinding(e.target.value)}
              placeholder={dict.findingPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)]"
              data-testid="input-genetic-finding"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
              {dict.sourceDocument}
            </label>
            <input
              type="text"
              value={sourceDocument}
              onChange={(e) => setSourceDocument(e.target.value)}
              placeholder={dict.sourcePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)]"
              data-testid="input-genetic-source-doc"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
              {dict.date}
            </label>
            <input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)]"
              data-testid="input-genetic-date"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
              {dict.interpretation}
            </label>
            <textarea
              rows={3}
              value={interpretation}
              onChange={(e) => setInterpretation(e.target.value)}
              placeholder={dict.interpretationPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)]"
              data-testid="input-genetic-interpretation"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-black/5">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
            >
              {dict.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--color-ink)] hover:bg-black text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
              data-testid="submit-add-genetic"
            >
              {isSubmitting ? 'Saving...' : dict.saveFinding}
            </button>
          </div>
        </form>
      </OverlaySheet>
    </div>
  );
}
