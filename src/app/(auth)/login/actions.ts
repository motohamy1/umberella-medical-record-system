'use server';

import { auth } from '@/lib/auth/server';
import { homePathForEmail } from '@/lib/auth/role';
import { redirect } from 'next/navigation';

/**
 * Turns raw upstream auth errors into actionable messages.
 * A 404 / "Not Found" almost always means NEON_AUTH_BASE_URL is missing or
 * points at a branch where Managed Better Auth has not been enabled.
 */
function describeAuthError(error: unknown): string {
  const err = error as { message?: string; status?: number } | undefined;
  const message = err?.message || 'Authentication failed.';
  if (err?.status === 404 || /not found/i.test(message)) {
    return 'Authentication service is not reachable. Check that NEON_AUTH_BASE_URL is the Auth URL from your Neon project (with Auth enabled) and redeploy.';
  }
  return message;
}

export async function signInAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await auth.signIn.email({ email, password });

  if (error) {
    return { error: describeAuthError(error) };
  }

  redirect(homePathForEmail(email));
}

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = (formData.get('name') as string) || email.split('@')[0];

  const { error } = await auth.signUp.email({ email, name, password });

  if (error) {
    return { error: describeAuthError(error) };
  }

  redirect(homePathForEmail(email));
}
