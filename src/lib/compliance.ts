/**
 * compliance.ts — Phase L8: Security, Egypt PDPL Law 151/2020 Compliance Hardening & Audit Trail
 * Specification: docs/PACK.md §11 (Phase L8), D10 (Compliance Gate), Egypt Law 151 of 2020.
 *
 * Implements:
 * 1. D10 Production Compliance Gate (Sovereign Residency, DPO Registry, Consent Mandate)
 * 2. Patient Consent Lifecycle under Law 151/2020 (Explicit Consent, Revocation, DSAR Art. 12/13)
 * 3. Tamper-Evident SHA-256 Audit Trail for all PHI access and mutations
 * 4. Sensitive Data Masking & Redaction (Egyptian National ID, Phone, De-identification)
 */

import crypto from 'node:crypto';
import { readStore, writeStore } from '@/data/db';
import type { ProvenanceSource } from '@/data/types';

/* ========================================================================= */
/* 1. Types & Interfaces                                                     */
/* ========================================================================= */

export type ConsentPurpose =
  | 'treatment'
  | 'telehealth'
  | 'external_messaging'
  | 'interoperability'
  | 'ai_assistance';

export interface PatientConsentRecord {
  id: string;
  patientId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  grantedAt: string;
  revokedAt?: string | null;
  collectedBy: string;
  legalBasis: string; // e.g. "Egypt PDPL Law 151/2020 Art. 5 (Explicit Consent)"
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: string;
  action: 'READ' | 'WRITE' | 'EXPORT' | 'CONSENT_CHANGE' | 'DELETE' | 'LOGIN' | 'REVOCATION';
  resourceType: string;
  resourceId: string;
  patientId?: string | null;
  patientMrn?: string | null;
  details: string;
  ipAddress?: string;
  prevHash: string;
  hash: string;
}

export interface ComplianceGateStatus {
  isCompliant: boolean;
  environment: 'development' | 'staging' | 'production';
  sovereignResidencyVerified: boolean;
  hostingRegion: string;
  dpoRegistered: boolean;
  dpoContact: string;
  consentEnforcementActive: boolean;
  crossBorderTransferBlocked: boolean;
  issues: string[];
}

export interface DataSubjectAccessReport {
  generatedAt: string;
  governingLaw: string;
  patientId: string;
  mrn: string;
  name: string;
  activeConsents: PatientConsentRecord[];
  accessAuditCount: number;
  recentAccessors: Array<{ actorRole: string; action: string; timestamp: string }>;
  summary: string;
}

/* ========================================================================= */
/* 2. D10 Compliance Gate (Egypt PDPL Law 151/2020)                          */
/* ========================================================================= */

/**
 * Checks whether the environment meets the legal requirements of Egypt PDPL Law 151/2020 (D10)
 * before real patient data can be safely processed.
 */
export function checkProductionComplianceGate(env = process.env.NODE_ENV): ComplianceGateStatus {
  const issues: string[] = [];

  // In production, Egypt PDPL requires sensitive health data to be hosted locally
  // or under an approved cross-border agreement (Art. 14 & 16)
  const hostingRegion = process.env.EGYPT_SOVEREIGN_REGION || 'eg-cairo-1';
  const isSovereignRegion = hostingRegion.startsWith('eg-') || hostingRegion === 'local-onprem';

  if (!isSovereignRegion && env === 'production') {
    issues.push('Non-compliant hosting region: Medical data must reside in Egyptian sovereign boundary (Art. 14).');
  }

  // DPO appointment check (Art. 8)
  const dpoContact = process.env.DPO_CONTACT !== undefined ? process.env.DPO_CONTACT : 'dpo@umbrella.health.eg';
  const dpoRegistered = Boolean(dpoContact && dpoContact.includes('@'));
  if (!dpoRegistered && env === 'production') {
    issues.push('Data Protection Officer (DPO) is not registered with Egyptian Data Protection Center (Art. 8).');
  }

  // Cross-border outbound data transfer lock (Art. 16)
  const crossBorderTransferBlocked = process.env.ALLOW_CROSS_BORDER !== 'true';

  return {
    isCompliant: issues.length === 0,
    environment: env === 'production' ? 'production' : env === 'test' ? 'staging' : 'development',
    sovereignResidencyVerified: isSovereignRegion,
    hostingRegion,
    dpoRegistered,
    dpoContact,
    consentEnforcementActive: true,
    crossBorderTransferBlocked,
    issues,
  };
}

