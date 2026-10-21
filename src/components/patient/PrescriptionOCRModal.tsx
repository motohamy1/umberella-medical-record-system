'use client';

/**
 * PrescriptionOCRModal — Section 11 Phase L1: Prescription OCR & Verification.
 *
 * Requirements:
 * - Patient consent required before processing (Egypt PDPL Law 151/2020, D9).
 * - Matches extracted medication strings against Egyptian Drug Authority (EDA) catalog (D8).
 * - Flags items with confidence < 0.85 as uncertain (Rule 12: uncertain fields flagged, never guessed).
 * - AI assists and never decides: clinician must confirm before adding to active medications.
 * - Writes to repository with source: 'ocr', verified by doctor with provenance audit.
 */

import React, { useState } from 'react';
import { clsx } from 'clsx';
import {
  FileText,
  Scan,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Edit3,
  Sparkles,
  Lock,
  X,
} from 'lucide-react';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import {
  processPrescriptionOCRAction,
  confirmAndPrescribeOCRItemAction,
} from '@/data/actions';
import {
  SAMPLE_PRESCRIPTIONS,
  type ExtractedPrescriptionItem,
  type PrescriptionScanResult,
} from '@/data/ocrService';
import { en } from '@/i18n/en';

interface PrescriptionOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onMedicationAdded?: () => void;
  dict?: typeof en.ocr;
}

