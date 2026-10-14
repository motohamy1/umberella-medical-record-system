'use client';

/**
 * Reset Password Page — inside AppFrame with NotchHeader (§6.1).
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { AppFrame } from '@/components/primitives/AppFrame';
import { NotchHeader } from '@/components/primitives/NotchHeader';
import { ModuleCard } from '@/components/cards/ModuleCard';
import { getDictionary, type Locale } from '@/i18n';

export default function ResetPasswordPage() {
  const [locale] = useState<Locale>('en');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const dict = getDictionary(locale);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <AppFrame margin>
      <NotchHeader title={dict.auth.resetPassword} />
      <main className="flex-1 flex items-center justify-center p-6">
        <ModuleCard className="w-full max-w-[420px] p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">
              {dict.common.appName}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-1">
              {dict.auth.resetPassword}
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-[var(--color-ink)]">
                If an account exists for {email}, a recovery link has been sent.
              </p>
              <Link
                href="/login"
                className="inline-block py-2 px-6 rounded-[var(--radius-pill)] bg-[var(--color-accent)] text-[var(--color-ink)] font-bold text-sm shadow-xs"
              >
                {dict.common.back} to {dict.auth.signIn}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1">
                  {dict.auth.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@nilecare.clinic"
                  required
                  className="w-full px-4 py-2.5 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/40 text-sm text-[var(--color-ink)] focus:outline-2 focus:outline-[var(--color-ink)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-[var(--radius-pill)] bg-[var(--color-accent)] text-[var(--color-ink)] font-bold text-sm shadow-xs hover:shadow-sm active:scale-95 transition-all mt-2"
              >
                {dict.auth.submit}
              </button>

              <div className="text-center text-xs pt-2">
                <Link href="/login" className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] underline">
                  {dict.common.cancel}
                </Link>
              </div>
            </form>
          )}
        </ModuleCard>
      </main>
    </AppFrame>
  );
}
