import prisma from '@/lib/db/prisma';
import { JobStatus, JobType, SourceStatus, GenerationStatus } from '@prisma/client';
import { extractFromSource } from '@/lib/extraction';
import { chunkText } from '@/lib/chunking';
import { AIClient } from '@/lib/ai/client';
import {
  ContextProfileSchema,
  GenerationOutputSchema,
} from '@/lib/ai/schemas';
import {
  CONTEXT_PROFILE_SYSTEM_PROMPT,
  CONTEXT_PROFILE_USER_PROMPT,
  CONTENT_GENERATION_SYSTEM_PROMPT,
  CONTENT_GENERATION_USER_PROMPT,
} from '@/lib/ai/prompts';

const WORKER_ID = `worker-${process.pid}-${Date.now()}`;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface JobLogger {
  info(message: string, meta?: Record<string, unknown>): Promise<void>;
  warn(message: string, meta?: Record<string, unknown>): Promise<void>;
  error(message: string, meta?: Record<string, unknown>): Promise<void>;
}

function createJobLogger(jobId: string): JobLogger {
  const log = async (level: string, message: string, meta?: Record<string, unknown>) => {
    await prisma.jobLog.create({
      data: {
        jobId,
        level,
        message,
        meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined,
      },
    });
    console.log(`[${level.toUpperCase()}] Job ${jobId}: ${message}`, meta || '');
  };

  return {
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
  };
}

async function claimJob(): Promise<string | null> {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() - LOCK_TIMEOUT_MS);

  // Find and claim a pending job
  const job = await prisma.$transaction(async (tx) => {
    // Find eligible job
    const eligible = await tx.job.findFirst({
      where: {
        status: { in: [JobStatus.pending, JobStatus.processing] },
        nextRunAt: { lte: now },
        OR: [
          { lockedAt: null },
          { lockedAt: { lt: lockExpiry } }, // Lock expired
        ],
      },
      orderBy: { nextRunAt: 'asc' },
    });

    if (!eligible) return null;

    // Claim it
    await tx.job.update({
      where: { id: eligible.id },
      data: {
        status: JobStatus.processing,
        lockedAt: now,
        lockedBy: WORKER_ID,
      },
    });

    return eligible.id;
  });

  return job;
}

async function releaseJob(jobId: string, status: JobStatus, errorMessage?: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status,
      lockedAt: null,
      lockedBy: null,
      errorMessage,
    },
  });
}

async function scheduleRetry(jobId: string, error: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  const newAttempts = job.attempts + 1;
  if (newAttempts >= job.maxAttempts) {
    await releaseJob(jobId, JobStatus.failed, `Max attempts exceeded. Last error: ${error}`);
    return;
  }

  // Exponential backoff: 2^attempts minutes
  const delayMinutes = Math.pow(2, newAttempts);
  const nextRunAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: JobStatus.pending,
      attempts: newAttempts,
      nextRunAt,
      lockedAt: null,
      lockedBy: null,
      errorMessage: error,
    },
  });
}

async function processExtractText(jobId: string, sourceId: string, logger: JobLogger) {
  await logger.info('Starting text extraction');

  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) {
    throw new Error('Source not found');
  }

  await prisma.source.update({
    where: { id: sourceId },
    data: { status: SourceStatus.extracting },
  });

  const result = await extractFromSource(
    source.type,
    source.mimeType,
    source.url,
    source.fileBytes,
    source.originalName
  );

  if (!result.success) {
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: SourceStatus.failed,
        errorMessage: result.error,
      },
    });
    throw new Error(result.error);
  }

  await prisma.source.update({
    where: { id: sourceId },
    data: {
      extractedText: result.text || null,
      transcriptText: result.transcript || null,
      status: SourceStatus.extracted,
    },
  });

  // Queue chunking job
  await prisma.job.create({
    data: {
      projectId: source.projectId,
      sourceId: source.id,
      type: JobType.chunk_text,
      status: JobStatus.pending,
    },
  });

  await logger.info('Text extraction completed', {
    textLength: (result.text || result.transcript || '').length,
  });
}

