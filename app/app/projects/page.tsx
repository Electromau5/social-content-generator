import Link from 'next/link';
import { requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateProjectDialog } from './create-project-dialog';

// Prevent static generation - this page needs database access at runtime
export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const user = await requireAuth();

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { sources: true, generationRuns: true },
      },
      sources: {
        select: { status: true },
      },
      contextProfile: {
        select: { id: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your content generation projects
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any projects yet
            </p>
            <CreateProjectDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const processedSources = project.sources.filter(
              (s) => s.status === 'profiled' || s.status === 'chunked'
            ).length;
            const totalSources = project.sources.length;

            return (
              <Link key={project.id} href={`/app/projects/${project.id}`}>
                <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span className="truncate">{project.name}</span>
                      {project.contextProfile && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          Ready
                        </span>
                      )}
                    </CardTitle>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>
                        {processedSources}/{totalSources} sources
                      </span>
                      <span>{project._count.generationRuns} runs</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
