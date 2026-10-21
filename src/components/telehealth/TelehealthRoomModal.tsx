'use client';

/**
 * TelehealthRoomModal.tsx — Phase L4: Telehealth Video Consultation Room
 * Specification: docs/PACK.md §11 (Phase L4), Egypt PDPL Law 151/2020.
 *
 * Provides:
 * 1. WebRTC teleconsultation simulation with audio/video/screen controls.
 * 2. Active call duration timer & real-time network telemetry indicator.
 * 3. Split-screen live clinical SOAP note documentation during encounter.
 * 4. Encounter stage advancement ('before' -> 'during' -> 'after').
 * 5. Egypt Law 151/2020 data subject teleconsultation consent disclosure.
 */

import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MonitorUp,
  Activity,
  Heart,
  ShieldCheck,
  Clock,
  Sparkles,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Wifi,
} from 'lucide-react';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import type { Patient, Visit, VisitStage } from '@/data/types';
import { en } from '@/i18n/en';

interface TelehealthRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  visit?: Visit;
  doctorName?: string;
  onUpdateVisitStage?: (visitId: string, stage: VisitStage, notes?: string) => Promise<void>;
  onUpdateVisitNotes?: (visitId: string, data: { notes?: string }) => Promise<void>;
  dict?: typeof en.telehealth;
}

