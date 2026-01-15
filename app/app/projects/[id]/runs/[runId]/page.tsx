import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from './post-card';
import { ExportButtons } from './export-buttons';

interface PageProps {
  params: { id: string; runId: string };
}

export default async function RunResultsPage({ params }: PageProps) {
  const user = await requireAuth();

  const run = await prisma.generationRun.findFirst({
    where: {
      id: params.runId,
      project: {
        id: params.id,
        userId: user.id,
      },
    },
    include: {
      project: {
        select: { name: true },
      },
      posts: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!run) {
    notFound();
  }

  const instagramPosts = run.posts.filter((p) => p.platform === 'instagram');
  const twitterPosts = run.posts.filter((p) => p.platform === 'twitter');
  const linkedinPosts = run.posts.filter((p) => p.platform === 'linkedin');

  const isProcessing = run.status === 'pending' || run.status === 'processing';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/app/projects/${params.id}`} className="text-muted-foreground hover:text-foreground">
              {run.project.name}
            </Link>
            <span className="text-muted-foreground">/</span>
            <span>Generation Results</span>
          </div>
          <h1 className="text-3xl font-bold">Content Results</h1>
          <p className="text-muted-foreground mt-1">
            {run.tonePreset} • {run.strictness} • {run.hashtagDensity} hashtags
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`text-sm px-3 py-1 rounded-full ${
              run.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : run.status === 'failed'
                ? 'bg-red-100 text-red-700'
                : run.status === 'processing'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {run.status}
          </span>
          {run.status === 'completed' && <ExportButtons runId={run.id} />}
        </div>
      </div>

      {isProcessing ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-48 bg-muted rounded mx-auto"></div>
              <p className="text-muted-foreground">
                Content is being generated. This may take a few minutes...
              </p>
              <p className="text-sm text-muted-foreground">
                Refresh the page to check for updates.
              </p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : run.status === 'failed' ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600 mb-4">Generation failed</p>
            {run.errorMessage && (
              <p className="text-sm text-muted-foreground mb-4">{run.errorMessage}</p>
            )}
            <Link href={`/app/projects/${params.id}/generate`}>
              <Button>Try Again</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="instagram" className="space-y-4">
          <TabsList>
            <TabsTrigger value="instagram">
              Instagram ({instagramPosts.length})
            </TabsTrigger>
            <TabsTrigger value="twitter">
              Twitter/X ({twitterPosts.length})
            </TabsTrigger>
            <TabsTrigger value="linkedin">
              LinkedIn ({linkedinPosts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instagram" className="space-y-4">
            {instagramPosts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No Instagram posts generated
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {instagramPosts.map((post, index) => (
                  <PostCard
                    key={post.id}
                    platform="instagram"
                    index={index + 1}
                    payload={post.payload as Record<string, unknown>}
                    citations={post.citations as Array<{ chunkId: string; quote: string }>}
                    instagramType={post.instagramType}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="twitter" className="space-y-4">
            {twitterPosts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No Twitter posts generated
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {twitterPosts.map((post, index) => (
                  <PostCard
                    key={post.id}
                    platform="twitter"
                    index={index + 1}
                    payload={post.payload as Record<string, unknown>}
                    citations={post.citations as Array<{ chunkId: string; quote: string }>}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="linkedin" className="space-y-4">
            {linkedinPosts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No LinkedIn posts generated
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {linkedinPosts.map((post, index) => (
                  <PostCard
                    key={post.id}
                    platform="linkedin"
                    index={index + 1}
                    payload={post.payload as Record<string, unknown>}
                    citations={post.citations as Array<{ chunkId: string; quote: string }>}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
