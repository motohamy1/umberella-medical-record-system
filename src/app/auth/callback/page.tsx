import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { homePathForEmail } from '@/lib/auth/role';

/**
 * OAuth callback landing page.
 *
 * Neon Auth redirects here with a `neon_auth_session_verifier` query param.
 * The auth middleware (proxy.ts) exchanges that verifier for a session cookie
 * before this page renders, then this page routes the user by role.
 */
export const instant = false;

export default async function AuthCallbackPage() {
  const { data } = await auth.getSession();

  if (data?.user?.email) {
    redirect(homePathForEmail(data.user.email));
  }

  redirect('/login');
}
