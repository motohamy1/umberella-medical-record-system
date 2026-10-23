import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { homePathForEmail } from '@/lib/auth/role';

/**
 * Root Entry Route — §5 App Map & §9.3 Authorization.
 * Authenticated users are routed to their role home; everyone else sees /login.
 * Also serves as the OAuth callback landing page.
 */
export const instant = false;

export default async function RootHomePage() {
  const { data } = await auth.getSession();

  if (data?.user?.email) {
    redirect(homePathForEmail(data.user.email));
  }

  redirect('/login');
}
