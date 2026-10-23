import { redirect } from 'next/navigation';

/**
 * Root Entry Route — §5 App Map & §9.3 Authorization.
 * Directs visitors to the authentication entry point (/login).
 * Authenticated role-based routing directs staff to /clinic and patients to /patient.
 * No manual role switcher, no developer tools, and no specification vocabulary in UI.
 */
export default function RootHomePage() {
  redirect('/login');
}
