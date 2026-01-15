'use client';

export function Providers({ children }: { children: React.ReactNode }) {
  // SessionProvider removed for testing without auth
  return <>{children}</>;
}
