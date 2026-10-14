'use client';

/**
 * Login Page — inside AppFrame with NotchHeader (§6.1).
 * Centered ModuleCard with wordmark, pill inputs, accent button.
 * Language toggle in header. NO role selector anywhere.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppFrame } from '@/components/primitives/AppFrame';
import { NotchHeader } from '@/components/primitives/NotchHeader';
import { ModuleCard } from '@/components/cards/ModuleCard';
import { getDictionary, type Locale } from '@/i18n';

export default function LoginPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dict = getDictionary(locale);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    // S0 Mock Authentication - routes to provider or patient
    if (email.includes('patient')) {
      router.push('/patient');
    } else {
      router.push('/clinic');
    }
  };

  const toggleLocale = () => {
    setLocale((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <AppFrame margin>
        <NotchHeader
          title={dict.auth.signIn}
          controls={
            <button
              type="button"
              onClick={toggleLocale}
              className="px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-ink)] text-xs font-semibold hover:bg-[var(--color-white)] transition-colors"
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
          }
        />

        <main className="flex-1 flex items-center justify-center p-6">
          <ModuleCard className="w-full max-w-[420px] p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">
                {dict.common.appName}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-1">
                {dict.auth.signIn}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-xs rounded-xl bg-[var(--color-status-critical)]/15 border border-[var(--color-status-critical)]/40 text-[var(--color-ink)]">
                  {error}
                </div>
              )}

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
                  className="w-full px-4 py-2.5 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/40 text-sm text-[var(--color-ink)] focus:outline-2 focus:outline-[var(--color-ink)] transition-all"
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
                  className="w-full px-4 py-2.5 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/40 text-sm text-[var(--color-ink)] focus:outline-2 focus:outline-[var(--color-ink)] transition-all"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <Link
                  href="/reset-password"
                  className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] underline"
                >
                  {dict.auth.forgotPassword}
                </Link>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-[var(--radius-pill)] bg-[var(--color-accent)] text-[var(--color-ink)] font-bold text-sm shadow-xs hover:shadow-sm active:scale-95 transition-all mt-2"
              >
                {dict.auth.submit}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[var(--color-ink-soft)]/20 text-center text-xs text-[var(--color-ink-muted)]">
              <span>Need an account? </span>
              <Link href="/signup" className="text-[var(--color-ink)] font-semibold underline">
                {dict.auth.createAccount}
              </Link>
            </div>
          </ModuleCard>
        </main>
      </AppFrame>
    </div>
  );
}