async function processChunkText(jobId: string, sourceId: string, logger: JobLogger) {
  await logger.info('Starting text chunking');

  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) {
    throw new Error('Source not found');
  }

  const text = source.extractedText || source.transcriptText;
  if (!text) {
    throw new Error('No text to chunk');
  }

  await prisma.source.update({
    where: { id: sourceId },
    data: { status: SourceStatus.chunking },
  });

  // Delete existing chunks
  await prisma.sourceChunk.deleteMany({ where: { sourceId } });

  // Create new chunks
  const chunks = chunkText(text);

  for (const chunk of chunks) {
    await prisma.sourceChunk.create({
      data: {
        sourceId,
        chunkIndex: chunk.index,
        content: chunk.content,
        hash: chunk.hash,
        headings: chunk.headings,
        keywords: chunk.keywords,
      },
    });
  }

  await prisma.source.update({
    where: { id: sourceId },
    data: { status: SourceStatus.chunked },
  });

  await logger.info('Text chunking completed', { chunkCount: chunks.length });
}

async function processBuildProfile(jobId: string, projectId: string, logger: JobLogger) {
  await logger.info('Starting context profile generation');

  // Get all chunks from all sources in the project
  const chunks = await prisma.sourceChunk.findMany({
    where: {
      source: {
        projectId,
        status: SourceStatus.chunked,
      },
    },
    select: {
      id: true,
      content: true,
    },
    orderBy: [
      { source: { createdAt: 'asc' } },
      { chunkIndex: 'asc' },
    ],
  });

  if (chunks.length === 0) {
    throw new Error('No chunks available for profile generation');
  }

  await logger.info('Processing chunks', { chunkCount: chunks.length });

  // Generate context profile using AI
  const profile = await AIClient.generateJSON({
    schema: ContextProfileSchema,
    systemPrompt: CONTEXT_PROFILE_SYSTEM_PROMPT,
    userPrompt: CONTEXT_PROFILE_USER_PROMPT(chunks),
  });

  // Upsert context profile
  await prisma.contextProfile.upsert({
    where: { projectId },
    update: {
      audience: profile.audience,
      tone: profile.tone,
      themes: profile.themes,
      keyClaims: profile.keyClaims,
    },
    create: {
      projectId,
      audience: profile.audience,
      tone: profile.tone,
      themes: profile.themes,
      keyClaims: profile.keyClaims,
    },
  });

  // Update all sources to profiled
  await prisma.source.updateMany({
    where: {
      projectId,
      status: SourceStatus.chunked,
    },
    data: { status: SourceStatus.profiled },
  });

  await logger.info('Context profile generated', {
    themes: profile.themes.length,
    claims: profile.keyClaims.length,
  });
}

