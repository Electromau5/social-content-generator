'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { startGenerationRun } from '@/app/actions/projects';

interface GeneratePageProps {
  params: { id: string };
}

export default function GeneratePage({ params }: GeneratePageProps) {
  const [loading, setLoading] = useState(false);
  const [tonePreset, setTonePreset] = useState<'professional' | 'casual' | 'inspirational'>('professional');
  const [strictness, setStrictness] = useState<'strict' | 'moderate' | 'loose'>('moderate');
  const [hashtagDensity, setHashtagDensity] = useState<'low' | 'medium' | 'high'>('medium');
  const router = useRouter();
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);

    const result = await startGenerationRun(params.id, {
      tonePreset,
      strictness,
      hashtagDensity,
    });

    if (result.error) {
      toast({
        title: 'Generation failed',
        description: result.error,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    toast({
      title: 'Generation started',
      description: 'Your content is being generated. This may take a few minutes.',
    });

    if (result.run) {
      router.push(`/app/projects/${params.id}/runs/${result.run.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link href={`/app/projects/${params.id}`} className="text-muted-foreground hover:text-foreground">
            ← Back to Project
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Generate Content</h1>
        <p className="text-muted-foreground mt-1">
          Configure your content generation settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generation Settings</CardTitle>
          <CardDescription>
            Customize how your social media content will be generated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tone Preset</Label>
            <Select value={tonePreset} onValueChange={(v) => setTonePreset(v as typeof tonePreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">
                  Professional - Formal and authoritative
                </SelectItem>
                <SelectItem value="casual">
                  Casual - Friendly and conversational
                </SelectItem>
                <SelectItem value="inspirational">
                  Inspirational - Uplifting and motivational
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Citation Strictness</Label>
            <Select value={strictness} onValueChange={(v) => setStrictness(v as typeof strictness)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">
                  Strict - Every claim requires citation
                </SelectItem>
                <SelectItem value="moderate">
                  Moderate - Main claims need citations
                </SelectItem>
                <SelectItem value="loose">
                  Loose - Citations for key claims only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hashtag Density</Label>
            <Select value={hashtagDensity} onValueChange={(v) => setHashtagDensity(v as typeof hashtagDensity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  Low - Minimal hashtags
                </SelectItem>
                <SelectItem value="medium">
                  Medium - Balanced hashtags
                </SelectItem>
                <SelectItem value="high">
                  High - Maximum hashtags
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">What will be generated:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Instagram: 2 carousel posts + 3 single posts</li>
              <li>• Twitter/X: 5 tweets (under 280 characters)</li>
              <li>• LinkedIn: 5 professional posts</li>
            </ul>
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? 'Starting Generation...' : 'Generate Content'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
