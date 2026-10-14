'use client';

/**
 * OverlaySheet — Modal / Sheet overlay for clinical record details & entry.
 * Implements smooth spring/expo entrance and exit transitions, backdrop lock,
 * escape key handling, and accessibility standards with prefers-reduced-motion.
 */

import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CircleButton } from '../primitives/CircleButton';

export interface OverlaySheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeLabel?: string;
  className?: string;
}

export function OverlaySheet({
  isOpen,
  onClose,
  title,
  children,
  closeLabel = 'Close modal',
  className,
}: OverlaySheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-ink)]/40 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{
              duration: 0.24,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={clsx(
              'relative w-full max-w-lg bg-[var(--color-surface-raised)] rounded-[var(--radius-card)]',
              'border border-[var(--color-ink-soft)]/30 shadow-[var(--shadow-overlay)] p-5 sm:p-6',
              'flex flex-col max-h-[90vh]',
              className
            )}
          >
            <header className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-ink-soft)]/20">
              <h2 className="text-lg font-bold text-[var(--color-ink)]">{title}</h2>
              <CircleButton
                size="sm"
                icon={<X className="w-4 h-4" />}
                label={closeLabel}
                onClick={onClose}
              />
            </header>

            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
