import crypto from 'crypto';

export interface Chunk {
  content: string;
  index: number;
  hash: string;
  headings: string[];
  keywords: string[];
}

interface ChunkOptions {
  maxChunkSize?: number;
  overlapSize?: number;
}

// Extract headings from text
function extractHeadings(text: string): string[] {
  const headings: string[] = [];
  
  // Markdown headings
  const mdMatches = text.match(/^#{1,6}\s+(.+)$/gm);
  if (mdMatches) {
    headings.push(...mdMatches.map(h => h.replace(/^#+\s+/, '').trim()));
  }
  
  // Lines that look like titles (short, capitalized, ending with newline)
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.length > 3 &&
      trimmed.length < 100 &&
      /^[A-Z]/.test(trimmed) &&
      !trimmed.endsWith('.') &&
      !trimmed.endsWith(',')
    ) {
      // Check if it's followed by a blank line or content
      headings.push(trimmed);
    }
  }
  
  return [...new Set(headings)].slice(0, 10); // Dedupe and limit
}

// Extract keywords using simple frequency analysis
function extractKeywords(text: string): string[] {
  // Common stop words to filter
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'it',
    'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your', 'i',
    'me', 'my', 'he', 'him', 'his', 'she', 'her', 'not', 'no', 'yes', 'all',
    'any', 'some', 'most', 'more', 'less', 'than', 'then', 'just', 'only',
    'also', 'very', 'too', 'so', 'such', 'what', 'which', 'who', 'when',
    'where', 'why', 'how', 'if', 'because', 'about', 'into', 'through',
  ]);

  // Tokenize and count
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq: Record<string, number> = {};
  
  for (const word of words) {
    if (!stopWords.has(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }
  
  // Sort by frequency and take top keywords
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

// Generate content hash
function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// Split text into semantic chunks
export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const { maxChunkSize = 1500, overlapSize = 200 } = options;
  
  // Normalize text
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  if (!normalized) {
    return [];
  }
  
  const chunks: Chunk[] = [];
  
  // Split by paragraphs first
  const paragraphs = normalized.split(/\n\n+/);
  
  let currentChunk = '';
  let currentIndex = 0;
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    
    // If adding this paragraph exceeds max size, save current and start new
    if (currentChunk && (currentChunk.length + trimmed.length + 2) > maxChunkSize) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        index: currentIndex,
        hash: generateHash(currentChunk),
        headings: extractHeadings(currentChunk),
        keywords: extractKeywords(currentChunk),
      });
      currentIndex++;
      
      // Start new chunk with overlap from end of previous
      const words = currentChunk.split(/\s+/);
      const overlapWords = [];
      let overlapLen = 0;
      for (let i = words.length - 1; i >= 0 && overlapLen < overlapSize; i--) {
        overlapWords.unshift(words[i]);
        overlapLen += words[i].length + 1;
      }
      currentChunk = overlapWords.join(' ') + '\n\n' + trimmed;
    } else {
      // Add to current chunk
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: currentIndex,
      hash: generateHash(currentChunk),
      headings: extractHeadings(currentChunk),
      keywords: extractKeywords(currentChunk),
    });
  }
  
  return chunks;
}

// Simple BM25-ish scoring for chunk relevance
export function scoreChunks(
  chunks: Array<{ id: string; content: string; headings: string[]; keywords: string[] }>,
  query: string
): Array<{ id: string; score: number }> {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const avgLength = chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length;
  const k1 = 1.2;
  const b = 0.75;
  
  // Calculate document frequency for each term
  const df: Record<string, number> = {};
  for (const term of queryTerms) {
    df[term] = chunks.filter(c => 
      c.content.toLowerCase().includes(term) ||
      c.headings.some(h => h.toLowerCase().includes(term)) ||
      c.keywords.some(k => k.includes(term))
    ).length;
  }
  
  // Score each chunk
  return chunks.map(chunk => {
    let score = 0;
    const docLen = chunk.content.length;
    const contentLower = chunk.content.toLowerCase();
    
    for (const term of queryTerms) {
      const tf = (contentLower.match(new RegExp(term, 'gi')) || []).length;
      const idf = Math.log((chunks.length - df[term] + 0.5) / (df[term] + 0.5) + 1);
      const termScore = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgLength))));
      score += termScore;
      
      // Boost for heading matches
      if (chunk.headings.some(h => h.toLowerCase().includes(term))) {
        score *= 1.5;
      }
      
      // Boost for keyword matches
      if (chunk.keywords.some(k => k.includes(term))) {
        score *= 1.2;
      }
    }
    
    return { id: chunk.id, score };
  }).sort((a, b) => b.score - a.score);
}