export function TelehealthRoomModal({
  isOpen,
  onClose,
  patient,
  visit,
  doctorName = 'Dr. Tarek',
  onUpdateVisitStage,
  onUpdateVisitNotes,
  dict = en.telehealth,
}: TelehealthRoomModalProps) {
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [inCallNotes, setInCallNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Initialize and advance stage when call starts
  useEffect(() => {
    if (!isOpen) {
      setCallState('idle');
      setDurationSeconds(0);
      return;
    }

    setCallState('connecting');
    const timer = setTimeout(() => {
      setCallState('connected');
      if (visit && onUpdateVisitStage && visit.stage !== 'during') {
        onUpdateVisitStage(visit.id, 'during', 'Telehealth consultation session initiated');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isOpen, visit?.id]);

  // Duration timer increment
  useEffect(() => {
    if (callState !== 'connected') return;
    const interval = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callState]);

  // Format seconds to mm:ss
  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    setCallState('ended');
    const todayFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const finalNoteSummary = inCallNotes
      ? `${inCallNotes}\n\n[Telehealth Video Consult Concluded at ${todayFormatted} - Duration: ${formatDuration(durationSeconds)}]`
      : `[Telehealth Video Consult Concluded at ${todayFormatted} - Duration: ${formatDuration(durationSeconds)}]`;

    if (visit) {
      if (onUpdateVisitNotes && inCallNotes) {
        await onUpdateVisitNotes(visit.id, { notes: finalNoteSummary });
      }
      if (onUpdateVisitStage) {
        await onUpdateVisitStage(visit.id, 'after', finalNoteSummary);
      }
    }
  };

  const handleSaveNotes = async () => {
    if (!visit || !onUpdateVisitNotes || !inCallNotes.trim()) return;
    setIsSavingNotes(true);
    try {
      await onUpdateVisitNotes(visit.id, { notes: inCallNotes });
      setSavedSuccessMsg('Encounter notes saved successfully.');
      setTimeout(() => setSavedSuccessMsg(null), 3000);
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <OverlaySheet
      isOpen={isOpen}
      onClose={onClose}
      title={dict.title}
    >
      <div className="flex flex-col h-[82vh] max-h-[780px] font-['Inter',sans-serif]">
        {/* ========================================================================= */}
        {/* 1. TOP TELEHEALTH SESSION TELEMETRY BAR                                    */}
        {/* ========================================================================= */}
        <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-black/5 shadow-2xs mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={clsx(
                'w-3 h-3 rounded-full',
                callState === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : callState === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-stone-300'
              )}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-ink)]">
                  {callState === 'connected'
                    ? dict.connected
                    : callState === 'connecting'
                    ? dict.connecting
                    : dict.callEnded}
                </span>
                <span className="text-[10px] font-mono text-[var(--color-ink-muted)] bg-black/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  <span data-testid="telehealth-call-timer">{formatDuration(durationSeconds)}</span>
                </span>
              </div>
              <p className="text-[10.5px] font-mono text-[var(--color-ink-muted)] mt-0.5">
                {dict.networkQuality}
              </p>
            </div>
          </div>

          {/* Privacy & Law 151/2020 consent pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10.5px] font-semibold border border-emerald-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{dict.consentBadge}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SPLIT INTERFACE: LIVE VIDEO FEED & CLINICAL DOCUMENTATION              */}
        {/* ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
          {/* Main Video Stage (Left 7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-stone-900 text-white relative overflow-hidden shadow-sm p-4">
            {/* Top Video Header Overlay */}
            <div className="flex items-center justify-between z-10 select-none">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[11px] font-semibold text-white border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{patient.name}</span>
                <span className="text-stone-400 font-mono text-[10px]">{patient.mrn}</span>
              </div>

              {/* Patient Live Telemetry Simulation */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-mono text-emerald-300 border border-white/10">
                <Heart className="w-3 h-3 text-rose-400 stroke-[2.2]" />
                <span>76 bpm</span>
                <span className="text-stone-400">·</span>
                <span>BP 120/80</span>
                <span className="text-stone-400">·</span>
                <span>SpO2 98%</span>
              </div>
            </div>

            {/* Central Simulated Patient Video Frame */}
            <div className="flex-1 flex flex-col items-center justify-center relative my-2 select-none">
              {callState === 'connecting' ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-full border-3 border-emerald-400 border-t-transparent animate-spin flex items-center justify-center" />
                  <p className="text-xs text-stone-300 font-mono">{dict.connecting}</p>
                </div>
              ) : callState === 'ended' ? (
                <div className="flex flex-col items-center gap-2 text-center p-6 bg-black/40 rounded-2xl border border-white/10">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">{dict.callEnded}</h4>
                  <p className="text-xs text-stone-300 font-mono">
                    Session Duration: {formatDuration(durationSeconds)}
                  </p>
                </div>
              ) : (
                <div className="w-full h-full max-h-[380px] rounded-xl bg-stone-800/90 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Subtle video background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-stone-900 via-stone-800 to-stone-950 opacity-90" />

                  {/* Animated sound wave bars */}
                  <div className="z-10 flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-stone-700 border-2 border-white/20 flex items-center justify-center text-xl font-bold shadow-md">
                      {patient.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1 h-5">
                      {[40, 75, 55, 90, 60, 80, 45, 65].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 bg-emerald-400 rounded-full animate-pulse"
                          style={{
                            height: `${h}%`,
                            animationDelay: `${i * 120}ms`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-stone-300 font-medium">{dict.patientVideo}</span>
                  </div>

                  {/* Picture-in-Picture Doctor Preview (Bottom Right) */}
                  <div
                    className={clsx(
                      'absolute bottom-3 right-3 w-28 h-20 rounded-lg bg-stone-700 border border-white/20 shadow-lg overflow-hidden flex flex-col items-center justify-center z-20 transition-all',
                      isVideoOff && 'opacity-60'
                    )}
                    data-testid="doctor-pip-preview"
                  >
                    {isVideoOff ? (
                      <VideoOff className="w-5 h-5 text-stone-400" />
                    ) : (
                      <div className="w-full h-full bg-stone-800 flex flex-col items-center justify-center text-[10px] font-mono text-stone-300">
                        <span className="font-bold">{doctorName}</span>
                        <span className="text-[8px] text-stone-400">Attending</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom In-Call Media Controls Bar */}
            <div className="flex items-center justify-center gap-2.5 z-10 pt-1">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md',
                  isMuted ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-stone-700 hover:bg-stone-600 text-white'
                )}
                data-testid="telehealth-mute-button"
                title={isMuted ? dict.unmuteMic : dict.muteMic}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsVideoOff((prev) => !prev)}
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md',
                  isVideoOff ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-stone-700 hover:bg-stone-600 text-white'
                )}
                data-testid="telehealth-video-button"
                title={isVideoOff ? dict.turnOnCamera : dict.turnOffCamera}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsScreenSharing((prev) => !prev)}
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md',
                  isScreenSharing
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-stone-700 hover:bg-stone-600 text-white'
                )}
                data-testid="telehealth-screen-button"
                title={isScreenSharing ? dict.stopShare : dict.shareScreen}
              >
                <MonitorUp className="w-4 h-4" />
              </button>

              {callState === 'connected' && (
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="px-4 h-10 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  data-testid="telehealth-end-call-button"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>{dict.endCall}</span>
                </button>
              )}
            </div>
          </div>

          {/* Clinical SOAP Documentation Panel (Right 5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-[var(--color-surface)] border border-black/5 shadow-2xs p-4">
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--color-ink)]" />
                  <span className="text-xs font-bold text-[var(--color-ink)]">{dict.inCallNotes}</span>
                </div>
                {visit && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-[var(--color-ink-muted)]">
                    Encounter: {visit.visitType}
                  </span>
                )}
              </div>

              {savedSuccessMsg && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{savedSuccessMsg}</span>
                </div>
              )}

              <div className="flex-1 flex flex-col min-h-0">
                <textarea
                  value={inCallNotes}
                  onChange={(e) => setInCallNotes(e.target.value)}
                  placeholder={dict.notesPlaceholder}
                  className="w-full flex-1 p-3 rounded-xl bg-white border border-stone-200 text-xs text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] resize-none font-sans leading-relaxed"
                  data-testid="telehealth-notes-input"
                />
              </div>

              {/* Quick SOAP shortcuts */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {['Subjective', 'Objective', 'Assessment', 'Plan'].map((soap) => (
                  <button
                    key={soap}
                    type="button"
                    onClick={() => {
                      setInCallNotes((prev) =>
                        prev ? `${prev}\n\n[${soap}]: ` : `[${soap}]: `
                      );
                    }}
                    className="px-2.5 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[10px] font-semibold text-[var(--color-ink)] border border-black/5 transition-all cursor-pointer"
                  >
                    + {soap}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-black/5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
                {visit?.stage === 'during' ? dict.stageAdvancement : 'Clinical encounter active'}
              </span>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes || !inCallNotes.trim()}
                className="px-4 py-2 rounded-full bg-[var(--color-ink)] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                data-testid="telehealth-save-notes-button"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingNotes ? 'Saving...' : dict.saveNotes}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </OverlaySheet>
  );
}
