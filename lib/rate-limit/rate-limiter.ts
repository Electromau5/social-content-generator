import prisma from '@/lib/db/prisma';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(userId: string, tokensNeeded: number = 1): Promise<RateLimitResult> {
  const now = new Date();
  
  // Get or create rate limit state
  let state = await prisma.rateLimitState.findUnique({
    where: { userId },
  });

  if (!state) {
    state = await prisma.rateLimitState.create({
      data: {
        userId,
        tokens: 100,
        lastRefill: now,
        maxTokens: 100,
        refillRate: 10, // 10 tokens per minute
      },
    });
  }

  // Calculate tokens to add based on time elapsed
  const minutesElapsed = (now.getTime() - state.lastRefill.getTime()) / (1000 * 60);
  const tokensToAdd = Math.floor(minutesElapsed * state.refillRate);
  
  // Update tokens (cap at max)
  const currentTokens = Math.min(state.maxTokens, state.tokens + tokensToAdd);
  
  // Check if we have enough tokens
  if (currentTokens < tokensNeeded) {
    const tokensShort = tokensNeeded - currentTokens;
    const minutesUntilReset = Math.ceil(tokensShort / state.refillRate);
    const resetAt = new Date(now.getTime() + minutesUntilReset * 60 * 1000);
    
    return {
      allowed: false,
      remaining: currentTokens,
      resetAt,
    };
  }

  // Consume tokens
  await prisma.rateLimitState.update({
    where: { userId },
    data: {
      tokens: currentTokens - tokensNeeded,
      lastRefill: now,
    },
  });

  return {
    allowed: true,
    remaining: currentTokens - tokensNeeded,
    resetAt: new Date(now.getTime() + 60 * 1000), // Next refill in 1 minute
  };
}

export async function getRateLimitStatus(userId: string): Promise<RateLimitResult> {
  const state = await prisma.rateLimitState.findUnique({
    where: { userId },
  });

  if (!state) {
    return {
      allowed: true,
      remaining: 100,
      resetAt: new Date(),
    };
  }

  const now = new Date();
  const minutesElapsed = (now.getTime() - state.lastRefill.getTime()) / (1000 * 60);
  const tokensToAdd = Math.floor(minutesElapsed * state.refillRate);
  const currentTokens = Math.min(state.maxTokens, state.tokens + tokensToAdd);

  return {
    allowed: currentTokens > 0,
    remaining: currentTokens,
    resetAt: new Date(now.getTime() + 60 * 1000),
  };
}