export function PrescriptionOCRModal({
  isOpen,
  onClose,
  patientId,
  onMedicationAdded,
  dict = en.ocr,
}: PrescriptionOCRModalProps) {
  const [selectedSampleId, setSelectedSampleId] = useState<string>('rx-sample-01');
  const [consentObtained, setConsentObtained] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<PrescriptionScanResult | null>(null);
  const [confirmedItems, setConfirmedItems] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<ExtractedPrescriptionItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartOCR = async () => {
    if (!consentObtained) {
      setErrorMsg(dict.consentRequired);
      return;
    }
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const res = await processPrescriptionOCRAction({
        patientId,
        sampleId: selectedSampleId,
        consentObtained,
      });

      if (res.success && res.data) {
        setScanResult(res.data);
      } else {
        setErrorMsg(res.error || 'Extraction failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmItem = async (item: ExtractedPrescriptionItem) => {
    try {
      const res = await confirmAndPrescribeOCRItemAction({
        patientId,
        item,
        doctorName: 'Dr. Tarek',
      });

      if (res.success) {
        setConfirmedItems((prev) => ({ ...prev, [item.id]: true }));
        if (onMedicationAdded) onMedicationAdded();
      } else {
        setErrorMsg(res.error || 'Failed to prescribe item');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error confirming item');
    }
  };

  const handleUpdateItem = (updated: ExtractedPrescriptionItem) => {
    if (!scanResult) return;
    setScanResult({
      ...scanResult,
      items: scanResult.items.map((it) => (it.id === updated.id ? updated : it)),
    });
    setEditingItem(null);
  };

  const handleDismissItem = (itemId: string) => {
    if (!scanResult) return;
    setScanResult({
      ...scanResult,
      items: scanResult.items.filter((it) => it.id !== itemId),
    });
    if (editingItem?.id === itemId) {
      setEditingItem(null);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setConfirmedItems({});
    setEditingItem(null);
    setErrorMsg(null);
  };

  return (
    <OverlaySheet
      isOpen={isOpen}
      onClose={onClose}
      title={dict.title}
      className="max-w-4xl"
    >
      <div className="flex flex-col gap-4 text-left">
        {/* Subtitle */}
        <p className="text-xs text-[var(--color-ink-muted)] -mt-2">
          {dict.subtitle}
        </p>

        {/* AI Rule 12 Banner */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{dict.aiDisclaimer}</span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!scanResult ? (
          /* ========================================================================= */
          /* STEP 1: SAMPLE SELECTION & PATIENT CONSENT                                */
          /* ========================================================================= */
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-[var(--color-surface)] border border-black/5 mt-1">
            <div>
              <label className="block text-xs font-bold text-[var(--color-ink)] mb-1">
                {dict.selectSample}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {SAMPLE_PRESCRIPTIONS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => setSelectedSampleId(sample.id)}
                    className={clsx(
                      'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2',
                      selectedSampleId === sample.id
                        ? 'bg-white border-[var(--color-ink)] shadow-xs'
                        : 'bg-white/60 border-black/10 hover:bg-white'
                    )}
                    data-testid={`select-sample-${sample.id}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--color-ink)]">
                          {sample.title}
                        </span>
                        {selectedSampleId === sample.id && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-[var(--color-ink-muted)] block mt-1">
                        {sample.fileName}
                      </span>
                    </div>

                    <span className="text-[10px] text-[var(--color-ink-muted)] line-clamp-2 mt-1">
                      {sample.rawText.split('\n').slice(0, 3).join(' · ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Consent Checkbox (D9 Law 151/2020) */}
            <div className="pt-3 border-t border-black/5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentObtained}
                  onChange={(e) => setConsentObtained(e.target.checked)}
                  className="mt-0.5 rounded border-black/20 text-[var(--color-ink)] focus:ring-[var(--color-accent-neon)]"
                  data-testid="ocr-consent-checkbox"
                />
                <span className="text-xs text-[var(--color-ink)] font-medium leading-tight">
                  {dict.consentCheckbox}
                </span>
              </label>
              <p className="text-[11px] text-[var(--color-ink-muted)] ml-6 mt-1">
                {dict.consentRequired}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleStartOCR}
                disabled={isProcessing || !consentObtained}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] font-bold text-xs shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                data-testid="start-ocr-button"
              >
                <Scan className="w-4 h-4 stroke-[2]" />
                <span>{isProcessing ? dict.processing : dict.scanPrescription}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* STEP 2: EXTRACTED ITEMS & CLINICIAN VERIFICATION                          */
          /* ========================================================================= */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-ink-muted)]" />
                <span className="text-xs font-bold text-[var(--color-ink)]">
                  {scanResult.imageFileName}
                </span>
                <span className="text-[10px] font-mono text-[var(--color-ink-muted)] bg-black/5 px-2 py-0.5 rounded-full">
                  Extracted {scanResult.items.length} items
                </span>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] underline cursor-pointer"
              >
                Scan another document
              </button>
            </div>

            {/* Extracted Items List */}
            <div className="flex flex-col gap-3">
              {scanResult.items.map((item) => {
                const isConfirmed = confirmedItems[item.id];
                const isEditing = editingItem?.id === item.id;

                if (isEditing) {
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-[var(--color-ink)] bg-white shadow-xs flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between border-b border-black/5 pb-2">
                        <span className="text-xs font-bold text-[var(--color-ink)]">
                          Edit Extracted Item
                        </span>
                        <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                          Raw: "{item.rawText}"
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-[var(--color-ink)]">
                            Medication Name
                          </label>
                          <input
                            type="text"
                            value={editingItem.medicationName}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, medicationName: e.target.value })
                            }
                            className="px-3 py-1.5 rounded-xl border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-ink)]"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-[var(--color-ink)]">
                            Strength
                          </label>
                          <input
                            type="text"
                            value={editingItem.strength}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, strength: e.target.value })
                            }
                            className="px-3 py-1.5 rounded-xl border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-ink)]"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-[var(--color-ink)]">
                            Frequency
                          </label>
                          <input
                            type="text"
                            value={editingItem.frequency}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, frequency: e.target.value })
                            }
                            className="px-3 py-1.5 rounded-xl border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-ink)]"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-[var(--color-ink)]">
                            Instructions
                          </label>
                          <input
                            type="text"
                            value={editingItem.instructions}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, instructions: e.target.value })
                            }
                            className="px-3 py-1.5 rounded-xl border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-ink)]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
                        <button
                          type="button"
                          onClick={() => setEditingItem(null)}
                          className="px-3 py-1 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:bg-black/5 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(editingItem)}
                          className="px-4 py-1 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold shadow-xs hover:bg-black cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={clsx(
                      'p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3',
                      isConfirmed
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : item.isUncertain
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-[var(--color-surface)] border-black/5'
                    )}
                    data-testid={`ocr-extracted-item-${item.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-[var(--color-ink)]">
                          {item.medicationName} {item.strength}
                        </h4>

                        {/* Egyptian Drug Catalog Match / Uncatalogued Flag */}
                        {item.catalogMatch ? (
                          <span className="text-[10px] font-medium bg-white text-[var(--color-ink)] border border-black/10 px-2 py-0.5 rounded-full">
                            EDA: {item.catalogMatch}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                            Uncatalogued / Custom Rx
                          </span>
                        )}

                        {/* Confidence Badge */}
                        <span
                          className={clsx(
                            'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1',
                            item.isUncertain
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          )}
                          data-testid={`confidence-badge-${item.id}`}
                        >
                          {item.isUncertain ? (
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>
                            {Math.round(item.confidence * 100)}% {item.isUncertain ? dict.lowConfidence : dict.highConfidence}
                          </span>
                        </span>
                      </div>

                      <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                        {item.instructions} ({item.frequency})
                      </p>

                      <span className="text-[10px] font-mono text-[var(--color-ink-muted)] block mt-0.5">
                        Raw OCR: "{item.rawText}"
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 mt-2 sm:mt-0">
                      {isConfirmed ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Added to Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingItem({ ...item })}
                            className="p-1.5 rounded-full text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-black/5 transition-all cursor-pointer"
                            title="Edit extracted medication details"
                            data-testid={`edit-item-button-${item.id}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismissItem(item.id)}
                            className="p-1.5 rounded-full text-[var(--color-ink-muted)] hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Dismiss / Remove non-medication line"
                            data-testid={`dismiss-item-button-${item.id}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmItem(item)}
                            className={clsx(
                              'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer',
                              item.isUncertain
                                ? 'bg-amber-400 hover:bg-amber-500 text-amber-950'
                                : 'bg-[var(--color-accent-neon)] hover:brightness-105 text-[var(--color-ink)]'
                            )}
                            data-testid={`confirm-prescribe-button-${item.id}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" />
                            <span>{dict.verifyAndPrescribe}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </OverlaySheet>
  );
}
