'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { homePathForEmail } from '@/lib/auth/role';

/**
 * OAuth callback landing page.
 *
 * Neon Auth redirects here with a `neon_auth_session_verifier` query param.
 * The auth middleware (src/proxy.ts) exchanges that verifier for a session
 * cookie before this page renders. We then read the session client-side and
 * route by role. Keeping this client-side avoids prerender/cookies issues.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      try {
        const { data } = await authClient.getSession();
        if (cancelled) return;
        if (data?.user?.email) {
          router.replace(homePathForEmail(data.user.email));
          return;
        }
      } catch {
        // fall through to login
      }
      if (!cancelled) router.replace('/login');
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <div className="w-8 h-8 rounded-full border-3 border-[var(--color-ink)] border-t-transparent animate-spin" />
      <span className="text-xs font-semibold text-[var(--color-ink-muted)]">
        Completing sign-in…
      </span>
    </div>
  );
}
