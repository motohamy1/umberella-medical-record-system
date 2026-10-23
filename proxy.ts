import { auth } from './src/lib/auth/server';

export default auth.middleware({
  loginUrl: '/login',
});

export const config = {
  matcher: [
    '/clinic/:path*',
    '/patient/:path*',
    // The OAuth callback must pass through the auth middleware so it can
    // exchange the session verifier for a session cookie.
    '/auth/callback',
  ],
};
