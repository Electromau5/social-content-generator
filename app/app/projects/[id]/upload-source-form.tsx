'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { uploadFileSource, addUrlSource } from '@/app/actions/projects';

interface UploadSourceFormProps {
  projectId: string;
}

export function UploadSourceForm({ projectId }: UploadSourceFormProps) {
  const [fileLoading, setFileLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [url, setUrl] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadFileSource(projectId, formData);

    if (result.error) {
      toast({
        title: 'Upload failed',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'File uploaded',
        description: 'Your file is being processed.',
      });
      router.refresh();
    }

    setFileLoading(false);
    e.target.value = '';
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setUrlLoading(true);

    const result = await addUrlSource(projectId, url.trim());

    if (result.error) {
      toast({
        title: 'Failed to add URL',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'URL added',
        description: 'The URL is being processed.',
      });
      setUrl('');
      router.refresh();
    }

    setUrlLoading(false);
  };

  return (
    <Tabs defaultValue="file" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="file">Upload File</TabsTrigger>
        <TabsTrigger value="url">Add URL</TabsTrigger>
      </TabsList>

      <TabsContent value="file">
        <div className="space-y-2">
          <Label htmlFor="file">Choose a file</Label>
          <Input
            id="file"
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md,.mp3,.wav,.mp4,.webm"
            onChange={handleFileUpload}
            disabled={fileLoading}
          />
          <p className="text-xs text-muted-foreground">
            Supported: PDF, DOCX, TXT, MD, MP3, WAV, MP4, WebM (max 50MB)
          </p>
          {fileLoading && (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="url">
        <form onSubmit={handleUrlSubmit} className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <div className="flex gap-2">
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={urlLoading}
            />
            <Button type="submit" disabled={urlLoading || !url.trim()}>
              {urlLoading ? 'Adding...' : 'Add'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a URL to extract and process its content
          </p>
        </form>
      </TabsContent>
    </Tabs>
  );
}
