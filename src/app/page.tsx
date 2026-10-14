import Link from 'next/link';
import { AppFrame } from '@/components/primitives/AppFrame';
import { NotchHeader } from '@/components/primitives/NotchHeader';
import { ModuleCard } from '@/components/cards/ModuleCard';

export default function RootHomePage() {
  return (
    <AppFrame>
      <NotchHeader title="Umbrella System — S0 Foundation" />
      <main className="flex-1 flex items-center justify-center p-6">
        <ModuleCard className="max-w-md w-full p-6 text-center space-y-4">
          <h1 className="text-xl font-bold text-[var(--color-ink)]">
            Patient Clinical Workspace
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-ink-muted)]">
            Dual-sided clinical workspace with a continuous clinical timeline.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/dev/gallery"
              className="py-2.5 px-4 rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-white)] font-bold text-sm shadow-xs hover:opacity-90 transition-all"
            >
              Component Gallery (/dev/gallery)
            </Link>
            <Link
              href="/login"
              className="py-2 px-4 rounded-[var(--radius-pill)] bg-[var(--color-white)] text-[var(--color-ink)] font-semibold text-sm border border-[var(--color-ink-soft)]/30 hover:bg-[var(--color-surface)] transition-all"
            >
              Sign In (/login)
            </Link>
            <Link
              href="/clinic"
              className="py-2 px-4 rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-ink)] font-medium text-xs hover:bg-[var(--color-white)] transition-all"
            >
              Provider Home (/clinic)
            </Link>
            <Link
              href="/patient"
              className="py-2 px-4 rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-ink)] font-medium text-xs hover:bg-[var(--color-white)] transition-all"
            >
              Patient Home (/patient)
            </Link>
          </div>
        </ModuleCard>
      </main>
    </AppFrame>
  );
}
