'use client';

/**
 * AnchoredPopover — a portaled, fixed-position menu anchored to a trigger.
 *
 * Why it exists: menus rendered inside the NotchHeader were trapped by the
 * header's stacking context (and clipped by its scrollable control row), so
 * they painted behind page cards. Portaling to document.body at z-[110] plus
 * fixed coordinates keeps them above all page content, in both LTR and RTL.
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { clsx } from 'clsx';
import { Portal } from './Portal';

export interface AnchoredPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  align?: 'start' | 'end';
  offset?: number;
  className?: string;
  role?: string;
  ariaLabel?: string;
}

const GUTTER = 8;

export function AnchoredPopover({
  open,
  onClose,
  anchorRef,
  children,
  align = 'end',
  offset = 6,
  className,
  role = 'menu',
  ariaLabel,
}: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const attachPopover = useCallback((element: HTMLDivElement | null) => {
    popoverRef.current = element;
    setNode(element);
  }, []);

  const position = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const rect = anchor.getBoundingClientRect();
    const direction = window.getComputedStyle(anchor).direction;
    const width = popover.offsetWidth;
    const maxLeft = Math.max(GUTTER, window.innerWidth - width - GUTTER);

    let left =
      align === 'end'
        ? direction === 'rtl'
          ? rect.left
          : rect.right - width
        : rect.left;

    left = Math.min(Math.max(GUTTER, left), maxLeft);

    setCoords({ top: rect.bottom + offset, left });
  }, [align, anchorRef, offset]);

  // Measure and follow the anchor while the popover is open. Depends on the
  // node because the portal attaches one commit after `open` flips true.
  useLayoutEffect(() => {
    if (!open || !node) {
      setCoords(null);
      return;
    }

    position();

    const handleReflow = () => position();
    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, true);
    return () => {
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
    };
  }, [open, node, position]);

  // Dismiss on outside press or Escape. Clicks on the trigger are ignored so
  // the trigger's own toggle handler stays authoritative.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <Portal>
      <div
        ref={attachPopover}
        role={role}
        aria-label={ariaLabel}
        style={{
          position: 'fixed',
          top: coords ? coords.top : 0,
          left: coords ? coords.left : 0,
          visibility: coords ? 'visible' : 'hidden',
        }}
        className={clsx('z-[110]', className)}
      >
        {children}
      </div>
    </Portal>
  );
}
