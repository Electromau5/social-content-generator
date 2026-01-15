'use client';

import { Job } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface JobsTableProps {
  jobs: Job[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const typeLabels: Record<string, string> = {
  extract_text: 'Extract Text',
  chunk_text: 'Chunk Text',
  build_profile: 'Build Profile',
  generate_posts: 'Generate Posts',
};

export function JobsTable({ jobs }: JobsTableProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No jobs yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Jobs</CardTitle>
        <CardDescription>Recent job activity for this project</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 text-sm font-medium">Type</th>
                <th className="text-left py-2 px-2 text-sm font-medium">Status</th>
                <th className="text-left py-2 px-2 text-sm font-medium">Attempts</th>
                <th className="text-left py-2 px-2 text-sm font-medium">Next Run</th>
                <th className="text-left py-2 px-2 text-sm font-medium">Created</th>
                <th className="text-left py-2 px-2 text-sm font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b last:border-b-0">
                  <td className="py-2 px-2 text-sm">
                    {typeLabels[job.type] || job.type}
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        statusColors[job.status] || 'bg-gray-100'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-sm">
                    {job.attempts}/{job.maxAttempts}
                  </td>
                  <td className="py-2 px-2 text-sm text-muted-foreground">
                    {new Date(job.nextRunAt).toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-sm text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-sm text-red-600 max-w-xs truncate">
                    {job.errorMessage || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
