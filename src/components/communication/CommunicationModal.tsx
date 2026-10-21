'use client';

/**
 * CommunicationModal.tsx — Phase L3: In-App & External Communication Drawer
 * Specification: docs/PACK.md §11 (Phase L3), Egypt PDPL Law 151/2020.
 *
 * Provides:
 * 1. Provider-Patient in-app message thread with timestamps and read receipts.
 * 2. WhatsApp (Meta Graph API) & Telegram Bot external dispatch adapters.
 * 3. Quick clinical notification templates (Appointment, Labs, Medication refill, Vitals check-in).
 * 4. Egypt Law 151/2020 consent validation for external channels.
 */

import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import {
  MessageSquare,
  Send,
  Check,
  CheckCheck,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Smartphone,
  Phone,
  SendHorizonal,
} from 'lucide-react';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import type { Patient, ChatMessage, MessageChannel, MessageDeliveryStatus } from '@/data/types';
import {
  CLINICAL_MESSAGE_TEMPLATES,
  renderTemplate,
} from '@/data/messagingAdapters';
import {
  fetchPatientMessagesAction,
  sendChatMessageAction,
  dispatchExternalNotificationAction,
} from '@/data/actions';
import { en } from '@/i18n/en';

interface CommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  doctorName?: string;
  dict?: typeof en.communication;
}

