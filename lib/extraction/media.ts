import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

// Check if ffmpeg is available
async function checkFFmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

// Extract audio from video using ffmpeg
async function extractAudioFromVideo(videoBuffer: Buffer, mimeType: string): Promise<Buffer> {
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('webm') ? 'webm' : 'mp4';
  const inputPath = join(tmpdir(), `input-${randomUUID()}.${ext}`);
  const outputPath = join(tmpdir(), `output-${randomUUID()}.mp3`);

  try {
    // Write video to temp file
    await writeFile(inputPath, videoBuffer);

    // Extract audio with ffmpeg
    await execAsync(`ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}" -y`);

    // Read the audio file
    const audioBuffer = await readFile(outputPath);
    return audioBuffer;
  } finally {
    // Cleanup temp files
    try {
      await unlink(inputPath);
    } catch { /* ignore */ }
    try {
      await unlink(outputPath);
    } catch { /* ignore */ }
  }
}

export interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  error?: string;
}

/**
 * Transcription handler for audio/video files.
 * 
 * Current implementation:
 * - Checks for ffmpeg availability
 * - For video files, extracts audio track
 * - Returns a placeholder indicating manual transcription is needed
 * 
 * To enable full transcription:
 * - Integrate with a speech-to-text API (e.g., OpenAI Whisper, AssemblyAI, Deepgram)
 * - Or use a local Whisper model
 */
export async function transcribeMedia(
  buffer: Buffer,
  mimeType: string,
  _originalName?: string
): Promise<TranscriptionResult> {
  // Check if it's audio or video
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');

  if (!isAudio && !isVideo) {
    return {
      success: false,
      error: 'Unsupported media type. Only audio and video files can be transcribed.',
    };
  }

  // Check for ffmpeg
  const hasFFmpeg = await checkFFmpeg();
  
  if (isVideo && !hasFFmpeg) {
    return {
      success: false,
      error: 'Video transcription requires ffmpeg to be installed. Please install ffmpeg and try again.',
    };
  }

  try {
    let audioBuffer: Buffer;
    
    if (isVideo) {
      // Extract audio from video
      audioBuffer = extractAudioFromVideo(buffer, mimeType) as unknown as Buffer;
      await audioBuffer; // Actually wait for it
    } else {
      audioBuffer = buffer;
    }

    // NOTE: This is where you would integrate with a transcription API
    // For now, we return a message indicating that the file was processed
    // but transcription requires an external service
    
    // Example integration points:
    // 1. OpenAI Whisper API
    // 2. AssemblyAI
    // 3. Deepgram
    // 4. Google Cloud Speech-to-Text
    // 5. AWS Transcribe
    
    // For production, uncomment and implement one of these:
    // const transcript = await transcribeWithWhisper(audioBuffer);
    // const transcript = await transcribeWithAssemblyAI(audioBuffer);
    
    return {
      success: false,
      error: `Audio/video file detected (${mimeType}). ` +
        `To enable transcription, integrate with a speech-to-text service. ` +
        `The audio track has been extracted and is ready for processing. ` +
        `File size: ${buffer.length} bytes. ` +
        `Please add the transcript manually or configure a transcription service.`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to process media file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Placeholder for Whisper API integration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function transcribeWithWhisperAPI(_audioBuffer: Buffer): Promise<string> {
  // Example implementation with OpenAI Whisper API:
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const transcription = await openai.audio.transcriptions.create({
  //   file: audioBuffer,
  //   model: 'whisper-1',
  // });
  // return transcription.text;
  throw new Error('Whisper API integration not configured');
}
