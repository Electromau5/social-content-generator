import { NextResponse } from 'next/server';
import { runWorker } from '@/lib/jobs/runner';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max for Vercel

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWorker();
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Worker error:', error);
    return NextResponse.json(
      { error: 'Worker failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Also support GET for Vercel Cron
export async function GET(request: Request) {
  return POST(request);
}
