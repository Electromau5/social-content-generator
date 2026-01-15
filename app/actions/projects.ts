'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/session';
import { JobType } from '@prisma/client';
import { enqueueJob } from '@/lib/jobs/runner';
import { checkRateLimit } from '@/lib/rate-limit/rate-limiter';

export async function createProject(formData: FormData) {
  const user = await requireAuth();
  
  const name = formData.get('name') as string;
  const description = formData.get('description') as string | null;

  if (!name || name.trim().length === 0) {
    return { error: 'Project name is required' };
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: user.id,
      },
    });

    revalidatePath('/app/projects');
    return { project };
  } catch (error) {
    console.error('Create project error:', error);
    return { error: 'Failed to create project' };
  }
}

export async function deleteProject(projectId: string) {
  const user = await requireAuth();

  // Verify ownership
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  if (!project) {
    return { error: 'Project not found' };
  }

  try {
    await prisma.project.delete({
      where: { id: projectId },
    });

    revalidatePath('/app/projects');
    return { success: true };
  } catch (error) {
    console.error('Delete project error:', error);
    return { error: 'Failed to delete project' };
  }
}

export async function uploadFileSource(projectId: string, formData: FormData) {
  const user = await requireAuth();

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  if (!project) {
    return { error: 'Project not found' };
  }

  const file = formData.get('file') as File | null;

  if (!file) {
    return { error: 'No file provided' };
  }

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'video/mp4',
    'video/webm',
  ];

  if (!allowedTypes.includes(file.type)) {
    return { error: `Unsupported file type: ${file.type}` };
  }

  // Check file size (50MB limit)
  if (file.size > 50 * 1024 * 1024) {
    return { error: 'File size must be under 50MB' };
  }

  try {
    // Read file bytes
    const bytes = Buffer.from(await file.arrayBuffer());

    // Create source
    const source = await prisma.source.create({
      data: {
        projectId,
        type: 'file',
        mimeType: file.type,
        originalName: file.name,
        fileBytes: bytes,
        status: 'uploaded',
      },
    });

    // Queue extraction job
    await enqueueJob(projectId, JobType.extract_text, { sourceId: source.id });

    revalidatePath(`/app/projects/${projectId}`);
    return { source };
  } catch (error) {
    console.error('Upload file error:', error);
    return { error: 'Failed to upload file' };
  }
}

export async function addUrlSource(projectId: string, url: string) {
  const user = await requireAuth();

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  if (!project) {
    return { error: 'Project not found' };
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return { error: 'Invalid URL' };
  }

  try {
    // Create source
    const source = await prisma.source.create({
      data: {
        projectId,
        type: 'url',
        url,
        originalName: new URL(url).hostname,
        status: 'uploaded',
      },
    });

    // Queue extraction job
    await enqueueJob(projectId, JobType.extract_text, { sourceId: source.id });

    revalidatePath(`/app/projects/${projectId}`);
    return { source };
  } catch (error) {
    console.error('Add URL error:', error);
    return { error: 'Failed to add URL source' };
  }
}

export async function deleteSource(sourceId: string) {
  const user = await requireAuth();

  // Verify ownership through project
  const source = await prisma.source.findFirst({
    where: {
      id: sourceId,
      project: {
        userId: user.id,
      },
    },
    include: {
      project: true,
    },
  });

  if (!source) {
    return { error: 'Source not found' };
  }

  try {
    await prisma.source.delete({
      where: { id: sourceId },
    });

    revalidatePath(`/app/projects/${source.projectId}`);
    return { success: true };
  } catch (error) {
    console.error('Delete source error:', error);
    return { error: 'Failed to delete source' };
  }
}

export async function buildContextProfile(projectId: string) {
  const user = await requireAuth();

  // Check rate limit
  const rateLimit = await checkRateLimit(user.id, 10);
  if (!rateLimit.allowed) {
    return { error: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 60000)} minutes.` };
  }

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: user.id,
    },
    include: {
      sources: {
        where: {
          status: { in: ['chunked', 'profiled'] },
        },
      },
    },
  });

  if (!project) {
    return { error: 'Project not found' };
  }

  if (project.sources.length === 0) {
    return { error: 'No processed sources available. Please upload and wait for sources to be processed.' };
  }

  try {
    // Queue profile building job
    await enqueueJob(projectId, JobType.build_profile);

    revalidatePath(`/app/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('Build profile error:', error);
    return { error: 'Failed to queue profile building' };
  }
}

export async function startGenerationRun(
  projectId: string,
  options: {
    tonePreset: 'professional' | 'casual' | 'inspirational';
    strictness: 'strict' | 'moderate' | 'loose';
    hashtagDensity: 'low' | 'medium' | 'high';
  }
) {
  const user = await requireAuth();

  // Check rate limit
  const rateLimit = await checkRateLimit(user.id, 20);
  if (!rateLimit.allowed) {
    return { error: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 60000)} minutes.` };
  }

  // Verify project ownership and context profile exists
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: user.id,
    },
    include: {
      contextProfile: true,
    },
  });

  if (!project) {
    return { error: 'Project not found' };
  }

  if (!project.contextProfile) {
    return { error: 'Context profile not found. Please build the context profile first.' };
  }

  try {
    // Create generation run
    const run = await prisma.generationRun.create({
      data: {
        projectId,
        tonePreset: options.tonePreset,
        strictness: options.strictness,
        hashtagDensity: options.hashtagDensity,
        status: 'pending',
      },
    });

    // Queue generation job
    await enqueueJob(projectId, JobType.generate_posts, { runId: run.id });

    revalidatePath(`/app/projects/${projectId}`);
    return { run };
  } catch (error) {
    console.error('Start generation error:', error);
    return { error: 'Failed to start content generation' };
  }
}

export async function getProjectDetails(projectId: string) {
  const user = await requireAuth();

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
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
      },
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      },
    },
  });

  if (!project) {
    return { error: 'Project not found' };
  }

  return { project };
}
