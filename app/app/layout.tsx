import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
              Test Mode
            </span>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
