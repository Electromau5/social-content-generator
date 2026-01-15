'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContextProfile } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { buildContextProfile } from '@/app/actions/projects';

interface ContextProfileCardProps {
  projectId: string;
  profile: ContextProfile | null;
  readySourcesCount: number;
}

export function ContextProfileCard({
  projectId,
  profile,
  readySourcesCount,
}: ContextProfileCardProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleBuildProfile = async () => {
    setLoading(true);

    const result = await buildContextProfile(projectId);

    if (result.error) {
      toast({
        title: 'Failed to build profile',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Profile building started',
        description: 'The context profile is being generated. This may take a few minutes.',
      });
      router.refresh();
    }

    setLoading(false);
  };

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Context Profile</CardTitle>
          <CardDescription>
            Build a context profile from your sources to enable content generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {readySourcesCount === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                No processed sources available. Upload and wait for sources to be processed.
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                {readySourcesCount} source{readySourcesCount !== 1 ? 's' : ''} ready for analysis
              </p>
              <Button onClick={handleBuildProfile} disabled={loading}>
                {loading ? 'Building...' : 'Build Context Profile'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const themes = (profile.themes as string[]) || [];
  const keyClaims = (profile.keyClaims as Array<{ claim: string; chunkIds: string[]; quote: string }>) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Context Profile</CardTitle>
            <CardDescription>
              Generated profile based on your source materials
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleBuildProfile} disabled={loading}>
            {loading ? 'Rebuilding...' : 'Rebuild Profile'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2">Target Audience</h4>
          <p className="text-muted-foreground">{profile.audience || 'Not defined'}</p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Tone & Voice</h4>
          <p className="text-muted-foreground">{profile.tone || 'Not defined'}</p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Main Themes</h4>
          {themes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {themes.map((theme, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                >
                  {theme}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No themes identified</p>
          )}
        </div>

        <div>
          <h4 className="font-semibold mb-2">Key Claims ({keyClaims.length})</h4>
          {keyClaims.length > 0 ? (
            <div className="space-y-3">
              {keyClaims.slice(0, 5).map((claim, i) => (
                <div key={i} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{claim.claim}</p>
                  <p className="text-sm text-muted-foreground mt-1 italic">
                    &ldquo;{claim.quote}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sources: {claim.chunkIds.length} chunk{claim.chunkIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
              {keyClaims.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  + {keyClaims.length - 5} more claims
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No key claims identified</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(profile.updatedAt).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