export function CommunicationModal({
  isOpen,
  onClose,
  patient,
  doctorName = 'Dr. Tarek',
  dict = en.communication,
}: CommunicationModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel>('in_app');
  const [messageText, setMessageText] = useState<string>('');
  const [hasConsent, setHasConsent] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load message thread
  useEffect(() => {
    if (!isOpen || !patient?.id) return;
    let isMounted = true;
    fetchPatientMessagesAction(patient.id).then((data) => {
      if (isMounted) {
        setMessages(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, patient?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleApplyTemplate = (templateKey: string) => {
    try {
      const rendered = renderTemplate(templateKey, 'en', {
        patientName: patient.name,
        clinicName: 'Nile Health Clinic',
        appointmentDate: 'Tomorrow at 10:00 AM',
        testName: 'Comprehensive Metabolic Panel (CMP)',
        medicationName: 'Amlodipine 5mg',
      });
      setMessageText(rendered);
      setErrorMessage(null);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    if (selectedChannel !== 'in_app' && !hasConsent) {
      setErrorMessage(dict.consentRequiredWarning);
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      if (selectedChannel === 'in_app') {
        const res = await sendChatMessageAction({
          patientId: patient.id,
          senderRole: 'doctor',
          senderName: doctorName,
          channel: 'in_app',
          content: messageText.trim(),
        });
        if (res.success && res.data) {
          setMessages((prev) => [...prev, res.data!]);
          setMessageText('');
        } else {
          setErrorMessage(res.error || 'Failed to send message');
        }
      } else {
        const res = await dispatchExternalNotificationAction({
          patientId: patient.id,
          channel: selectedChannel,
          customContent: messageText.trim(),
          consentObtained: hasConsent,
          senderName: doctorName,
          recipientPhone: patient.phone,
          telegramChatId: patient.name.toLowerCase().replace(/\s+/g, '_'),
        });
        if (res.success && res.data) {
          setMessages((prev) => [...prev, res.data!]);
          setMessageText('');
        } else {
          setErrorMessage(res.error || 'Failed to dispatch notification');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Message dispatch failed';
      setErrorMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  const renderStatusIcon = (status: MessageDeliveryStatus) => {
    switch (status) {
      case 'read':
        return (
          <span title={dict.read}>
            <CheckCheck className="w-3.5 h-3.5 text-blue-500 stroke-[2.2]" />
          </span>
        );
      case 'delivered':
        return (
          <span title={dict.delivered}>
            <CheckCheck className="w-3.5 h-3.5 text-stone-400 stroke-[2]" />
          </span>
        );
      case 'sent':
        return (
          <span title={dict.sent}>
            <Check className="w-3.5 h-3.5 text-stone-400 stroke-[2]" />
          </span>
        );
      case 'queued':
      default:
        return (
          <span title={dict.queued}>
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          </span>
        );
    }
  };

  return (
    <OverlaySheet
      isOpen={isOpen}
      onClose={onClose}
      title={dict.title}
    >
      <div className="flex flex-col h-[75vh] max-h-[700px] text-start font-['Inter',sans-serif]">
        {/* ========================================================================= */}
        {/* 1. RECIPIENT & CHANNEL BAR                                                */}
        {/* ========================================================================= */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-black/5 shadow-2xs mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--color-ink)] text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {patient.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-ink)]">{patient.name}</span>
                <span className="text-[10px] font-mono text-[var(--color-ink-muted)] bg-black/5 px-2 py-0.5 rounded-full">
                  {patient.mrn}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                <Phone className="w-3 h-3 text-[var(--color-ink-muted)]" />
                <span>{patient.phone || '+20 100 000 0000'}</span>
              </div>
            </div>
          </div>

          {/* Channel selector pills */}
          <div className="inline-flex items-center p-1 rounded-full bg-[var(--color-surface-subtle)] border border-black/5 shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedChannel('in_app')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer',
                selectedChannel === 'in_app'
                  ? 'bg-[var(--color-ink)] text-white shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              )}
              data-testid="channel-pill-in-app"
            >
              {dict.inAppChannel}
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel('whatsapp')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer',
                selectedChannel === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-emerald-700'
              )}
              data-testid="channel-pill-whatsapp"
            >
              {dict.whatsappChannel}
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel('telegram')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer',
                selectedChannel === 'telegram'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-sky-700'
              )}
              data-testid="channel-pill-telegram"
            >
              {dict.telegramChannel}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. LAW 151/2020 CONSENT INDICATOR FOR EXTERNAL CHANNELS                  */}
        {/* ========================================================================= */}
        {selectedChannel !== 'in_app' && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-[11px] mb-2 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{dict.consentLaw151}</p>
                <label className="flex items-center gap-1.5 mt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasConsent}
                    onChange={(e) => setHasConsent(e.target.checked)}
                    className="rounded text-[var(--color-ink)] focus:ring-[var(--color-ink)]"
                    data-testid="consent-checkbox-law151"
                  />
                  <span>{dict.consentCheckbox}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. MESSAGE THREAD CONTAINER                                               */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-black/5 shadow-inner space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--color-ink-muted)]">
              <MessageSquare className="w-8 h-8 mb-2 stroke-[1.5] opacity-50" />
              <h5 className="text-xs font-bold text-[var(--color-ink)]">{dict.noMessages}</h5>
              <p className="text-[11px] max-w-xs mt-1">{dict.noMessagesDesc}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isDoctor = msg.senderRole === 'doctor';
              return (
                <div
                  key={msg.id}
                  className={clsx(
                    'flex flex-col max-w-[85%] sm:max-w-[75%]',
                    isDoctor ? 'ms-auto items-end' : 'me-auto items-start'
                  )}
                  data-testid={`chat-message-${msg.id}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold text-[var(--color-ink-muted)]">
                      {isDoctor ? `${doctorName} (${dict.doctorRole})` : `${patient.name} (${dict.patientRole})`}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/5 text-[var(--color-ink-muted)] uppercase">
                      {msg.channel.replace('_', ' ')}
                    </span>
                  </div>

                  <div
                    className={clsx(
                      'p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-2xs',
                      isDoctor
                        ? 'bg-[var(--color-ink)] text-white rounded-tr-xs'
                        : 'bg-white text-[var(--color-ink)] border border-black/10 rounded-tl-xs'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-[var(--color-ink-muted)] font-mono">
                    <span>
                      {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isDoctor && renderStatusIcon(msg.status)}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ========================================================================= */}
        {/* 4. QUICK CLINICAL TEMPLATES BAR                                           */}
        {/* ========================================================================= */}
        <div className="pt-2">
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wide">
            <Sparkles className="w-3 h-3 text-[var(--color-ink)]" />
            <span>{dict.quickTemplates}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pb-2">
            <button
              type="button"
              onClick={() => handleApplyTemplate('appointment_reminder')}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-[11px] font-medium text-[var(--color-ink)] transition-all cursor-pointer shadow-2xs"
              data-testid="template-pill-appointment"
            >
              {dict.templateAppointment}
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('lab_ready')}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-[11px] font-medium text-[var(--color-ink)] transition-all cursor-pointer shadow-2xs"
              data-testid="template-pill-lab"
            >
              {dict.templateLab}
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('medication_refill')}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-[11px] font-medium text-[var(--color-ink)] transition-all cursor-pointer shadow-2xs"
              data-testid="template-pill-medication"
            >
              {dict.templateMedication}
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('care_plan_checkin')}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-[11px] font-medium text-[var(--color-ink)] transition-all cursor-pointer shadow-2xs"
              data-testid="template-pill-checkin"
            >
              {dict.templateCheckin}
            </button>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-2 mb-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. COMPOSER & SEND                                                        */}
        {/* ========================================================================= */}
        <form onSubmit={handleSendMessage} className="pt-1 flex items-center gap-2">
          <textarea
            rows={2}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={dict.messagePlaceholder}
            className="flex-1 p-2.5 rounded-xl bg-white border border-stone-200 text-xs text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] resize-none"
            data-testid="chat-input-textarea"
          />
          <button
            type="submit"
            disabled={isSending || !messageText.trim() || (selectedChannel !== 'in_app' && !hasConsent)}
            className="h-full px-4 py-2.5 rounded-xl bg-[var(--color-ink)] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            data-testid="chat-send-button"
          >
            {isSending ? (
              <span>{dict.sending}</span>
            ) : (
              <>
                <span>{dict.send}</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </OverlaySheet>
  );
}
