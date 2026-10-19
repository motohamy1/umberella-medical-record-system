'use client';

/**
 * ImagingTabView — Dedicated Diagnostic Imaging & Radiological Studies Tab (Slice S11).
 * Features:
 *  - 3-column responsive grid of ImagingThumbCards
 *  - Modality filter pills with live count badges
 *  - Study Viewer Overlay Sheet with high-res medical image & complete report text
 *  - Secure short-lived signed media access tokens
 *  - "+ Upload Study" modal writing provenance and projecting to care_events
 *  - Zero-state baseline adherence for patients with no studies (e.g. p-007)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  ShieldCheck,
  X,
  Calendar,
  User,
  Clock,
  Layers,
  FileText,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { ImagingThumbCard } from '@/components/cards/ImagingThumbCard';
import { EmptyState } from '@/components/state/EmptyState';
import { generateSignedMediaUrl } from '@/lib/signedAccess';
import type { ImagingStudy, ImagingModality } from '@/data/types';

interface ImagingTabViewProps {
  patientId: string;
  patientName: string;
  imaging?: ImagingStudy[];
  onUploadStudy?: (study: {
    modality: string;
    title: string;
    reportText?: string;
    imagePath?: string;
    occurredAt?: string;
  }) => Promise<void>;
  onShowOnTimeline?: () => void;
}

const MODALITY_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'All', label: 'All' },
  { id: 'Echocardiogram', label: 'Echocardiogram' },
  { id: 'Ultrasound', label: 'Ultrasound' },
  { id: 'MRI', label: 'MRI' },
  { id: 'CT', label: 'CT' },
  { id: 'X-Ray', label: 'X-Ray' },
];

export function ImagingTabView({
  patientId,
  patientName,
  imaging = [],
  onUploadStudy,
  onShowOnTimeline,
}: ImagingTabViewProps) {
  const [selectedModality, setSelectedModality] = useState<string>('All');
  const [activeStudy, setActiveStudy] = useState<ImagingStudy | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload study form state
  const [modality, setModality] = useState<ImagingModality>('Echocardiogram');
  const [title, setTitle] = useState('');
  const [reportText, setReportText] = useState('');
  const [imagePath, setImagePath] = useState('/imaging/echo-hero-1.png');
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close study viewer on Escape key
  useEffect(() => {
    if (!activeStudy && !isUploadModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveStudy(null);
        setIsUploadModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStudy, isUploadModalOpen]);

  // Compute live count badges per modality
  const counts = useMemo(() => {
    const map: Record<string, number> = { All: imaging.length };
    MODALITY_FILTERS.forEach((f) => {
      if (f.id !== 'All') {
        map[f.id] = imaging.filter(
          (s) => s.modality.toLowerCase() === f.id.toLowerCase()
        ).length;
      }
    });
    return map;
  }, [imaging]);

  // Filter studies based on selected modality pill
  const filteredStudies = useMemo(() => {
    if (selectedModality === 'All') return imaging;
    return imaging.filter(
      (s) => s.modality.toLowerCase() === selectedModality.toLowerCase()
    );
  }, [imaging, selectedModality]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      if (onUploadStudy) {
        await onUploadStudy({
          modality,
          title: title.trim(),
          reportText: reportText.trim() || undefined,
          imagePath: imagePath || '/imaging/echo-hero-1.png',
          occurredAt: new Date(occurredAt).toISOString(),
        });
      }
      setIsUploadModalOpen(false);
      setTitle('');
      setReportText('');
    } catch (err) {
      console.error('Failed to upload imaging study:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Inter',system-ui,sans-serif]">
      {/* ========================================================================= */}
      {/* 1. HEADER & CONTROL TOOLBAR                                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-[22px] bg-white/70 backdrop-blur-md border border-white/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--color-ink)]">
              Imaging Studies
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold font-mono">
              {imaging.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-0.5">
            Diagnostic radiological studies, high-resolution scans, and clinical reports
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Security status badge */}
          <div
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-medium"
            title="Short-lived signed media access token active"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Signed Access Active</span>
          </div>

          {/* + Upload Study Action Button */}
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-ink)] text-white text-xs sm:text-sm font-semibold hover:bg-black active:scale-95 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Upload Study</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MODALITY FILTER PILLS                                                  */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {MODALITY_FILTERS.map((f) => {
          const isSelected = selectedModality === f.id;
          const count = counts[f.id] || 0;
          return (
            <button
              key={f.id}
              type="button"
              data-testid={`filter-pill-${f.id.toLowerCase()}`}
              onClick={() => setSelectedModality(f.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all select-none cursor-pointer ${
                isSelected
                  ? 'bg-[var(--color-ink)] text-white font-semibold shadow-xs scale-102'
                  : 'bg-white/80 text-[var(--color-ink-muted)] hover:bg-white hover:text-[var(--color-ink)] border border-black/5'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-[var(--color-ink-muted)]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. THREE-COLUMN STUDY GRID OR EMPTY STATE                                 */}
      {/* ========================================================================= */}
      {filteredStudies.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-[24px] bg-white/70 backdrop-blur-md border border-white/60 shadow-xs flex flex-col items-center text-center">
          <EmptyState
            icon={<Layers className="w-8 h-8 text-[var(--color-ink-muted)]" />}
            title="No imaging studies found"
            description={
              imaging.length === 0
                ? 'No radiological examinations or diagnostic scans on file for this patient.'
                : `No studies found under the "${selectedModality}" modality.`
            }
            actionLabel="Upload Study"
            onAction={() => setIsUploadModalOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudies.map((study) => {
            const signed = generateSignedMediaUrl(study.imagePath || '/imaging/echo-hero-1.png');
            return (
              <ImagingThumbCard
                key={study.id}
                id={study.id}
                modality={study.modality}
                title={study.title}
                occurredAt={study.occurredAt}
                imagePath={study.imagePath}
                signedUrl={signed}
                reportText={study.reportText}
                onClick={() => setActiveStudy(study)}
              />
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. STUDY VIEWER OVERLAY SHEET                                             */}
      {/* ========================================================================= */}
      {activeStudy && (
        <div
          data-testid="study-viewer-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveStudy(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[24px] bg-[var(--color-canvas)] border border-white/60 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Viewer Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-black/10 bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-black text-white text-xs font-bold tracking-wider uppercase">
                  {activeStudy.modality}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[var(--color-ink)] leading-snug">
                    {activeStudy.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)] mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                      {new Date(activeStudy.occurredAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                      {activeStudy.createdBy || 'Imaging Dept'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveStudy(null)}
                aria-label="Close study viewer"
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-stone-100 transition-colors shadow-xs"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Viewer Body: Split into Image Display and Radiological Report */}
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* High-Res Study Image Display */}
              <div className="lg:col-span-7 flex flex-col gap-2">
                <div className="relative aspect-[4/3] w-full rounded-[18px] overflow-hidden bg-black shadow-inner flex items-center justify-center border border-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={generateSignedMediaUrl(activeStudy.imagePath || '/imaging/echo-hero-1.png')}
                    alt={activeStudy.title}
                    className="w-full h-full object-contain select-none"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/mri-scan.jpg';
                    }}
                  />

                  {/* High-contrast Modality overlay badge */}
                  <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/80 text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs">
                    DICOM Frame View
                  </span>

                  {/* Signed Access Security Badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/80 text-white text-[10px] font-medium flex items-center gap-1.5 backdrop-blur-xs">
                    <Lock className="w-3 h-3 text-[var(--color-accent-neon)]" />
                    <span>Signed URL Valid (5m)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--color-ink-muted)] px-1">
                  <span>Source: {activeStudy.source.toUpperCase()}</span>
                  <span className="font-mono">ID: {activeStudy.id}</span>
                </div>
              </div>

              {/* Radiological Report & Metadata */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="p-4 rounded-[18px] bg-white border border-black/5 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                    <FileText className="w-4 h-4 text-[var(--color-ink)]" />
                    <h4 className="text-sm font-bold text-[var(--color-ink)]">
                      Radiological Report
                    </h4>
                  </div>

                  <div className="text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed bg-[var(--color-surface-muted)] p-3.5 rounded-[12px] border border-black/5">
                    {activeStudy.reportText ||
                      'No written radiological findings provided with this examination. Visual series archived in patient record.'}
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs text-[var(--color-ink-muted)] pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Patient:</span>
                      <span className="font-semibold text-[var(--color-ink)]">{patientName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Modality:</span>
                      <span className="font-semibold text-[var(--color-ink)]">{activeStudy.modality}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Audit Status:</span>
                      <span className="font-semibold text-emerald-700">Verified & Archived</span>
                    </div>
                  </div>
                </div>

                {onShowOnTimeline && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStudy(null);
                      onShowOnTimeline();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-xs font-semibold text-[var(--color-ink)] shadow-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Show on Care Timeline</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. UPLOAD STUDY MODAL                                                     */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div
          data-testid="upload-study-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-[24px] bg-[var(--color-canvas)] border border-white/60 shadow-2xl p-5 sm:p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-[var(--color-ink)]">
                Upload Diagnostic Imaging Study
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors shadow-xs"
              >
                <X className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Modality Selector */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
                  Modality *
                </label>
                <select
                  value={modality}
                  onChange={(e) => setModality(e.target.value as ImagingModality)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                >
                  <option value="Echocardiogram">Echocardiogram (Cardiac Ultrasound)</option>
                  <option value="Ultrasound">Ultrasound (Abdominal / Duplex)</option>
                  <option value="MRI">MRI (Magnetic Resonance Imaging)</option>
                  <option value="CT">CT (Computed Tomography)</option>
                  <option value="X-Ray">X-Ray (Radiography)</option>
                </select>
              </div>

              {/* Study Title */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
                  Study Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Transthoracic Echocardiogram or Brain MRI Scan"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                />
              </div>

              {/* Study Date */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
                  Study Date *
                </label>
                <input
                  type="date"
                  required
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                />
              </div>

              {/* Image Asset Selection */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
                  Image Asset Preset *
                </label>
                <select
                  value={imagePath}
                  onChange={(e) => setImagePath(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                >
                  <option value="/imaging/echo-hero-1.png">Echocardiogram 2D Doppler (/imaging/echo-hero-1.png)</option>
                  <option value="/imaging/renal-us-hero.png">Renal Duplex Ultrasound (/imaging/renal-us-hero.png)</option>
                  <option value="/mri-scan.jpg">High-Resolution Brain MRI Scan (/mri-scan.jpg)</option>
                </select>
              </div>

              {/* Report Text */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
                  Radiological Report Text
                </label>
                <textarea
                  rows={3}
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Enter complete clinical impression, measurements, and findings..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-white text-[var(--color-ink)] border border-stone-200 text-xs font-semibold hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold shadow-xs hover:bg-black active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Uploading...' : 'Upload & Save Study'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
