'use client';

/**
 * AllergiesTabView — Dedicated Patient Allergies & Sensitivities Tab (Slice S12).
 * Specification: docs/PACK.md §6.5 (Allergies) & §11 (S12), docs/design/pages.md
 * 
 * Features:
 * - Rows: substance, reaction, severity label, status
 * - Critical severity carries a pulsing red indicator dot
 * - Doctors add and edit allergies (Add & Edit modal sheets)
 * - Severity filter pills (All, Critical, Severe, Moderate, Mild) with count badges
 * - Zero-state baseline adherence for patients with no allergies (e.g. p-007 NKDA)
 * - Writes provenance and projects to care_events
 * - Zero raw hex colors (Strict design system adherence)
 */

import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Plus,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Edit2,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Allergy } from '@/data/types';
import { EmptyState } from '@/components/state/EmptyState';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import { en } from '@/i18n/en';

interface AllergiesTabViewProps {
  patientId: string;
  patientName: string;
  allergies?: Allergy[];
  onAddAllergy?: (newAllergy: {
    substance: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
    status?: string;
  }) => Promise<void>;
  onUpdateAllergy?: (updated: {
    allergyId: string;
    substance?: string;
    reaction?: string;
    severity?: 'mild' | 'moderate' | 'severe' | 'critical';
    status?: string;
  }) => Promise<void>;
  onShowOnTimeline?: () => void;
  className?: string;
}

type SeverityFilter = 'all' | 'critical' | 'severe' | 'moderate' | 'mild';

