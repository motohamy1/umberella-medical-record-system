'use client';

/**
 * PrescriptionOCRModal — Section 11 Phase L1: Prescription OCR & Verification.
 *
 * Requirements:
 * - Patient consent required before processing (Egypt PDPL Law 151/2020, D9).
 * - Multi-source intake: File Upload, Live Web Camera, Phone Camera via QR Code, and Demo Samples.
 * - Real Vision OCR (Gemini Vision Multimodal) with fallback to EDA catalog matching (D8).
 * - Flags items with confidence < 0.85 as uncertain (Rule 12: uncertain fields flagged, never guessed).
 * - AI assists and never decides: clinician must confirm before adding to active medications.
 * - Writes to repository with source: 'ocr', verified by doctor with provenance audit.
 */

import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import {
  FileText,
  Scan,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Edit3,
  X,
  Camera,
  Upload,
  QrCode,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import QRCode from 'qrcode';
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

type IntakeMode = 'upload' | 'camera' | 'mobile' | 'samples';

export function PrescriptionOCRModal({
  isOpen,
  onClose,
  patientId,
  onMedicationAdded,
  dict = en.ocr,
}: PrescriptionOCRModalProps) {
  // Navigation & Intake Mode
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('upload');
  const [showSamplesAccordion, setShowSamplesAccordion] = useState<boolean>(false);

  // Selected Image or Sample
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>('');
  const [selectedSampleId, setSelectedSampleId] = useState<string>('rx-sample-01');

  // Consent & Processing
  const [consentObtained, setConsentObtained] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<PrescriptionScanResult | null>(null);
  const [confirmedItems, setConfirmedItems] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<ExtractedPrescriptionItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

  // Mobile QR Pairing State
  const [mobileSessionId, setMobileSessionId] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isCopiedLink, setIsCopiedLink] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop active camera helper
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  // Start active camera helper
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied or unavailable';
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  // Initialize or reset session when modal opens
  useEffect(() => {
    if (isOpen) {
      const newSession = `ocr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setMobileSessionId(newSession);

      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        const mobileUrl = `${origin}/clinic/ocr-mobile?session=${newSession}&patientId=${patientId}`;
        QRCode.toDataURL(mobileUrl, { width: 220, margin: 1 })
          .then((url) => setQrCodeDataUrl(url))
          .catch((err) => console.error('Failed to generate QR:', err));
      }
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, patientId]);

  // Clean up camera stream when switching away or unmounting
  useEffect(() => {
    if (intakeMode !== 'camera') {
      stopCamera();
    } else if (isOpen && !selectedImageUri) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeMode, isOpen, selectedImageUri, cameraFacing]);

  // Poll for mobile photo upload when in 'mobile' mode
  useEffect(() => {
    if (!isOpen || !mobileSessionId || selectedImageUri || intakeMode !== 'mobile') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ocr-session?session=${mobileSessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ready && data.imageDataUri) {
          setSelectedImageUri(data.imageDataUri);
          setSelectedImageName(data.fileName || 'mobile_camera_rx.jpg');
          clearInterval(interval);
        }
      } catch {
        // Continue polling silently
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isOpen, mobileSessionId, selectedImageUri, intakeMode]);

  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const captureCameraFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg', 0.92);
    setSelectedImageUri(dataUri);
    setSelectedImageName(`camera_capture_${Date.now()}.jpg`);
    stopCamera();
  };

  // File Upload Handlers
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setSelectedImageName(file.name);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageUri(reader.result as string);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file from disk');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  };

  const copyMobileLink = () => {
    if (typeof window !== 'undefined' && mobileSessionId) {
      const origin = window.location.origin;
      const mobileUrl = `${origin}/clinic/ocr-mobile?session=${mobileSessionId}&patientId=${patientId}`;
      navigator.clipboard.writeText(mobileUrl);
      setIsCopiedLink(true);
      setTimeout(() => setIsCopiedLink(false), 2000);
    }
  };

  // OCR Processing
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
        imageDataUri: selectedImageUri || undefined,
        imageFileName: selectedImageName || undefined,
        sampleId: intakeMode === 'samples' ? selectedSampleId : undefined,
        consentObtained,
      });

      if (res.success && res.data) {
        setScanResult(res.data);
      } else {
        setErrorMsg(res.error || 'Optical extraction failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Clinician Confirmation
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
    setSelectedImageUri(null);
    setSelectedImageName('');
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
      <div className="flex flex-col gap-3 text-left font-sans">
        {/* Subtitle - cleanly positioned with no negative margins */}
        <p className="text-xs text-[var(--color-ink-muted)]">
          {dict.subtitle}
        </p>

        {/* AI Rule 12 Clinical Safety Banner */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{dict.aiDisclaimer}</span>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!scanResult ? (
          /* ========================================================================= */
          /* STEP 1: INTAKE SELECTION & PATIENT CONSENT                                */
          /* ========================================================================= */
          <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-[var(--color-surface)] border border-black/5">
            {/* If an image is already selected/captured, show image preview stage */}
            {selectedImageUri ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--color-ink-muted)]" />
                    <span className="text-xs font-bold text-[var(--color-ink)]">
                      {selectedImageName || 'Prescription Image'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Ready for OCR
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedImageUri(null)}
                    className="text-xs font-semibold text-stone-600 hover:text-black underline cursor-pointer"
                  >
                    Change Image / Retake
                  </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-black/10 bg-stone-900 aspect-[16/9] max-h-72 flex items-center justify-center">
                  <img
                    src={selectedImageUri}
                    alt="Prescription preview"
                    className="w-full h-full object-contain"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white">
                      <div className="relative w-48 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-0 bg-[var(--color-accent-neon)] w-1/2 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Sparkles className="w-4 h-4 text-[var(--color-accent-neon)] animate-spin" />
                        <span>Transcribing &amp; Matching Egyptian Drug Catalog...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If no image selected yet, show the 3 Intake Modes */
              <div>
                {/* Intake Mode Switcher Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-200/60 w-fit mb-3">
                  <button
                    type="button"
                    onClick={() => setIntakeMode('upload')}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      intakeMode === 'upload'
                        ? 'bg-white text-[var(--color-ink)] shadow-2xs'
                        : 'text-stone-600 hover:text-black'
                    )}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntakeMode('camera')}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      intakeMode === 'camera'
                        ? 'bg-white text-[var(--color-ink)] shadow-2xs'
                        : 'text-stone-600 hover:text-black'
                    )}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Live Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntakeMode('mobile')}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      intakeMode === 'mobile'
                        ? 'bg-white text-[var(--color-ink)] shadow-2xs'
                        : 'text-stone-600 hover:text-black'
                    )}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan with Phone (QR)</span>
                  </button>
                </div>

                {/* 1. UPLOAD TAB */}
                {intakeMode === 'upload' && (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 hover:border-black rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-2.5 bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-stone-200 flex items-center justify-center text-stone-700">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-stone-900">
                        Click to browse or drag and drop prescription file
                      </span>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Supports high-resolution JPG, PNG, WEBP prescription photos
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. CAMERA TAB */}
                {intakeMode === 'camera' && (
                  <div className="flex flex-col gap-3">
                    {cameraError ? (
                      <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-center flex flex-col items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        <span className="text-xs font-bold text-red-900">Camera Unavailable</span>
                        <p className="text-[11px] text-red-700 max-w-sm">
                          {cameraError}. Please ensure browser camera permissions are enabled, or use the file upload or phone QR option.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIntakeMode('upload')}
                          className="mt-2 px-4 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold cursor-pointer"
                        >
                          Use File Upload Instead
                        </button>
                      </div>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[16/9] max-h-80 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        {/* Target alignment frame */}
                        <div className="absolute inset-8 border-2 border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
                          <span className="text-[11px] font-semibold text-white/90 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                            Align prescription within frame
                          </span>
                        </div>

                        {/* Camera Controls Bar */}
                        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3 px-4">
                          <button
                            type="button"
                            onClick={toggleCameraFacing}
                            className="p-2 rounded-full bg-black/60 hover:bg-black text-white text-xs backdrop-blur-xs transition-all cursor-pointer"
                            title="Flip camera"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={captureCameraFrame}
                            className="px-6 py-2 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Capture Photo</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. MOBILE QR TAB */}
                {intakeMode === 'mobile' && (
                  <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-stone-50 border border-stone-200">
                    <div className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-xs shrink-0">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="Mobile prescription QR code"
                          className="w-40 h-40 object-contain rounded-xl"
                        />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center text-xs text-stone-400">
                          Generating QR...
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 text-left">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-stone-700" />
                        <span className="text-xs font-bold text-stone-900">
                          Scan with your Mobile Phone
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        1. Point your smartphone camera at this QR code.<br />
                        2. Tap the link to open the camera capture page.<br />
                        3. Snap the paper prescription; it will sync directly onto this desktop screen!
                      </p>

                      <div className="flex items-center gap-2 pt-2 flex-wrap">
                        <button
                          type="button"
                          onClick={copyMobileLink}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200 bg-white text-xs font-bold text-stone-800 hover:bg-stone-100 transition-all cursor-pointer"
                        >
                          {isCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopiedLink ? 'Link Copied!' : 'Copy Mobile Link'}</span>
                        </button>
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Waiting for phone upload...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Subtle Samples Accordion (for quick demo evaluation) */}
            <div className="pt-2 border-t border-black/5">
              <button
                type="button"
                onClick={() => setShowSamplesAccordion((prev) => !prev)}
                className="flex items-center justify-between w-full text-[11px] font-semibold text-stone-500 hover:text-black py-1 cursor-pointer"
              >
                <span>Or evaluate with demo clinical prescriptions (Samples)</span>
                {showSamplesAccordion ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showSamplesAccordion && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-stone-200">
                  {SAMPLE_PRESCRIPTIONS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => {
                        setIntakeMode('samples');
                        setSelectedSampleId(sample.id);
                        setSelectedImageUri(null);
                        setSelectedImageName(sample.fileName);
                      }}
                      className={clsx(
                        'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                        intakeMode === 'samples' && selectedSampleId === sample.id && !selectedImageUri
                          ? 'bg-white border-[var(--color-ink)] shadow-2xs'
                          : 'bg-white/60 border-black/10 hover:bg-white'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[var(--color-ink)]">{sample.title}</span>
                        {intakeMode === 'samples' && selectedSampleId === sample.id && !selectedImageUri && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--color-ink-muted)] line-clamp-1">
                        {sample.rawText.split('\n').slice(0, 2).join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Patient Consent Checkbox (Egypt PDPL Law 151/2020) */}
            <div className="pt-3 border-t border-black/5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentObtained}
                  onChange={(e) => setConsentObtained(e.target.checked)}
                  className="mt-0.5 rounded border-black/20 text-[var(--color-ink)] focus:ring-[var(--color-accent-neon)]"
                />
                <span className="text-xs text-[var(--color-ink)] font-medium leading-tight">
                  {dict.consentCheckbox}
                </span>
              </label>
              <p className="text-[11px] text-[var(--color-ink-muted)] ml-6 mt-0.5">
                {dict.consentRequired}
              </p>
            </div>

            {/* Scan Action Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleStartOCR}
                disabled={isProcessing || !consentObtained || (!selectedImageUri && intakeMode !== 'samples')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] font-bold text-xs shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
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
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-black/5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-ink-muted)]" />
                <span className="text-xs font-bold text-[var(--color-ink)]">
                  {scanResult.imageFileName}
                </span>
                <span className="text-[10px] font-mono text-[var(--color-ink-muted)] bg-black/5 px-2 py-0.5 rounded-full">
                  Extracted {scanResult.items.length} medications
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
                          Edit Extracted Medication
                        </span>
                        <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                          Raw: &quot;{item.rawText}&quot;
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
                          className="px-4 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold hover:bg-black cursor-pointer shadow-2xs"
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
                      'p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                      isConfirmed
                        ? 'bg-emerald-50/40 border-emerald-300'
                        : item.isUncertain
                        ? 'bg-amber-50/40 border-amber-300'
                        : 'bg-white border-black/10 shadow-2xs'
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[var(--color-ink)]">
                          {item.medicationName}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 font-mono text-[var(--color-ink-muted)]">
                          {item.strength}
                        </span>
                        <span className="text-xs text-[var(--color-ink-muted)]">
                          {item.route}
                        </span>

                        {item.catalogMatch ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            EDA: {item.catalogMatch}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                            Uncataloged Medication
                          </span>
                        )}

                        {item.isUncertain && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            <span>Confidence {Math.round(item.confidence * 100)}% — Rule 12 Review</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-700">
                        <span className="font-semibold">{item.frequency}</span>
                        {item.instructions ? ` · ${item.instructions}` : ''}
                      </p>

                      <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                        Original line: &quot;{item.rawText}&quot;
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!isConfirmed && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="p-2 rounded-full border border-stone-200 hover:bg-stone-100 text-stone-600 transition-all cursor-pointer"
                            title="Edit fields"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismissItem(item.id)}
                            className="p-2 rounded-full border border-stone-200 hover:bg-red-50 text-stone-500 hover:text-red-700 transition-all cursor-pointer"
                            title="Dismiss item"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {isConfirmed ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Added to Chart</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmItem(item)}
                          className="px-4 py-2 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold hover:bg-black active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{dict.verifyAndPrescribe}</span>
                        </button>
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
