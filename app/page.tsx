import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Social Content Generator</h1>
          <nav className="flex gap-4">
            <Link href="/auth/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Transform Your Content Into Engaging Social Posts
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Upload documents, articles, or any source material and instantly generate
            platform-optimized content for Instagram, Twitter/X, and LinkedIn.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg">Start Creating</Button>
            </Link>
            <Link href="/auth/signin">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Upload Any Source</h3>
            <p className="text-muted-foreground">
              PDF, DOCX, text files, URLs, audio, and video files are all supported.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">AI-Powered Generation</h3>
            <p className="text-muted-foreground">
              Our AI analyzes your content and creates platform-specific posts with proper citations.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Export Anywhere</h3>
            <p className="text-muted-foreground">
              Copy individual posts or export all your content as JSON or CSV.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Social Content Generator. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
