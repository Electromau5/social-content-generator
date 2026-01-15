import { extractTextFromPDF } from './pdf';
import { extractTextFromDOCX } from './docx';
import { extractTextFromURL } from './url';
import { transcribeMedia } from './media';

export interface ExtractionResult {
  success: boolean;
  text?: string;
  transcript?: string;
  error?: string;
}

export async function extractFromSource(
  type: 'file' | 'url',
  mimeType: string | null,
  url: string | null,
  fileBytes: Buffer | null,
  originalName: string | null
): Promise<ExtractionResult> {
  try {
    // URL extraction
    if (type === 'url') {
      if (!url) {
        return { success: false, error: 'URL is required for URL sources' };
      }
      const text = await extractTextFromURL(url);
      return { success: true, text };
    }

    // File extraction
    if (!fileBytes) {
      return { success: false, error: 'File bytes are required for file sources' };
    }

    if (!mimeType) {
      return { success: false, error: 'MIME type is required for file sources' };
    }

    // Handle by MIME type
    switch (true) {
      case mimeType === 'application/pdf':
        return { success: true, text: await extractTextFromPDF(fileBytes) };

      case mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case mimeType === 'application/msword':
        return { success: true, text: await extractTextFromDOCX(fileBytes) };

      case mimeType === 'text/plain':
      case mimeType === 'text/markdown':
        return { success: true, text: fileBytes.toString('utf-8') };

      case mimeType.startsWith('audio/'):
      case mimeType.startsWith('video/'): {
        const result = await transcribeMedia(fileBytes, mimeType, originalName || undefined);
        if (result.success && result.transcript) {
          return { success: true, transcript: result.transcript };
        }
        return { success: false, error: result.error || 'Transcription failed' };
      }

      default:
        return { success: false, error: `Unsupported MIME type: ${mimeType}` };
    }
  } catch (error) {
    return {
      success: false,
      error: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
