'use client';

/**
 * ComplianceCenterModal.tsx — Phase L8: Security, Egypt PDPL Law 151/2020 Compliance Hardening & Audit Trail
 * Specification: docs/PACK.md §11 (Phase L8), D10 (Compliance Gate), Egypt Law 151 of 2020.
 */

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  KeyRound,
  Check,
  X,
} from 'lucide-react';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import type { Patient } from '@/data/types';
import {
  checkComplianceGateAction,
  getPatientConsentsAction,
  updatePatientConsentAction,
  getAuditLogsAction,
  verifyAuditTrailIntegrityAction,
  generateDSARAction,
} from '@/data/actions';
import type {
  ComplianceGateStatus,
  PatientConsentRecord,
  AuditLogEntry,
  ConsentPurpose,
  DataSubjectAccessReport,
} from '@/lib/compliance';
import { en } from '@/i18n/en';

interface ComplianceCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
}

export function ComplianceCenterModal({
  isOpen,
  onClose,
  patient,
}: ComplianceCenterModalProps) {
  const [activeTab, setActiveTab] = useState<'gate' | 'consent' | 'audit'>('gate');
  const [gateStatus, setGateStatus] = useState<ComplianceGateStatus | null>(null);
  const [consents, setConsents] = useState<PatientConsentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [integrityStatus, setIntegrityStatus] = useState<{ isValid: boolean; checkedCount: number } | null>(null);
  const [dsarReport, setDsarReport] = useState<DataSubjectAccessReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const t = en.compliance;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gateRes, auditRes, integrityRes] = await Promise.all([
        checkComplianceGateAction(),
        getAuditLogsAction(patient?.id),
        verifyAuditTrailIntegrityAction(),
      ]);

      if (gateRes.success && gateRes.data) {
        setGateStatus(gateRes.data);
      }
      if (auditRes.success && auditRes.data) {
        setAuditLogs(auditRes.data);
      }
      if (integrityRes.success && integrityRes.data) {
        setIntegrityStatus(integrityRes.data);
      }

      if (patient?.id) {
        const consentRes = await getPatientConsentsAction(patient.id);
        if (consentRes.success && consentRes.data) {
          setConsents(consentRes.data);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, patient?.id]);

  const handleToggleConsent = async (purpose: ConsentPurpose, currentGranted: boolean) => {
    if (!patient?.id) return;
    const res = await updatePatientConsentAction(patient.id, purpose, !currentGranted);
    if (res.success && res.data) {
      setConsents((prev) => {
        const exists = prev.find((c) => c.purpose === purpose);
        if (exists) {
          return prev.map((c) => (c.purpose === purpose ? res.data! : c));
        }
        return [...prev, res.data!];
      });
      setToastMsg(`Consent for ${purpose} updated under Law 151/2020`);
      setTimeout(() => setToastMsg(null), 3000);
      // Reload audit log
      const auditRes = await getAuditLogsAction(patient.id);
      if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data);
    }
  };

  const handleGenerateDSAR = async () => {
    if (!patient?.id) return;
    const res = await generateDSARAction(patient.id);
    if (res.success && res.data) {
      setDsarReport(res.data);
      setToastMsg('Data Subject Access Report (DSAR) generated successfully.');
      setTimeout(() => setToastMsg(null), 3500);
      // Reload audit log
      const auditRes = await getAuditLogsAction(patient.id);
      if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data);
    }
  };

  const purposes: Array<{ key: ConsentPurpose; label: string; desc: string }> = [
    { key: 'treatment', label: t.consentTreatment, desc: 'Lawful clinical direct care and record keeping' },
    { key: 'telehealth', label: t.consentTelehealth, desc: 'Remote video audio consultation & recorded telemetry' },
    { key: 'external_messaging', label: t.consentMessaging, desc: 'WhatsApp Cloud & Telegram patient communication' },
    { key: 'interoperability', label: t.consentInteroperability, desc: 'HL7 FHIR R4 Bundle and HIE data exchange' },
    { key: 'ai_assistance', label: t.consentAI, desc: 'AI clinical analytics and decision support (Rule 12)' },
  ];

  return (
    <OverlaySheet
      isOpen={isOpen}
      onClose={onClose}
      title={t.title}
    >
      <div className="flex flex-col h-[78vh] max-h-[720px] text-start font-['Inter',sans-serif]">
        {/* Subtitle & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-black/5 gap-2">
          <div className="inline-flex items-center p-1 rounded-full bg-[var(--color-surface)] border border-black/5 shadow-2xs">
            <button
              type="button"
              data-testid="compliance-tab-gate"
              onClick={() => setActiveTab('gate')}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none',
                activeTab === 'gate'
                  ? 'bg-[var(--color-ink)] text-white shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              )}
            >
              {t.tabGate}
            </button>
            <button
              type="button"
              data-testid="compliance-tab-consent"
              onClick={() => setActiveTab('consent')}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none',
                activeTab === 'consent'
                  ? 'bg-[var(--color-ink)] text-white shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              )}
            >
              {t.tabConsent}
            </button>
            <button
              type="button"
              data-testid="compliance-tab-audit"
              onClick={() => setActiveTab('audit')}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none',
                activeTab === 'audit'
                  ? 'bg-[var(--color-ink)] text-white shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              )}
            >
              {t.tabAudit}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-1.5 rounded-full border border-black/5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-all cursor-pointer"
              title="Refresh compliance telemetry"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div className="mb-3 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Tab 1: D10 Compliance Gate */}
        {activeTab === 'gate' && (
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            <div
              className={clsx(
                'p-4 rounded-2xl border flex items-start gap-3.5 shadow-xs',
                gateStatus?.isCompliant
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-900'
              )}
            >
              {gateStatus?.isCompliant ? (
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="font-bold text-sm">
                  {gateStatus?.isCompliant ? t.gateStatusPass : t.gateStatusBlocked}
                </h3>
                <p className="text-xs opacity-90 mt-0.5">
                  Specification D10: Full adherence to Egypt Personal Data Protection Law No. 151/2020 prior to live patient data ingestion.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {/* Sovereign Residency */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-black/5 flex flex-col gap-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[var(--color-ink)]" />
                    <span className="text-xs font-bold text-[var(--color-ink)]">{t.sovereignResidency}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800">
                    {gateStatus?.hostingRegion || 'eg-cairo-1'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-ink-muted)]">
                  {t.sovereignResidencyDesc}
                </p>
              </div>

              {/* DPO Registry */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-black/5 flex flex-col gap-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[var(--color-ink)]" />
                    <span className="text-xs font-bold text-[var(--color-ink)]">{t.dpoRegistry}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800">
                    Registered
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-ink-muted)]">
                  {t.dpoRegistryDesc} Contact: <span className="font-mono">{gateStatus?.dpoContact}</span>
                </p>
              </div>

              {/* Cross-Border Lock */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-black/5 flex flex-col gap-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[var(--color-ink)]" />
                    <span className="text-xs font-bold text-[var(--color-ink)]">{t.crossBorderTransfer}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800">
                    Restricted
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-ink-muted)]">
                  {t.crossBorderTransferDesc}
                </p>
              </div>

              {/* Integrity Metric */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-black/5 flex flex-col gap-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-ink)]" />
                    <span className="text-xs font-bold text-[var(--color-ink)]">Audit Hash Chain</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800">
                    {integrityStatus?.isValid ? 'Verified' : 'Error'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-ink-muted)]">
                  {integrityStatus?.checkedCount || 0} events verified under SHA-256 forward-linked chain.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Patient Consent Lifecycle */}
        {activeTab === 'consent' && (
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-black/5 text-xs text-[var(--color-ink-muted)] flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--color-ink)]">
                  Patient Consent Management — {patient?.name || 'Clinic-wide Policy'}
                </p>
                <p className="text-[11px] mt-0.5">
                  Articles 3, 5, 12 of Egypt Law 151/2020: Explicit, affirmative consent is mandatory before processing.
                </p>
              </div>

              {patient && (
                <button
                  type="button"
                  onClick={handleGenerateDSAR}
                  data-testid="generate-dsar-btn"
                  className="px-3 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-[11px] font-semibold flex items-center gap-1.5 hover:bg-black transition-all cursor-pointer shadow-xs shrink-0"
                >
                  <Download className="w-3 h-3" />
                  <span>{t.dsarExport}</span>
                </button>
              )}
            </div>

            {/* DSAR Modal Drawer / Box if generated */}
            {dsarReport && (
              <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 text-stone-200 text-xs font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-stone-800 mb-2">
                  <span className="font-bold text-amber-300">DATA SUBJECT ACCESS REPORT (DSAR)</span>
                  <button
                    type="button"
                    onClick={() => setDsarReport(null)}
                    className="text-stone-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p>Governing Law: {dsarReport.governingLaw}</p>
                <p>Patient: {dsarReport.name} ({dsarReport.mrn})</p>
                <p>Generated At: {dsarReport.generatedAt}</p>
                <p>Total Access Logs: {dsarReport.accessAuditCount}</p>
                <p className="mt-1 text-emerald-400">All data rights preserved under Egyptian Sovereign Jurisdiction.</p>
              </div>
            )}

            {/* Consent Purpose Cards */}
            <div className="flex flex-col gap-2 mt-1">
              {purposes.map((p) => {
                const rec = consents.find((c) => c.purpose === p.key);
                const isGranted = rec ? rec.granted : p.key === 'treatment';

                return (
                  <div
                    key={p.key}
                    data-testid={`consent-row-${p.key}`}
                    className="p-3 rounded-2xl bg-white border border-stone-200/80 flex items-center justify-between gap-3 shadow-2xs hover:border-black/20 transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-ink)]">{p.label}</span>
                        <span
                          className={clsx(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full',
                            isGranted
                              ? 'bg-emerald-500/15 text-emerald-800'
                              : 'bg-rose-500/15 text-rose-800'
                          )}
                        >
                          {isGranted ? t.granted : t.revoked}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">{p.desc}</p>
                    </div>

                    {patient?.id && (
                      <button
                        type="button"
                        data-testid={`toggle-consent-${p.key}`}
                        onClick={() => handleToggleConsent(p.key, isGranted)}
                        className={clsx(
                          'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs select-none',
                          isGranted
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        )}
                      >
                        {isGranted ? t.revokeAction : t.grantAction}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Tamper-Evident SHA-256 Audit Trail */}
        {activeTab === 'audit' && (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface)] border border-black/5 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={clsx(
                    'w-4 h-4',
                    integrityStatus?.isValid ? 'text-emerald-600' : 'text-rose-600'
                  )}
                />
                <span className="font-semibold text-[var(--color-ink)]">
                  {integrityStatus?.isValid ? t.auditIntegrityPass : t.auditIntegrityFail}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
                {auditLogs.length} Events Logged
              </span>
            </div>

            <div className="flex-1 rounded-2xl bg-stone-900 border border-stone-800 p-3 overflow-y-auto font-mono text-xs text-stone-200 shadow-inner flex flex-col gap-2">
              {auditLogs.length === 0 ? (
                <p className="text-stone-500 text-center py-6">{t.emptyAudit}</p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    data-testid="audit-log-row"
                    className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800/80 flex flex-col gap-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between text-stone-400">
                      <span className="font-bold text-amber-300">
                        [{log.action}] {log.resourceType.toUpperCase()}
                      </span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-stone-200">{log.details}</p>
                    <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-900">
                      <span>Actor: {log.actorId} ({log.actorRole})</span>
                      <span title={log.hash}>Hash: {log.hash.slice(0, 16)}...</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </OverlaySheet>
  );
}
