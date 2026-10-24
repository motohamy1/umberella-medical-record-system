import { redirect } from 'next/navigation';

/**
 * Root Entry Route — §5 App Map & §9.3 Authorization.
 * Sends visitors to the authentication entry point. The OAuth callback lands
 * on /auth/callback and routes by role after the session is established.
 */
export default function RootHomePage() {
  redirect('/login');
}
