import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { SignOutButton } from './sign-out-button';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/app" className="text-lg font-bold">
              Social Content Generator
            </Link>
            <nav className="flex gap-4">
              <Link href="/app">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link href="/app/projects">
                <Button variant="ghost" size="sm">
                  Projects
                </Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
