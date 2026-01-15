'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Source } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { deleteSource } from '@/app/actions/projects';
import { FileText, Link as LinkIcon, Trash2, Loader2 } from 'lucide-react';

interface SourcesListProps {
  sources: Source[];
  projectId: string;
}

const statusColors: Record<string, string> = {
  uploaded: 'bg-gray-100 text-gray-700',
  extracting: 'bg-blue-100 text-blue-700',
  extracted: 'bg-blue-100 text-blue-700',
  chunking: 'bg-blue-100 text-blue-700',
  chunked: 'bg-yellow-100 text-yellow-700',
  profiling: 'bg-blue-100 text-blue-700',
  profiled: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export function SourcesList({ sources, projectId }: SourcesListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async (sourceId: string) => {
    setDeletingId(sourceId);

    const result = await deleteSource(sourceId);

    if (result.error) {
      toast({
        title: 'Delete failed',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Source deleted',
        description: 'The source has been removed.',
      });
      router.refresh();
    }

    setDeletingId(null);
  };

  if (sources.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            No sources yet. Upload files or add URLs above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Sources</h3>
      {sources.map((source) => (
        <Card key={source.id}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {source.type === 'file' ? (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <LinkIcon className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {source.originalName || source.url || 'Unknown source'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {source.type === 'file' ? source.mimeType : source.url}
                  </p>
                  {source.errorMessage && (
                    <p className="text-sm text-red-600 mt-1">
                      Error: {source.errorMessage}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    statusColors[source.status] || 'bg-gray-100'
                  }`}
                >
                  {source.status}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(source.id)}
                  disabled={deletingId === source.id}
                >
                  {deletingId === source.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
