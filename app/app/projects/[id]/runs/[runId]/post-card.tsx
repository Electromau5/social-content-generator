'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Check } from 'lucide-react';

interface PostCardProps {
  platform: 'instagram' | 'twitter' | 'linkedin';
  index: number;
  payload: Record<string, unknown>;
  citations: Array<{ chunkId: string; quote: string }>;
  instagramType?: string | null;
}

export function PostCard({ platform, index, payload, citations, instagramType }: PostCardProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const getContent = (): string => {
    if (platform === 'instagram') {
      const ig = payload as {
        type?: string;
        slides?: Array<{ slideNumber: number; content: string }>;
        caption?: string;
        cta?: string;
        hashtags?: string[];
      };

      let content = '';
      
      if (ig.type === 'carousel' && ig.slides) {
        content += ig.slides.map((s) => `[Slide ${s.slideNumber}]\n${s.content}`).join('\n\n');
        content += '\n\n---\n\n';
      }
      
      if (ig.caption) {
        content += ig.caption;
      }
      
      if (ig.cta) {
        content += `\n\n${ig.cta}`;
      }
      
      if (ig.hashtags && ig.hashtags.length > 0) {
        content += `\n\n${ig.hashtags.map((h) => `#${h}`).join(' ')}`;
      }
      
      return content;
    }

    if (platform === 'twitter') {
      const tw = payload as { content?: string; hashtags?: string[] };
      let content = tw.content || '';
      if (tw.hashtags && tw.hashtags.length > 0) {
        content += ` ${tw.hashtags.map((h) => `#${h}`).join(' ')}`;
      }
      return content;
    }

    if (platform === 'linkedin') {
      const li = payload as { content?: string; hashtags?: string[] };
      let content = li.content || '';
      if (li.hashtags && li.hashtags.length > 0) {
        content += `\n\n${li.hashtags.map((h) => `#${h}`).join(' ')}`;
      }
      return content;
    }

    return '';
  };

  const handleCopy = async () => {
    const content = getContent();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const platformLabels = {
    instagram: 'Instagram',
    twitter: 'Twitter/X',
    linkedin: 'LinkedIn',
  };

  const typeLabel = instagramType
    ? instagramType === 'carousel'
      ? 'Carousel'
      : 'Single'
    : 'Post';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">
            {platformLabels[platform]} {typeLabel} #{index}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {platform === 'instagram' && instagramType === 'carousel' && (
          <div className="space-y-2">
            {(payload as { slides?: Array<{ slideNumber: number; content: string }> }).slides?.map(
              (slide) => (
                <div
                  key={slide.slideNumber}
                  className="p-3 bg-muted rounded-lg"
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    Slide {slide.slideNumber}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{slide.content}</p>
                </div>
              )
            )}
          </div>
        )}

        {platform === 'instagram' && (
          <>
            {(payload as { caption?: string }).caption && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Caption</p>
                <p className="text-sm whitespace-pre-wrap">
                  {(payload as { caption: string }).caption}
                </p>
              </div>
            )}
            {(payload as { cta?: string }).cta && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Call to Action</p>
                <p className="text-sm font-medium">
                  {(payload as { cta: string }).cta}
                </p>
              </div>
            )}
          </>
        )}

        {platform === 'twitter' && (
          <div>
            <p className="whitespace-pre-wrap">
              {(payload as { content?: string }).content}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {((payload as { content?: string }).content?.length || 0)}/280 characters
            </p>
          </div>
        )}

        {platform === 'linkedin' && (
          <p className="whitespace-pre-wrap">
            {(payload as { content?: string }).content}
          </p>
        )}

        {(payload as { hashtags?: string[] }).hashtags &&
          (payload as { hashtags: string[] }).hashtags.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Hashtags</p>
              <div className="flex flex-wrap gap-1">
                {(payload as { hashtags: string[] }).hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-sm text-blue-600 hover:underline cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

        {citations.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Citations ({citations.length})
            </p>
            <div className="space-y-1">
              {citations.map((citation, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  <span className="font-mono">[{citation.chunkId.slice(0, 8)}]</span>{' '}
                  &ldquo;{citation.quote}&rdquo;
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