async function processGeneratePosts(jobId: string, runId: string, logger: JobLogger) {
  await logger.info('Starting content generation');

  const run = await prisma.generationRun.findUnique({
    where: { id: runId },
    include: {
      project: {
        include: {
          contextProfile: true,
          sources: {
            where: { status: SourceStatus.profiled },
            include: {
              chunks: {
                orderBy: { chunkIndex: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  if (!run) {
    throw new Error('Generation run not found');
  }

  if (!run.project.contextProfile) {
    throw new Error('Context profile not found. Please process sources first.');
  }

  await prisma.generationRun.update({
    where: { id: runId },
    data: { status: GenerationStatus.processing },
  });

  // Get all chunks
  const allChunks = run.project.sources.flatMap((s) =>
    s.chunks.map((c) => ({
      id: c.id,
      content: c.content,
    }))
  );

  if (allChunks.length === 0) {
    throw new Error('No chunks available for content generation');
  }

  const profile = run.project.contextProfile;

  // Generate content using AI
  const output = await AIClient.generateJSON({
    schema: GenerationOutputSchema,
    systemPrompt: CONTENT_GENERATION_SYSTEM_PROMPT(run.tonePreset, run.strictness),
    userPrompt: CONTENT_GENERATION_USER_PROMPT(
      {
        audience: profile.audience || '',
        tone: profile.tone || '',
        themes: (profile.themes as string[]) || [],
        keyClaims: (profile.keyClaims as Array<{ claim: string; chunkIds: string[]; quote: string }>) || [],
      },
      allChunks,
      run.hashtagDensity
    ),
  });

  // Delete existing posts for this run
  await prisma.generatedPost.deleteMany({ where: { generationRunId: runId } });

  // Save Instagram carousel posts
  for (const carousel of output.instagram.carousels) {
    await prisma.generatedPost.create({
      data: {
        generationRunId: runId,
        platform: 'instagram',
        instagramType: 'carousel',
        payload: carousel,
        citations: carousel.citations,
      },
    });
  }

  // Save Instagram single posts
  for (const single of output.instagram.singles) {
    await prisma.generatedPost.create({
      data: {
        generationRunId: runId,
        platform: 'instagram',
        instagramType: 'single',
        payload: single,
        citations: single.citations,
      },
    });
  }

  // Save Twitter posts
  for (const tweet of output.twitter) {
    await prisma.generatedPost.create({
      data: {
        generationRunId: runId,
        platform: 'twitter',
        payload: tweet,
        citations: tweet.citations,
      },
    });
  }

  // Save LinkedIn posts
  for (const post of output.linkedin) {
    await prisma.generatedPost.create({
      data: {
        generationRunId: runId,
        platform: 'linkedin',
        payload: post,
        citations: post.citations,
      },
    });
  }

  await prisma.generationRun.update({
    where: { id: runId },
    data: { status: GenerationStatus.completed },
  });

  await logger.info('Content generation completed', {
    instagramCount: output.instagram.carousels.length + output.instagram.singles.length,
    twitterCount: output.twitter.length,
    linkedinCount: output.linkedin.length,
  });
}

async function executeJob(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    console.error(`Job ${jobId} not found`);
    return;
  }

  const logger = createJobLogger(jobId);

  try {
    switch (job.type) {
      case JobType.extract_text:
        if (!job.sourceId) throw new Error('Source ID required for extract_text');
        await processExtractText(jobId, job.sourceId, logger);
        break;

      case JobType.chunk_text:
        if (!job.sourceId) throw new Error('Source ID required for chunk_text');
        await processChunkText(jobId, job.sourceId, logger);
        break;

      case JobType.build_profile:
        await processBuildProfile(jobId, job.projectId, logger);
        break;

      case JobType.generate_posts:
        if (!job.runId) throw new Error('Run ID required for generate_posts');
        await processGeneratePosts(jobId, job.runId, logger);
        break;

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await releaseJob(jobId, JobStatus.completed);
    await logger.info('Job completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger.error('Job failed', { error: errorMessage });
    await scheduleRetry(jobId, errorMessage);
  }
}

export async function runWorker(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  // Process up to 5 jobs per tick
  for (let i = 0; i < 5; i++) {
    const jobId = await claimJob();
    if (!jobId) {
      break; // No more jobs
    }

    try {
      await executeJob(jobId);
      processed++;
    } catch (error) {
      console.error(`Error executing job ${jobId}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}

// Helper to enqueue a new job and optionally process it immediately
export async function enqueueJob(
  projectId: string,
  type: JobType,
  options?: {
    sourceId?: string;
    runId?: string;
    processImmediately?: boolean;
  }
) {
  const job = await prisma.job.create({
    data: {
      projectId,
      type,
      sourceId: options?.sourceId,
      runId: options?.runId,
      status: JobStatus.pending,
    },
  });

  // Process the job immediately in the background (don't await)
  // This ensures jobs are processed right away instead of waiting for the daily cron
  if (options?.processImmediately !== false) {
    runWorker().catch((error) => {
      console.error('Background worker error:', error);
    });
  }

  return job;
}
