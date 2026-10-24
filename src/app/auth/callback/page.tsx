'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { homePathForEmail } from '@/lib/auth/role';

/**
 * OAuth callback landing page.
 *
 * Neon Auth redirects here with a `neon_auth_session_verifier` query param.
 * `authClient.getSession()` runs in the browser, detects the query param,
 * exchanges it with Neon for the session cookie, and routes to the role dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('Completing sign in...');

  useEffect(() => {
    let isMounted = true;

    async function completeAuth() {
      try {
        const response = await authClient.getSession();
        const user = response?.data?.user;

        if (user?.email) {
          router.replace(homePathForEmail(user.email));
        } else {
          if (isMounted) {
            setStatusMessage('Session could not be verified. Returning to login...');
            setTimeout(() => router.replace('/login'), 1200);
          }
        }
      } catch {
        if (isMounted) {
          setStatusMessage('Sign-in failed. Returning to login...');
          setTimeout(() => router.replace('/login'), 1200);
        }
      }
    }

    completeAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] text-[var(--color-ink)] p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary-base)] border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-[var(--color-ink-muted)]">
          {statusMessage}
        </p>
      </div>
    </div>
  );
}

