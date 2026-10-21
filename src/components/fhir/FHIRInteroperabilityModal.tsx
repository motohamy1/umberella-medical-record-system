'use client';

/**
 * FHIRInteroperabilityModal.tsx — Phase L7: HL7 FHIR Release 4 (R4) Interoperability
 * Specification: docs/PACK.md §11 (Phase L7).
 *
 * Provides:
 * 1. Export patient clinical record as valid HL7 FHIR R4 Bundle.
 * 2. Interactive JSON syntax inspector and resource summary pills.
 * 3. Import external FHIR R4 bundles into Umbrella domain repository.
 * 4. Download FHIR bundle JSON file.
 */

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  FileCode,
  Download,
  Copy,
  Check,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
} from 'lucide-react';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import type { Patient } from '@/data/types';
import type { FHIRBundle } from '@/lib/fhir';
import {
  exportPatientFHIRBundleAction,
  importPatientFHIRBundleAction,
} from '@/data/actions';

interface FHIRInteroperabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onImportComplete?: () => void;
}

export function FHIRInteroperabilityModal({
  isOpen,
  onClose,
  patient,
  onImportComplete,
}: FHIRInteroperabilityModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [bundle, setBundle] = useState<FHIRBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load FHIR bundle when export tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'export' || !patient?.id) return;
    setIsLoading(true);
    setErrorMsg(null);

    exportPatientFHIRBundleAction(patient.id)
      .then((res) => {
        if (res.success && res.data) {
          setBundle(res.data);
        } else {
          setErrorMsg(res.error || 'Failed to generate FHIR bundle');
        }
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'FHIR export error');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, activeTab, patient?.id]);

  const handleCopy = () => {
    if (!bundle) return;
    navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fhir-r4-${patient.mrn || patient.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJson.trim()) return;

    setIsImporting(true);
    setImportResult(null);
    setErrorMsg(null);

    try {
      const res = await importPatientFHIRBundleAction(importJson.trim());
      if (res.success && res.data) {
        setImportResult(
          `Successfully imported clinical records for ${res.data.patientName}. Vitals: ${res.data.importedCounts.vitals}, Labs: ${res.data.importedCounts.labs}, Meds: ${res.data.importedCounts.medications}, Visits: ${res.data.importedCounts.visits}, Allergies: ${res.data.importedCounts.allergies}.`
        );
        setImportJson('');
        if (onImportComplete) onImportComplete();
      } else {
        setErrorMsg(res.error || 'Failed to import FHIR bundle');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Derive counts by resourceType
  const resourceCounts: Record<string, number> = {};
  if (bundle?.entry) {
    for (const e of bundle.entry) {
      const type = e.resource.resourceType;
      resourceCounts[type] = (resourceCounts[type] || 0) + 1;
    }
  }

  return (
    <OverlaySheet
      isOpen={isOpen}
      onClose={onClose}
      title="HL7 FHIR Release 4 (R4) Interoperability"
    >
      <div className="flex flex-col h-[78vh] max-h-[720px] text-start font-['Inter',sans-serif]">
        {/* Navigation tabs */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/5">
          <div className="inline-flex items-center p-1 rounded-full bg-[var(--color-surface)] border border-black/5 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none',
                activeTab === 'export'
                  ? 'bg-[var(--color-ink)] text-white shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              )}
              data-testid="fhir-tab-export"
            >
              Export FHIR R4 Bundle
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none',
                activeTab === 'import'
                  ? 'bg-[var(--color-ink)] text-white shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              )}
              data-testid="fhir-tab-import"
            >
              Import FHIR Bundle
            </button>
          </div>

          {activeTab === 'export' && bundle && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-xs font-semibold text-[var(--color-ink)] shadow-2xs transition-all cursor-pointer"
                data-testid="fhir-copy-btn"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-ink)] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                data-testid="fhir-download-btn"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Bundle</span>
              </button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 mb-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {importResult && (
          <div className="p-3 mb-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{importResult}</span>
          </div>
        )}

        {/* Tab 1: Export View */}
        {activeTab === 'export' && (
          <div className="flex-1 flex flex-col min-h-0 gap-3">
            {/* Resource Counter Chips */}
            {bundle && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[var(--color-surface)] border border-black/5 shadow-2xs">
                <span className="text-[10.5px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider me-1">
                  FHIR R4 Resources ({bundle.entry.length}):
                </span>
                {Object.entries(resourceCounts).map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200/80 text-[11px] font-mono text-[var(--color-ink)] font-semibold"
                  >
                    <span>{type}:</span>
                    <span className="text-[var(--color-ink-muted)]">{count}</span>
                  </span>
                ))}
              </div>
            )}

            {/* JSON Code Viewer */}
            <div className="flex-1 rounded-2xl bg-stone-900 border border-stone-800 p-4 overflow-y-auto font-mono text-xs text-stone-200 shadow-inner">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-stone-400">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <p className="text-xs">Generating HL7 FHIR R4 Bundle...</p>
                </div>
              ) : bundle ? (
                <pre className="whitespace-pre-wrap leading-relaxed select-text">
                  {JSON.stringify(bundle, null, 2)}
                </pre>
              ) : (
                <p className="text-stone-400">No FHIR bundle loaded.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Import View */}
        {activeTab === 'import' && (
          <form onSubmit={handleImport} className="flex-1 flex flex-col min-h-0 gap-3">
            <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-black/5 text-xs text-[var(--color-ink-muted)]">
              Paste an external HL7 FHIR R4 Bundle (JSON format) to parse and ingest patient demographic and clinical resources into the Umbrella system.
            </div>

            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste FHIR R4 Bundle JSON here (e.g. { 'resourceType': 'Bundle', 'type': 'collection', 'entry': [...] })"
              className="flex-1 p-3.5 rounded-2xl bg-white border border-stone-200 text-xs font-mono text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] resize-none"
              data-testid="fhir-import-textarea"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
              <button
                type="submit"
                disabled={isImporting || !importJson.trim()}
                className="px-5 py-2.5 rounded-full bg-[var(--color-ink)] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                data-testid="fhir-import-submit-btn"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isImporting ? 'Ingesting Bundle...' : 'Import Clinical Bundle'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </OverlaySheet>
  );
}
