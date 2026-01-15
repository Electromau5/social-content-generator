# Social Content Generator

A production-ready web application that lets users upload source material, parses it into context, generates social content (Instagram/Twitter/LinkedIn), and allows copying/downloading results.

## Features

- **User Authentication**: Sign up/sign in with credentials
- **Project Management**: Create and manage content projects
- **Source Upload**: Support for PDF, DOCX, TXT, MD, audio (MP3/WAV), video (MP4/WebM), and URLs
- **AI-Powered Processing**:
  - Text extraction from documents
  - URL content fetching
  - Text chunking for optimal context
  - Context profile generation
- **Content Generation**:
  - Instagram: 2 carousel posts + 3 single posts (with captions, CTAs, hashtags)
  - Twitter/X: 5 tweets (≤280 chars, 2-4 hashtags)
  - LinkedIn: 5 posts (professional tone, 3-5 hashtags)
- **Export Options**: Copy individual posts, download JSON or CSV
- **Citation Tracking**: All generated content includes citations to source material
- **Customizable Generation**: Tone presets, strictness levels, hashtag density

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js Server Actions + Route Handlers
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (Credentials provider)
- **AI**: Anthropic Claude API
- **Jobs**: DB-backed job queue with Vercel Cron
- **Deployment**: Vercel

## Local Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Anthropic API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd social-content-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/social_content_generator"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
   ANTHROPIC_API_KEY="sk-ant-your-api-key"
   CRON_SECRET="<generate-with-openssl-rand-base64-32>"
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Manually trigger the job worker** (in development)
   ```bash
   curl -X POST http://localhost:3000/api/cron/worker \
     -H "Authorization: Bearer <your-cron-secret>"
   ```

The app will be available at `http://localhost:3000`

## Vercel Deployment

### 1. Create a Vercel Project

```bash
vercel
```

### 2. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

- `DATABASE_URL`: Your PostgreSQL connection string (use Vercel Postgres or external provider)
- `NEXTAUTH_URL`: Your production URL (e.g., `https://your-app.vercel.app`)
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `CRON_SECRET`: Generate with `openssl rand -base64 32`

### 3. Set up Cron Job

The `vercel.json` already configures a cron job to run every minute:

```json
{
  "crons": [
    {
      "path": "/api/cron/worker",
      "schedule": "* * * * *"
    }
  ]
}
```

**Important**: Vercel Cron jobs are only available on Pro and Enterprise plans. For hobby plans, you can:
- Use an external cron service (e.g., cron-job.org, Upstash QStash)
- Manually trigger the worker endpoint

### 4. Deploy

```bash
vercel --prod
```

## Project Structure

```
social-content-generator/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   └── signup/route.ts
│   │   └── cron/
│   │       └── worker/route.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx (dashboard)
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── generate/page.tsx
│   │   │       └── runs/[runId]/page.tsx
│   │   └── sign-out-button.tsx
│   ├── auth/
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   ├── actions/
│   │   ├── projects.ts
│   │   └── runs.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx (landing)
│   └── providers.tsx
├── components/
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── tabs.tsx
│       ├── toast.tsx
│       ├── toaster.tsx
│       └── use-toast.ts
├── lib/
│   ├── ai/
│   │   ├── client.ts
│   │   ├── prompts.ts
│   │   └── schemas.ts
│   ├── auth/
│   │   ├── auth-options.ts
│   │   └── session.ts
│   ├── chunking/
│   │   └── index.ts
│   ├── db/
│   │   └── prisma.ts
│   ├── extraction/
│   │   ├── docx.ts
│   │   ├── index.ts
│   │   ├── media.ts
│   │   ├── pdf.ts
│   │   └── url.ts
│   ├── jobs/
│   │   └── runner.ts
│   ├── rate-limit/
│   │   └── rate-limiter.ts
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── types/
│   └── next-auth.d.ts
├── .env.example
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

## Data Model

- **User**: Authentication and workspace
- **Project**: Container for sources and generated content
- **Source**: Uploaded files or URLs with extracted text
- **SourceChunk**: Processed text chunks with keywords/headings
- **ContextProfile**: AI-generated audience/tone/themes/claims
- **GenerationRun**: Content generation job with parameters
- **GeneratedPost**: Platform-specific content with citations
- **Job**: Background processing queue
- **JobLog**: Processing logs for debugging
- **RateLimitState**: Per-user rate limiting

## API Rate Limiting

- Token bucket algorithm stored in database
- Default: 100 tokens max, 10 tokens/minute refill
- Profile building: 10 tokens
- Content generation: 20 tokens

## Audio/Video Transcription

The app includes a baseline implementation for audio/video processing:

1. Extracts audio track from video files using ffmpeg
2. Returns a message indicating transcription requires external service integration

To enable full transcription, integrate with:
- OpenAI Whisper API
- AssemblyAI
- Deepgram
- Google Cloud Speech-to-Text
- AWS Transcribe

See `lib/extraction/media.ts` for integration points.

## Security

- All routes protected by NextAuth session
- Users can only access their own projects/sources
- Anthropic API key never exposed to client
- Cron worker protected by secret header
- Rate limiting prevents abuse

## License

MIT