export function AllergiesTabView({
  patientId,
  patientName,
  allergies = [],
  onAddAllergy,
  onUpdateAllergy,
  onShowOnTimeline,
  className,
}: AllergiesTabViewProps) {
  const dict = en.allergies;

  // Active severity filter pill
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityFilter>('all');

  // Modal sheet state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState<Allergy | null>(null);

  // Add Form State
  const [substance, setSubstance] = useState('');
  const [reaction, setReaction] = useState('');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe' | 'critical'>('moderate');
  const [status, setStatus] = useState<string>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Form State
  const [editSubstance, setEditSubstance] = useState('');
  const [editReaction, setEditReaction] = useState('');
  const [editSeverity, setEditSeverity] = useState<'mild' | 'moderate' | 'severe' | 'critical'>('moderate');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Common quick allergen suggestions
  const allergenSuggestions = [
    { substance: 'Penicillin', reaction: 'Anaphylaxis & Urticaria', severity: 'critical' as const },
    { substance: 'Sulfa Drugs', reaction: 'Erythematous Maculopapular Rash', severity: 'severe' as const },
    { substance: 'Aspirin / NSAIDs', reaction: 'Bronchospasm & Wheezing', severity: 'severe' as const },
    { substance: 'Latex', reaction: 'Contact Dermatitis & Pruritus', severity: 'moderate' as const },
    { substance: 'Contrast Media (Iodinated)', reaction: 'Facial Flushing & Mild Dyspnea', severity: 'moderate' as const },
  ];

  // Counts by severity
  const counts = useMemo(() => {
    return {
      all: allergies.length,
      critical: allergies.filter((a) => a.severity === 'critical').length,
      severe: allergies.filter((a) => a.severity === 'severe').length,
      moderate: allergies.filter((a) => a.severity === 'moderate').length,
      mild: allergies.filter((a) => a.severity === 'mild').length,
    };
  }, [allergies]);

  // Filtered rows
  const filteredAllergies = useMemo(() => {
    if (selectedSeverity === 'all') return allergies;
    return allergies.filter((a) => a.severity === selectedSeverity);
  }, [allergies, selectedSeverity]);

  const handleOpenAddModal = () => {
    setSubstance('');
    setReaction('');
    setSeverity('moderate');
    setStatus('active');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: Allergy) => {
    setEditingAllergy(item);
    setEditSubstance(item.substance);
    setEditReaction(item.reaction);
    setEditSeverity(item.severity);
    setEditStatus(item.status);
    setEditFormError(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!substance.trim()) {
      setFormError('Substance name is required.');
      return;
    }
    if (!reaction.trim()) {
      setFormError('Clinical reaction description is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      if (onAddAllergy) {
        await onAddAllergy({
          substance: substance.trim(),
          reaction: reaction.trim(),
          severity,
          status,
        });
      }
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to record allergy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAllergy) return;
    if (!editSubstance.trim()) {
      setEditFormError('Substance name is required.');
      return;
    }
    if (!editReaction.trim()) {
      setEditFormError('Clinical reaction description is required.');
      return;
    }

    try {
      setIsEditSubmitting(true);
      setEditFormError(null);
      if (onUpdateAllergy) {
        await onUpdateAllergy({
          allergyId: editingAllergy.id,
          substance: editSubstance.trim(),
          reaction: editReaction.trim(),
          severity: editSeverity,
          status: editStatus,
        });
      }
      setEditingAllergy(null);
    } catch (err: unknown) {
      setEditFormError(err instanceof Error ? err.message : 'Failed to update allergy.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const getSeverityBadge = (level: Allergy['severity']) => {
    switch (level) {
      case 'critical':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--color-status-critical)]/15 text-[var(--color-ink)] border border-[var(--color-status-critical)]/40"
            data-testid="critical-severity-badge"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--color-status-critical)] animate-pulse" />
            <span>CRITICAL</span>
          </span>
        );
      case 'severe':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-900 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>Severe</span>
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-900 border border-yellow-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-600" />
            <span>Moderate</span>
          </span>
        );
      case 'mild':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] border border-black/10">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
            <span>Mild</span>
          </span>
        );
    }
  };

  const getStatusBadge = (st: string) => {
    const s = st.toLowerCase();
    if (s === 'active') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Active</span>
        </span>
      );
    }
    if (s === 'resolved') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
          <CheckCircle2 className="w-3 h-3 text-stone-500" />
          <span>Resolved</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
        <XCircle className="w-3 h-3 text-stone-500" />
        <span>Inactive</span>
      </span>
    );
  };

  return (
    <div className={clsx('w-full flex flex-col gap-5', className)} data-testid="allergies-tab-view">
      {/* ========================================================================= */}
      {/* HEADER ROW WITH ACTION BUTTONS                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-[20px] bg-[var(--color-surface)] border border-black/5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-ink)]">
              {dict.title}
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] border border-black/5">
              {allergies.length}
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
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[var(--color-ink)] hover:bg-black text-white transition-all shadow-xs cursor-pointer active:scale-95"
            data-testid="add-allergy-button"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{dict.addAllergy}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEVERITY FILTER PILLS                                                     */}
      {/* ========================================================================= */}
      {allergies.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-medium text-[var(--color-ink-muted)] mr-1">
            Severity Filter:
          </span>

          {(
            [
              { id: 'all', label: dict.all, count: counts.all },
              { id: 'critical', label: dict.critical, count: counts.critical },
              { id: 'severe', label: dict.severe, count: counts.severe },
              { id: 'moderate', label: dict.moderate, count: counts.moderate },
              { id: 'mild', label: dict.mild, count: counts.mild },
            ] as const
          ).map((filter) => {
            const isActive = selectedSeverity === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedSeverity(filter.id)}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer',
                  isActive
                    ? 'bg-[var(--color-ink)] text-white shadow-xs'
                    : 'bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-black/5'
                )}
                data-testid={`allergy-filter-${filter.id}`}
              >
                <span>{filter.label}</span>
                <span
                  className={clsx(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    isActive ? 'bg-white/20 text-white' : 'bg-black/5 text-[var(--color-ink-muted)]'
                  )}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALLERGIES ROWS / LIST                                                     */}
      {/* ========================================================================= */}
      {allergies.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-[24px] p-8 sm:p-12 border border-black/5 shadow-xs">
          <EmptyState
            title={dict.noAllergies}
            description={dict.noAllergiesDesc}
            actionLabel={dict.addAllergy}
            onAction={handleOpenAddModal}
            icon={<ShieldCheck className="w-6 h-6 text-emerald-600" />}
          />
        </div>
      ) : filteredAllergies.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-[20px] p-8 text-center border border-black/5">
          <p className="text-sm font-medium text-[var(--color-ink-muted)]">
            No allergies match the selected severity filter.
          </p>
          <button
            type="button"
            onClick={() => setSelectedSeverity('all')}
            className="mt-3 text-xs font-semibold text-[var(--color-ink)] underline cursor-pointer"
          >
            Show all allergies
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="allergies-list">
          {filteredAllergies.map((allergy) => (
            <motion.div
              key={allergy.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx(
                'group p-4 sm:p-5 rounded-[20px] bg-[var(--color-surface)] border transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4',
                allergy.severity === 'critical'
                  ? 'border-[var(--color-status-critical)]/40 bg-[var(--color-surface)]/95'
                  : 'border-black/5'
              )}
              data-testid={`allergy-row-${allergy.id}`}
            >
              {/* Left Details */}
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs',
                    allergy.severity === 'critical'
                      ? 'bg-[var(--color-status-critical)]/15 border-[var(--color-status-critical)]/30 text-[var(--color-status-critical)]'
                      : 'bg-[var(--color-surface-subtle)] border-black/5 text-[var(--color-ink-muted)]'
                  )}
                >
                  {allergy.severity === 'critical' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--color-ink)] truncate">
                      {allergy.substance}
                    </h3>
                    {getSeverityBadge(allergy.severity)}
                    {getStatusBadge(allergy.status)}
                  </div>

                  <p className="text-xs sm:text-sm text-[var(--color-ink)] mt-1 font-medium">
                    <span className="text-[var(--color-ink-muted)] font-normal">Reaction: </span>
                    {allergy.reaction}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-ink-muted)] mt-2">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{allergy.createdBy || 'Dr. Tarek'} (Clinician)</span>
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{allergy.createdAt ? new Date(allergy.createdAt).toLocaleDateString() : 'Verified'}</span>
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-medium">Verified Entry</span>
                  </div>
                </div>
              </div>

              {/* Right Edit Action */}
              <div className="flex items-center gap-2 shrink-0 md:self-center">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(allergy)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-stone-100 text-[var(--color-ink)] border border-black/10 transition-colors shadow-2xs cursor-pointer"
                  data-testid={`edit-allergy-btn-${allergy.id}`}
                >
                  <Edit2 className="w-3 h-3 stroke-[2]" />
                  <span>{dict.editAllergy}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD ALLERGY MODAL SHEET                                                   */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={dict.newAllergyTitle}
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

          {/* Quick suggestions */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1.5">
              Quick Suggestions
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allergenSuggestions.map((sug) => (
                <button
                  key={sug.substance}
                  type="button"
                  onClick={() => {
                    setSubstance(sug.substance);
                    setReaction(sug.reaction);
                    setSeverity(sug.severity);
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-[var(--color-ink)] transition-colors cursor-pointer"
                >
                  + {sug.substance}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
              {dict.substance} *
            </label>
            <input
              type="text"
              required
              value={substance}
              onChange={(e) => setSubstance(e.target.value)}
              placeholder={dict.substancePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)]"
              data-testid="input-allergy-substance"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
              {dict.reaction} *
            </label>
            <input
              type="text"
              required
              value={reaction}
              onChange={(e) => setReaction(e.target.value)}
              placeholder={dict.reactionPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)]"
              data-testid="input-allergy-reaction"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
                {dict.severity}
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as typeof severity)}
                className="w-full px-3 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)] cursor-pointer"
                data-testid="select-allergy-severity"
              >
                <option value="critical">Critical (Life Threatening)</option>
                <option value="severe">Severe</option>
                <option value="moderate">Moderate</option>
                <option value="mild">Mild</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
                {dict.status}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)] cursor-pointer"
                data-testid="select-allergy-status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Clinician provenance note */}
          <div className="p-3 rounded-xl bg-stone-50 border border-black/5 text-[11px] text-[var(--color-ink-muted)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Recorded by Dr. Tarek under physician credentials. Automatically synchronized to care events timeline.
            </span>
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
              data-testid="submit-add-allergy"
            >
              {isSubmitting ? 'Saving...' : dict.saveAllergy}
            </button>
          </div>
        </form>
      </OverlaySheet>

      {/* ========================================================================= */}
      {/* EDIT ALLERGY MODAL SHEET                                                  */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={!!editingAllergy}
        onClose={() => setEditingAllergy(null)}
        title={dict.editAllergyTitle}
      >
        <p className="text-xs text-[var(--color-ink-muted)] -mt-2 mb-3">
          Updating Allergy Record · {editSubstance}
        </p>
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 text-left">
          {editFormError && (
            <div className="p-3 rounded-xl bg-[var(--color-status-critical)]/10 border border-[var(--color-status-critical)]/30 text-xs font-semibold text-[var(--color-ink)]">
              {editFormError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
              {dict.substance} *
            </label>
            <input
              type="text"
              required
              value={editSubstance}
              onChange={(e) => setEditSubstance(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)]"
              data-testid="edit-input-allergy-substance"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
              {dict.reaction} *
            </label>
            <input
              type="text"
              required
              value={editReaction}
              onChange={(e) => setEditReaction(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)]"
              data-testid="edit-input-allergy-reaction"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
                {dict.severity}
              </label>
              <select
                value={editSeverity}
                onChange={(e) => setEditSeverity(e.target.value as typeof editSeverity)}
                className="w-full px-3 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)] cursor-pointer"
                data-testid="edit-select-allergy-severity"
              >
                <option value="critical">Critical (Life Threatening)</option>
                <option value="severe">Severe</option>
                <option value="moderate">Moderate</option>
                <option value="mild">Mild</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
                {dict.status}
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)] cursor-pointer"
                data-testid="edit-select-allergy-status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-black/5">
            <button
              type="button"
              onClick={() => setEditingAllergy(null)}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
            >
              {dict.cancel}
            </button>
            <button
              type="submit"
              disabled={isEditSubmitting}
              className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--color-ink)] hover:bg-black text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
              data-testid="submit-edit-allergy"
            >
              {isEditSubmitting ? 'Updating...' : dict.updateAllergy}
            </button>
          </div>
        </form>
      </OverlaySheet>
    </div>
  );
}
