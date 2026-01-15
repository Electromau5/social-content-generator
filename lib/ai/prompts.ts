import { TonePreset, StrictnessLevel, HashtagDensity } from '@prisma/client';

export const CONTEXT_PROFILE_SYSTEM_PROMPT = `You are an expert content analyst. Your task is to analyze source material and create a comprehensive context profile that will be used to generate social media content.

Analyze the provided content chunks and extract:
1. Target audience - who would be interested in this content
2. Tone and voice - the style and personality of the content
3. Main themes - recurring topics and subjects
4. Key claims - important statements with supporting quotes

IMPORTANT RULES:
- Only extract information that exists in the source material
- Do not invent or assume facts not present in the sources
- Include exact chunkIds for all citations
- Quotes must be verbatim from the source (max 25 words)`;

export const CONTEXT_PROFILE_USER_PROMPT = (chunks: { id: string; content: string }[]) => `
Analyze the following content chunks and create a context profile:

${chunks.map((c) => `[Chunk ID: ${c.id}]\n${c.content}\n---`).join('\n\n')}

Respond with a JSON object matching this schema:
{
  "audience": "string - target audience description",
  "tone": "string - tone and voice characteristics",
  "themes": ["array of main themes"],
  "keyClaims": [
    {
      "claim": "string - the key claim",
      "chunkIds": ["array of chunk IDs supporting this claim"],
      "quote": "string - supporting quote (max 25 words)"
    }
  ]
}`;

const getToneInstructions = (tone: TonePreset): string => {
  switch (tone) {
    case 'professional':
      return 'Use a professional, authoritative tone. Be formal but accessible. Focus on expertise and credibility.';
    case 'casual':
      return 'Use a friendly, conversational tone. Be approachable and relatable. Keep language simple and engaging.';
    case 'inspirational':
      return 'Use an uplifting, motivational tone. Be encouraging and positive. Focus on transformation and possibility.';
    default:
      return 'Use a professional, authoritative tone.';
  }
};

const getStrictnessInstructions = (strictness: StrictnessLevel): string => {
  switch (strictness) {
    case 'strict':
      return 'Every claim MUST have a direct citation from the source material. Do not make any claims without explicit support.';
    case 'moderate':
      return 'Main claims should have citations. Minor observations can be implied from the overall content.';
    case 'loose':
      return 'Include citations for key claims, but you can make reasonable inferences from the source material.';
    default:
      return 'Main claims should have citations.';
  }
};

const getHashtagInstructions = (density: HashtagDensity, platform: string): string => {
  const limits = {
    instagram: { low: '3-5', medium: '6-8', high: '8-10' },
    twitter: { low: '2', medium: '3', high: '4' },
    linkedin: { low: '3', medium: '4', high: '5' },
  };
  
  const platformLimits = limits[platform as keyof typeof limits] || limits.instagram;
  return `Use ${platformLimits[density]} hashtags.`;
};

export const CONTENT_GENERATION_SYSTEM_PROMPT = (
  tone: TonePreset,
  strictness: StrictnessLevel
) => `You are an expert social media content creator. Generate engaging content for Instagram, Twitter/X, and LinkedIn based on the provided context profile and source material.

TONE INSTRUCTIONS:
${getToneInstructions(tone)}

CITATION REQUIREMENTS:
${getStrictnessInstructions(strictness)}

CRITICAL RULES:
1. NEVER invent facts, statistics, or claims not present in the source material
2. NEVER reference current trends, memes, or time-sensitive content
3. NEVER duplicate phrasing across platforms - each platform should have unique content
4. Each post must include citations mapping back to source chunk IDs
5. Quotes in citations must be verbatim from sources (max 25 words)

PLATFORM-SPECIFIC RULES:
- Instagram: Engaging, visual-friendly language. CTAs should encourage engagement.
- Twitter/X: Concise, punchy content under 280 characters. No emojis unless tone indicates.
- LinkedIn: Professional, thought-provoking content with readable line breaks. No emojis unless tone indicates.`;

export const CONTENT_GENERATION_USER_PROMPT = (
  profile: { audience: string; tone: string; themes: string[]; keyClaims: { claim: string; chunkIds: string[]; quote: string }[] },
  chunks: { id: string; content: string }[],
  hashtagDensity: HashtagDensity
) => `
CONTEXT PROFILE:
- Target Audience: ${profile.audience}
- Tone/Voice: ${profile.tone}
- Main Themes: ${profile.themes.join(', ')}
- Key Claims: ${profile.keyClaims.map((c) => `"${c.claim}" (from chunks: ${c.chunkIds.join(', ')})`).join('; ')}

SOURCE CHUNKS FOR REFERENCE:
${chunks.map((c) => `[Chunk ID: ${c.id}]\n${c.content}`).join('\n\n---\n\n')}

HASHTAG DENSITY:
- Instagram: ${getHashtagInstructions(hashtagDensity, 'instagram')}
- Twitter: ${getHashtagInstructions(hashtagDensity, 'twitter')}
- LinkedIn: ${getHashtagInstructions(hashtagDensity, 'linkedin')}

Generate social media content matching this exact JSON schema:
{
  "instagram": {
    "carousels": [
      {
        "type": "carousel",
        "slides": [
          { "slideNumber": 1, "content": "slide text" },
          { "slideNumber": 2, "content": "slide text" }
        ],
        "caption": "caption text",
        "cta": "call to action",
        "hashtags": ["hashtag1", "hashtag2"],
        "citations": [{ "chunkId": "chunk_id", "quote": "quote from source" }]
      }
    ],
    "singles": [
      {
        "type": "single",
        "caption": "caption text",
        "cta": "call to action",
        "hashtags": ["hashtag1"],
        "citations": [{ "chunkId": "chunk_id", "quote": "quote from source" }]
      }
    ]
  },
  "twitter": [
    {
      "content": "tweet text (max 280 chars)",
      "hashtags": ["hashtag1", "hashtag2"],
      "citations": [{ "chunkId": "chunk_id", "quote": "quote from source" }]
    }
  ],
  "linkedin": [
    {
      "content": "post text with\\nline breaks",
      "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
      "citations": [{ "chunkId": "chunk_id", "quote": "quote from source" }]
    }
  ]
}

Requirements:
- Instagram: Generate exactly 2 carousel posts and 3 single posts
- Twitter: Generate exactly 5 tweets (each under 280 characters)
- LinkedIn: Generate exactly 5 posts

Respond with ONLY the JSON object, no additional text.`;
