import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadSourceForm } from './upload-source-form';
import { SourcesList } from './sources-list';
import { ContextProfileCard } from './context-profile-card';
import { JobsTable } from './jobs-table';
import { DeleteProjectButton } from './delete-project-button';

interface PageProps {
  params: { id: string };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const user = await requireAuth();

  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
      userId: user.id,
    },
    include: {
      sources: {
        orderBy: { createdAt: 'desc' },
      },
      contextProfile: true,
      generationRuns: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          _count: {
            select: { posts: true },
          },
        },
      },
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!project) {
    notFound();
  }

  const readySources = project.sources.filter(
    (s) => s.status === 'profiled' || s.status === 'chunked'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/app/projects" className="text-muted-foreground hover:text-foreground">
              Projects
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-3xl font-bold">{project.name}</h1>
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/app/projects/${project.id}/generate`}>
            <Button disabled={!project.contextProfile}>
              Generate Content
            </Button>
          </Link>
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
        </div>
      </div>

      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources">Sources ({project.sources.length})</TabsTrigger>
          <TabsTrigger value="profile">Context Profile</TabsTrigger>
          <TabsTrigger value="runs">Generation Runs ({project.generationRuns.length})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Source</CardTitle>
              <CardDescription>
                Upload files or add URLs to extract content for generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadSourceForm projectId={project.id} />
            </CardContent>
          </Card>

          <SourcesList sources={project.sources} projectId={project.id} />
        </TabsContent>

        <TabsContent value="profile">
          <ContextProfileCard
            projectId={project.id}
            profile={project.contextProfile}
            readySourcesCount={readySources.length}
          />
        </TabsContent>

        <TabsContent value="runs" className="space-y-4">
          {project.generationRuns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No generation runs yet</p>
                {project.contextProfile ? (
                  <Link href={`/app/projects/${project.id}/generate`}>
                    <Button>Generate Content</Button>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Build a context profile first to generate content
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {project.generationRuns.map((run) => (
                <Link key={run.id} href={`/app/projects/${project.id}/runs/${run.id}`}>
                  <Card className="hover:border-primary transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            Generation Run
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {run.tonePreset} • {run.strictness} • {run.hashtagDensity} hashtags
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
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
                          <span className="text-sm text-muted-foreground">
                            {run._count.posts} posts
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(run.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs">
          <JobsTable jobs={project.jobs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
