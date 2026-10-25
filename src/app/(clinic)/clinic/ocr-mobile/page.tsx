'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, Upload, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function MobileOcrIntakePage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [patientId, setPatientId] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setSessionId(params.get('session') || '');
      setPatientId(params.get('patientId') || '');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file from camera/device');
    };
    reader.readAsDataURL(file);
  };

  const handleSendToDesktop = async () => {
    if (!imagePreview || !sessionId) {
      setErrorMsg('Missing image or pairing session ID.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ocr-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          imageDataUri: imagePreview,
          fileName: fileName || 'mobile_camera_rx.jpg',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUploadSuccess(true);
      } else {
        setErrorMsg(data.error || 'Failed to transmit image to desktop workspace.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetake = () => {
    setImagePreview(null);
    setUploadSuccess(false);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-20 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          {patientId ? (
            <Link
              href={`/clinic/patients/${patientId}`}
              className="p-1 rounded-full text-stone-500 hover:text-black hover:bg-stone-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          ) : null}
          <div>
            <h1 className="text-sm font-bold text-stone-900 leading-tight">Umbrella Medical</h1>
            <p className="text-[11px] text-stone-500">Mobile Prescription Camera</p>
          </div>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
          Paired Live
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        {uploadSuccess ? (
          <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-stone-900">Transmitted to Desktop!</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your prescription photo has been synced to your desktop screen. You can now view the optical extraction, verify the medications, and confirm them on your main computer.
            </p>
            <button
              type="button"
              onClick={handleRetake}
              className="mt-3 px-5 py-2.5 rounded-full border border-stone-200 bg-stone-50 text-xs font-bold text-stone-800 hover:bg-stone-100 active:scale-95 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Capture Another Photo</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Capture Prescription</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Align the handwritten or printed prescription clearly inside the frame in good lighting.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Hidden native input with capture="environment" (back camera) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="flex flex-col gap-3">
                <div className="relative rounded-2xl overflow-hidden border border-stone-300 bg-black aspect-[4/3] flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Prescription preview"
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-mono">
                    Ready to send
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="flex-1 py-3 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-800 hover:bg-stone-100 active:scale-95 transition-all"
                  >
                    Retake Photo
                  </button>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={handleSendToDesktop}
                    className="flex-2 py-3 rounded-xl bg-black text-white text-xs font-bold hover:bg-stone-900 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isUploading ? (
                      <span>Sending to Desktop...</span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Send to Desktop</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-12 border-2 border-dashed border-stone-300 hover:border-black rounded-2xl bg-stone-50 hover:bg-stone-100 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer group active:scale-98"
                >
                  <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-stone-900">
                    Open Camera / Take Photo
                  </span>
                  <span className="text-[11px] text-stone-500">
                    or choose from photo gallery
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[11px] text-stone-500">
        Umbrella Medical Records · Egyptian Drug Authority (EDA) · PDPL Law 151/2020 Compliant
      </footer>
    </div>
  );
}
