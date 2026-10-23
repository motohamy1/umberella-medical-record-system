import { auth } from './src/lib/auth/server';

export default auth.middleware({
  loginUrl: '/login',
});

export const config = {
  matcher: [
    '/clinic/:path*',
    '/patient/:path*',
  ],
};
