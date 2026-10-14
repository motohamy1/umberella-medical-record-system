'use client';

/**
 * AddPatientSheet — Modal sheet for registering a new patient.
 * Validates with Zod, submits via Server Action under RLS, and persists to data store.
 */

import React, { useState } from 'react';
import { OverlaySheet } from '../overlays/OverlaySheet';
import { createPatientAction } from '@/data/actions';
import type { Patient, Sex, PatientStatus } from '@/data/types';

export interface AddPatientSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPatient: Patient) => void;
}

export function AddPatientSheet({ isOpen, onClose, onSuccess }: AddPatientSheetProps) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: '',
    sex: 'Male' as Sex,
    age: '',
    dateOfBirth: '',
    phone: '',
    status: 'New' as PatientStatus,
    primaryConcern: '',
    socialHistory: '',
    carePlan: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setFieldErrors({});

    const body = new FormData();
    body.append('name', formData.name);
    body.append('sex', formData.sex);
    body.append('age', formData.age);
    body.append('dateOfBirth', formData.dateOfBirth);
    body.append('phone', formData.phone);
    body.append('status', formData.status);
    body.append('primaryConcern', formData.primaryConcern);
    if (formData.socialHistory) body.append('socialHistory', formData.socialHistory);
    if (formData.carePlan) body.append('carePlan', formData.carePlan);

    const res = await createPatientAction({ success: false }, body);
    setIsPending(false);

    if (res.success && res.data) {
      onSuccess(res.data);
      onClose();
      setFormData({
        name: '',
        sex: 'Male',
        age: '',
        dateOfBirth: '',
        phone: '',
        status: 'New',
        primaryConcern: '',
        socialHistory: '',
        carePlan: '',
      });
    } else {
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
      }
      setErrorMessage(res.error || 'Failed to save patient');
    }
  };

  return (
    <OverlaySheet isOpen={isOpen} onClose={onClose} title="Add New Patient">
      <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[var(--color-status-critical)]/15 border border-[var(--color-status-critical)]/40 text-xs text-[var(--color-ink)]">
            {errorMessage}
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Mostafa Ibrahim"
            className="w-full px-3.5 py-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/30 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
          />
          {fieldErrors.name && (
            <p className="text-[11px] text-[var(--color-status-critical)] mt-0.5">{fieldErrors.name}</p>
          )}
        </div>

        {/* Sex & Age */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
              Sex *
            </label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/30 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
              Age *
            </label>
            <input
              type="number"
              name="age"
              required
              min="0"
              max="130"
              value={formData.age}
              onChange={handleChange}
              placeholder="e.g. 54"
              className="w-full px-3.5 py-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/30 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
            />
            {fieldErrors.age && (
              <p className="text-[11px] text-[var(--color-status-critical)] mt-0.5">{fieldErrors.age}</p>
            )}
          </div>
        </div>

        {/* Date of Birth & Phone */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
              Date of Birth *
            </label>
            <input
              type="date"
              name="dateOfBirth"
              required
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/30 text-xs text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
            />
            {fieldErrors.dateOfBirth && (
              <p className="text-[11px] text-[var(--color-status-critical)] mt-0.5">{fieldErrors.dateOfBirth}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +20 100 482 9102"
              className="w-full px-3.5 py-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/30 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
            />
            {fieldErrors.phone && (
              <p className="text-[11px] text-[var(--color-status-critical)] mt-0.5">{fieldErrors.phone}</p>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
            Clinical Status *
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/30 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
          >
            <option value="New">New</option>
            <option value="Stable">Stable</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Needs review">Needs review</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        {/* Primary Concern */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
            Primary Concern / Chief Complaint *
          </label>
          <input
            type="text"
            name="primaryConcern"
            required
            value={formData.primaryConcern}
            onChange={handleChange}
            placeholder="e.g. Hypertension and T2D follow-up"
            className="w-full px-3.5 py-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/30 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
          />
          {fieldErrors.primaryConcern && (
            <p className="text-[11px] text-[var(--color-status-critical)] mt-0.5">{fieldErrors.primaryConcern}</p>
          )}
        </div>

        {/* Social History (optional) */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
            Social History (Optional)
          </label>
          <input
            type="text"
            name="socialHistory"
            value={formData.socialHistory}
            onChange={handleChange}
            placeholder="e.g. Non-smoker, active"
            className="w-full px-3.5 py-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/30 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
          />
        </div>

        {/* Care Plan (optional) */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
            Active Care Plan (Optional)
          </label>
          <input
            type="text"
            name="carePlan"
            value={formData.carePlan}
            onChange={handleChange}
            placeholder="e.g. HTN & T2D Management 2026"
            className="w-full px-3.5 py-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/30 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-ink-soft)]/20">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-ink)] text-xs font-semibold hover:bg-[var(--color-white)] transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-white)] text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Patient'}
          </button>
        </div>
      </form>
    </OverlaySheet>
  );
}
