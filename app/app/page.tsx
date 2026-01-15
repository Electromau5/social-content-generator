import Link from 'next/link';
import { requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const user = await requireAuth();

  // Get user stats
  const [projectCount, sourceCount, runCount] = await Promise.all([
    prisma.project.count({ where: { userId: user.id } }),
    prisma.source.count({ where: { project: { userId: user.id } } }),
    prisma.generationRun.count({ where: { project: { userId: user.id } } }),
  ]);

  // Get recent projects
  const recentProjects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      _count: {
        select: { sources: true, generationRuns: true },
      },
    },
  });

  // Get recent runs
  const recentRuns = await prisma.generationRun.findMany({
    where: { project: { userId: user.id } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      project: {
        select: { name: true },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user.name ? `, ${user.name}` : ''}!
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{projectCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sourceCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Generation Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{runCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recent Projects</CardTitle>
              <Link href="/app/projects">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            <CardDescription>Your most recently updated projects</CardDescription>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">No projects yet</p>
                <Link href="/app/projects">
                  <Button>Create Your First Project</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/projects/${project.id}`}
                    className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {project._count.sources} sources • {project._count.generationRuns} runs
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Generations</CardTitle>
            <CardDescription>Your latest content generation runs</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No generations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <Link
                    key={run.id}
                    href={`/app/projects/${run.projectId}/runs/${run.id}`}
                    className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{run.project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {run.tonePreset} • {run.strictness}
                        </p>
                      </div>
                      <div className="text-right">
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
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(run.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
