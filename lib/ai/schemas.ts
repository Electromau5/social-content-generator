import { z } from 'zod';

// Citation schema used across all generated content
export const CitationSchema = z.object({
  chunkId: z.string(),
  quote: z.string().max(150), // ~25 words max
});

// Context Profile Schema
export const ContextProfileSchema = z.object({
  audience: z.string().describe('Target audience description'),
  tone: z.string().describe('Tone and voice characteristics'),
  themes: z.array(z.string()).describe('Main themes from the content'),
  keyClaims: z.array(
    z.object({
      claim: z.string(),
      chunkIds: z.array(z.string()),
      quote: z.string(),
    })
  ).describe('Key claims with supporting citations'),
});

// Instagram Post Schemas
export const InstagramCarouselSlideSchema = z.object({
  slideNumber: z.number(),
  content: z.string(),
});

export const InstagramCarouselPostSchema = z.object({
  type: z.literal('carousel'),
  slides: z.array(InstagramCarouselSlideSchema).min(2).max(10),
  caption: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()).max(10),
  citations: z.array(CitationSchema),
});

export const InstagramSinglePostSchema = z.object({
  type: z.literal('single'),
  caption: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()).max(10),
  citations: z.array(CitationSchema),
});

export const InstagramPostSchema = z.discriminatedUnion('type', [
  InstagramCarouselPostSchema,
  InstagramSinglePostSchema,
]);

// Twitter Post Schema
export const TwitterPostSchema = z.object({
  content: z.string().max(280),
  hashtags: z.array(z.string()).min(2).max(4),
  citations: z.array(CitationSchema),
});

// LinkedIn Post Schema
export const LinkedInPostSchema = z.object({
  content: z.string(),
  hashtags: z.array(z.string()).min(3).max(5),
  citations: z.array(CitationSchema),
});

// Full Generation Output Schema
export const GenerationOutputSchema = z.object({
  instagram: z.object({
    carousels: z.array(InstagramCarouselPostSchema).length(2),
    singles: z.array(InstagramSinglePostSchema).length(3),
  }),
  twitter: z.array(TwitterPostSchema).length(5),
  linkedin: z.array(LinkedInPostSchema).length(5),
});

// Type exports
export type Citation = z.infer<typeof CitationSchema>;
export type ContextProfile = z.infer<typeof ContextProfileSchema>;
export type InstagramCarouselPost = z.infer<typeof InstagramCarouselPostSchema>;
export type InstagramSinglePost = z.infer<typeof InstagramSinglePostSchema>;
export type InstagramPost = z.infer<typeof InstagramPostSchema>;
export type TwitterPost = z.infer<typeof TwitterPostSchema>;
export type LinkedInPost = z.infer<typeof LinkedInPostSchema>;
export type GenerationOutput = z.infer<typeof GenerationOutputSchema>;