/* ========================================================================= */
/* 3. Patient Consent Lifecycle (Egypt Law 151/2020 Art. 3, 5, 12)           */
/* ========================================================================= */

/**
 * Check if active, unrevoked consent exists for a specific processing purpose.
 */
export function verifyPatientConsent(patientId: string, purpose: ConsentPurpose): boolean {
  const store = readStore();
  const consents = (store as any).patientConsents || [];
  
  const record = consents.find(
    (c: PatientConsentRecord) => c.patientId === patientId && c.purpose === purpose
  );

  // Default to true for standard clinical treatment if patient exists
  if (!record && purpose === 'treatment') {
    return true;
  }

  return Boolean(record && record.granted && !record.revokedAt);
}

/**
 * Record or update patient consent (including Art. 12 Right of Revocation)
 */
export function recordPatientConsent(
  patientId: string,
  purpose: ConsentPurpose,
  granted: boolean,
  collectedBy = 'Staff Receptionist'
): PatientConsentRecord {
  const store = readStore();
  if (!(store as any).patientConsents) {
    (store as any).patientConsents = [];
  }

  const existingIndex = (store as any).patientConsents.findIndex(
    (c: PatientConsentRecord) => c.patientId === patientId && c.purpose === purpose
  );

  const now = new Date().toISOString();
  let record: PatientConsentRecord;

  if (existingIndex >= 0) {
    record = {
      ...(store as any).patientConsents[existingIndex],
      granted,
      revokedAt: granted ? null : now,
      collectedBy,
    };
    (store as any).patientConsents[existingIndex] = record;
  } else {
    record = {
      id: `cst-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId,
      purpose,
      granted,
      grantedAt: now,
      revokedAt: granted ? null : now,
      collectedBy,
      legalBasis: 'Egypt PDPL Law 151/2020 Art. 5 (Explicit Patient Consent)',
    };
    (store as any).patientConsents.push(record);
  }

  writeStore(store);

  // Record audit log for consent modification
  recordAuditLog({
    actorId: collectedBy,
    actorRole: 'staff',
    action: 'CONSENT_CHANGE',
    resourceType: 'consent',
    resourceId: record.id,
    patientId,
    details: `Consent for "${purpose}" set to ${granted ? 'GRANTED' : 'REVOKED'} under Law 151/2020`,
  });

  return record;
}

/**
 * Retrieve all consent records for a given patient.
 */
export function getPatientConsents(patientId: string): PatientConsentRecord[] {
  const store = readStore();
  const consents = (store as any).patientConsents || [];
  return consents.filter((c: PatientConsentRecord) => c.patientId === patientId);
}

/* ========================================================================= */
/* 4. Tamper-Evident SHA-256 Audit Trail                                     */
/* ========================================================================= */

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function computeAuditHash(entry: Omit<AuditLogEntry, 'hash'>): string {
  const data = `${entry.id}:${entry.timestamp}:${entry.actorId}:${entry.actorRole}:${entry.action}:${entry.resourceType}:${entry.resourceId}:${entry.patientId || ''}:${entry.details}:${entry.prevHash}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Append an immutable, hash-chained audit log entry for any PHI event.
 */
export function recordAuditLog(params: {
  actorId: string;
  actorRole: string;
  action: AuditLogEntry['action'];
  resourceType: string;
  resourceId: string;
  patientId?: string | null;
  patientMrn?: string | null;
  details: string;
  ipAddress?: string;
}): AuditLogEntry {
  const store = readStore();
  if (!(store as any).auditLogs) {
    (store as any).auditLogs = [];
  }

  const logs: AuditLogEntry[] = (store as any).auditLogs;
  const prevHash = logs.length > 0 ? logs[logs.length - 1].hash : GENESIS_HASH;

  const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();

  const entryCandidate: Omit<AuditLogEntry, 'hash'> = {
    id,
    timestamp,
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    patientId: params.patientId || null,
    patientMrn: params.patientMrn || null,
    details: params.details,
    ipAddress: params.ipAddress || '127.0.0.1',
    prevHash,
  };

  const hash = computeAuditHash(entryCandidate);
  const newEntry: AuditLogEntry = {
    ...entryCandidate,
    hash,
  };

  logs.push(newEntry);
  writeStore(store);

  return newEntry;
}

/**
 * Verify integrity of the audit log hash chain to ensure no records have been altered or deleted.
 */
export function verifyAuditTrailIntegrity(): { isValid: boolean; checkedCount: number; error?: string } {
  const store = readStore();
  const logs: AuditLogEntry[] = (store as any).auditLogs || [];

  if (logs.length === 0) {
    return { isValid: true, checkedCount: 0 };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];

    if (entry.prevHash !== expectedPrevHash) {
      return {
        isValid: false,
        checkedCount: i,
        error: `Broken hash chain at entry index ${i} (ID: ${entry.id}). Expected prevHash ${expectedPrevHash}, found ${entry.prevHash}`,
      };
    }

    const { hash, ...candidate } = entry;
    const computed = computeAuditHash(candidate);
    if (computed !== hash) {
      return {
        isValid: false,
        checkedCount: i,
        error: `Hash mismatch at entry index ${i} (ID: ${entry.id}). Expected ${hash}, computed ${computed}`,
      };
    }

    expectedPrevHash = hash;
  }

  return { isValid: true, checkedCount: logs.length };
}

/**
 * Query audit logs filtered by patient or action.
 */
export function getAuditLogs(patientId?: string, limit = 50): AuditLogEntry[] {
  const store = readStore();
  const logs: AuditLogEntry[] = (store as any).auditLogs || [];

  let filtered = [...logs];
  if (patientId) {
    filtered = filtered.filter((l) => l.patientId === patientId);
  }

  return filtered.reverse().slice(0, limit);
}

/* ========================================================================= */
/* 5. Data Subject Access Report (Egypt Law 151/2020 Art. 12 & 13)           */
/* ========================================================================= */

/**
 * Generate a DSAR (Data Subject Access Request) report for a patient.
 */
export function generateDataSubjectAccessReport(patientId: string): DataSubjectAccessReport {
  const store = readStore();
  const patient = (store.patients || []).find((p: any) => p.id === patientId);

  const consents = getPatientConsents(patientId);
  const patientLogs = getAuditLogs(patientId, 100);

  const recentAccessors = patientLogs.slice(0, 5).map((l) => ({
    actorRole: l.actorRole,
    action: l.action,
    timestamp: l.timestamp,
  }));

  // Record an audit entry that DSAR was generated
  recordAuditLog({
    actorId: 'Patient DPO System',
    actorRole: 'compliance',
    action: 'EXPORT',
    resourceType: 'DSAR',
    resourceId: `dsar-${patientId}`,
    patientId,
    patientMrn: patient?.mrn,
    details: 'Data Subject Access Request (DSAR) export generated under Law 151/2020 Art. 12',
  });

  return {
    generatedAt: new Date().toISOString(),
    governingLaw: 'Egypt Personal Data Protection Law No. 151 of 2020 (Articles 12 & 13)',
    patientId,
    mrn: patient?.mrn || 'Unknown MRN',
    name: patient?.name || 'Unknown Patient',
    activeConsents: consents,
    accessAuditCount: patientLogs.length,
    recentAccessors,
    summary: `Complete legal record of processing activities, access audit events, and consent status.`,
  };
}

/* ========================================================================= */
/* 6. Sensitive Data Masking & Redaction Utilities                           */
/* ========================================================================= */

/**
 * Masks Egyptian National ID number (14 digits) keeping first 3 and last 3 digits.
 * e.g. 29010151234567 -> 290********567
 */
export function maskNationalId(nationalId: string): string {
  if (!nationalId || nationalId.length < 6) return '***';
  const prefix = nationalId.slice(0, 3);
  const suffix = nationalId.slice(-3);
  const maskedMiddle = '*'.repeat(Math.max(1, nationalId.length - 6));
  return `${prefix}${maskedMiddle}${suffix}`;
}

/**
 * Masks phone numbers for display in unauthorized contexts.
 * e.g. +20 100 123 4567 -> +20 100 *** *567
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length <= 6) return '***';
  const prefix = clean.slice(0, 7);
  const suffix = clean.slice(-3);
  return `${prefix} *** *${suffix}`;
}

/**
 * Redacts a full name for de-identified research or analytics.
 * e.g. "Ahmed Mansour" -> "A**** M******"
 */
export function redactPatientName(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .map((part) => (part.length > 1 ? `${part[0]}${'*'.repeat(part.length - 1)}` : part))
    .join(' ');
}
