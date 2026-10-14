'use client';

/**
 * Signup Page — inside AppFrame with NotchHeader (§6.1).
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppFrame } from '@/components/primitives/AppFrame';
import { NotchHeader } from '@/components/primitives/NotchHeader';
import { ModuleCard } from '@/components/cards/ModuleCard';
import { getDictionary, type Locale } from '@/i18n';

export default function SignupPage() {
  const router = useRouter();
  const [locale] = useState<Locale>('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dict = getDictionary(locale);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/login');
  };

  return (
    <AppFrame margin>
      <NotchHeader title={dict.auth.createAccount} />
      <main className="flex-1 flex items-center justify-center p-6">
        <ModuleCard className="w-full max-w-[420px] p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">
              {dict.common.appName}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-1">
              {dict.auth.createAccount}
            </p>
          </div>

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

            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1">
                {dict.auth.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--color-ink-soft)]/20 text-center text-xs text-[var(--color-ink-muted)]">
            <span>Already have an account? </span>
            <Link href="/login" className="text-[var(--color-ink)] font-semibold underline">
              {dict.auth.signIn}
            </Link>
          </div>
        </ModuleCard>
      </main>
    </AppFrame>
  );
}
