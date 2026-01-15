'use server';

import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/session';

export async function getRunDetails(runId: string) {
  const user = await requireAuth();

  const run = await prisma.generationRun.findFirst({
    where: {
      id: runId,
      project: {
        userId: user.id,
      },
    },
    include: {
      project: true,
      posts: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!run) {
    return { error: 'Run not found' };
  }

  return { run };
}

export async function exportRunAsJSON(runId: string) {
  const user = await requireAuth();

  const run = await prisma.generationRun.findFirst({
    where: {
      id: runId,
      project: {
        userId: user.id,
      },
    },
    include: {
      project: {
        select: { name: true },
      },
      posts: true,
    },
  });

  if (!run) {
    return { error: 'Run not found' };
  }

  // Group posts by platform
  const instagram = run.posts.filter((p) => p.platform === 'instagram');
  const twitter = run.posts.filter((p) => p.platform === 'twitter');
  const linkedin = run.posts.filter((p) => p.platform === 'linkedin');

  const exportData = {
    projectName: run.project.name,
    generatedAt: run.createdAt.toISOString(),
    parameters: {
      tone: run.tonePreset,
      strictness: run.strictness,
      hashtagDensity: run.hashtagDensity,
    },
    instagram: {
      carousels: instagram
        .filter((p) => p.instagramType === 'carousel')
        .map((p) => ({
          ...p.payload,
          citations: p.citations,
        })),
      singles: instagram
        .filter((p) => p.instagramType === 'single')
        .map((p) => ({
          ...p.payload,
          citations: p.citations,
        })),
    },
    twitter: twitter.map((p) => ({
      ...p.payload,
      citations: p.citations,
    })),
    linkedin: linkedin.map((p) => ({
      ...p.payload,
      citations: p.citations,
    })),
  };

  return { data: exportData };
}

export async function exportRunAsCSV(runId: string) {
  const user = await requireAuth();

  const run = await prisma.generationRun.findFirst({
    where: {
      id: runId,
      project: {
        userId: user.id,
      },
    },
    include: {
      project: {
        select: { name: true },
      },
      posts: true,
    },
  });

  if (!run) {
    return { error: 'Run not found' };
  }

  // Create CSV rows
  const rows: string[][] = [
    ['Platform', 'Type', 'Content', 'Hashtags', 'CTA', 'Citations'],
  ];

  for (const post of run.posts) {
    const payload = post.payload as Record<string, unknown>;
    const citations = post.citations as Array<{ chunkId: string; quote: string }>;

    let content = '';
    let hashtags = '';
    let cta = '';

    if (post.platform === 'instagram') {
      const igPayload = payload as {
        type: string;
        slides?: Array<{ content: string }>;
        caption?: string;
        cta?: string;
        hashtags?: string[];
      };
      
      if (igPayload.type === 'carousel' && igPayload.slides) {
        content = igPayload.slides.map((s) => s.content).join(' | ');
      }
      if (igPayload.caption) {
        content = content ? `${content}\n${igPayload.caption}` : igPayload.caption;
      }
      hashtags = (igPayload.hashtags || []).join(', ');
      cta = igPayload.cta || '';
    } else if (post.platform === 'twitter') {
      const twPayload = payload as { content?: string; hashtags?: string[] };
      content = twPayload.content || '';
      hashtags = (twPayload.hashtags || []).join(', ');
    } else if (post.platform === 'linkedin') {
      const liPayload = payload as { content?: string; hashtags?: string[] };
      content = liPayload.content || '';
      hashtags = (liPayload.hashtags || []).join(', ');
    }

    const citationStr = citations
      .map((c) => `[${c.chunkId}]: "${c.quote}"`)
      .join('; ');

    rows.push([
      post.platform,
      post.instagramType || 'post',
      content.replace(/"/g, '""'),
      hashtags,
      cta,
      citationStr,
    ]);
  }

  // Convert to CSV string
  const csv = rows
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  return { data: csv, filename: `${run.project.name}-${run.id}.csv` };
}
