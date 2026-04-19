import { AuthProvider } from '@/contexts/AuthContext';

/**
 * Layout for authentication pages (/login, /register).
 * Wraps children with AuthProvider so useAuth() is available.
 * Light background with subtle dot grid pattern.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
