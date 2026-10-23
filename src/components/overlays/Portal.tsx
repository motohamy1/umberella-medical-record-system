'use client';

/**
 * Portal — renders its children into document.body.
 *
 * Overlays and popovers must escape ancestor stacking contexts and overflow
 * clipping (notably the NotchHeader control row), so they always paint above
 * page content regardless of where their trigger lives in the tree.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
