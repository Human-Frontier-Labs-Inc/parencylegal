/**
 * Document Chunking Service
 * Phase 5: Document Intelligence (RAG)
 *
 * Splits documents into chunks for embedding and semantic search
 */

// Approximate tokens per character (for English text)
const CHARS_PER_TOKEN = 4;

// Default chunk configuration
export const CHUNK_CONFIG = {
  maxTokens: 500, // Target chunk size
  overlapTokens: 50, // Overlap between chunks
  minChunkSize: 100, // Minimum chunk size in characters
} as const;

export interface DocumentChunk {
  content: string;
  index: number;
  tokenCount: number;
  metadata: {
    startChar: number;
    endChar: number;
    pageNumber?: number;
    section?: string;
  };
}

/**
 * Estimate token count from text
 * More accurate than simple char count, but still an approximation
 */
export function estimateTokens(text: string): number {
  // Split on whitespace and punctuation for better accuracy
  const words = text.split(/\s+/).filter(Boolean);
  // Average ~1.3 tokens per word for English
  return Math.ceil(words.length * 1.3);
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or newline
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.filter(s => s.trim().length > 0);
}

/**
 * Split text into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  // Split on double newlines or more
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs.filter(p => p.trim().length > 0);
}

/**
 * Chunk a document into smaller pieces for embedding
 *
 * Strategy:
 * 1. Split into paragraphs
 * 2. If paragraph is too long, split into sentences
 * 3. Combine small paragraphs/sentences until we hit max tokens
 * 4. Add overlap between chunks for context continuity
 */
export function chunkDocument(
  text: string,
  config: Partial<typeof CHUNK_CONFIG> = {}
): DocumentChunk[] {
  const { maxTokens, overlapTokens, minChunkSize } = { ...CHUNK_CONFIG, ...config };

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: DocumentChunk[] = [];
  const paragraphs = splitIntoParagraphs(text);

  let currentChunk = '';
  let currentStartChar = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // If paragraph alone is too long, split it by sentences
    if (paragraphTokens > maxTokens) {
      // First, save any current chunk
      if (currentChunk.trim().length >= minChunkSize) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          tokenCount: estimateTokens(currentChunk),
          metadata: {
            startChar: currentStartChar,
            endChar: currentStartChar + currentChunk.length,
          },
        });
        currentStartChar += currentChunk.length;
        currentChunk = '';
      }

      // Now split the long paragraph into sentences
      const sentences = splitIntoSentences(paragraph);
      let sentenceChunk = '';

      for (const sentence of sentences) {
        const combinedTokens = estimateTokens(sentenceChunk + ' ' + sentence);

        if (combinedTokens > maxTokens && sentenceChunk.trim().length >= minChunkSize) {
          // Save current sentence chunk
          chunks.push({
            content: sentenceChunk.trim(),
            index: chunkIndex++,
            tokenCount: estimateTokens(sentenceChunk),
            metadata: {
              startChar: currentStartChar,
              endChar: currentStartChar + sentenceChunk.length,
            },
          });
          currentStartChar += sentenceChunk.length;

          // Start new chunk with overlap
          const overlapText = getOverlapText(sentenceChunk, overlapTokens);
          sentenceChunk = overlapText + sentence;
        } else {
          sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
        }
      }

      // Don't forget the last sentence chunk
      if (sentenceChunk.trim().length >= minChunkSize) {
        currentChunk = sentenceChunk;
      }
    } else {
      // Check if adding this paragraph exceeds max tokens
      const combinedTokens = estimateTokens(currentChunk + '\n\n' + paragraph);

      if (combinedTokens > maxTokens && currentChunk.trim().length >= minChunkSize) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          tokenCount: estimateTokens(currentChunk),
          metadata: {
            startChar: currentStartChar,
            endChar: currentStartChar + currentChunk.length,
          },
        });
        currentStartChar += currentChunk.length;

        // Start new chunk with overlap
        const overlapText = getOverlapText(currentChunk, overlapTokens);
        currentChunk = overlapText + paragraph;
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length >= minChunkSize) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      tokenCount: estimateTokens(currentChunk),
      metadata: {
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
      },
    });
  }

  return chunks;
}

/**
 * Get overlap text from the end of a chunk
 */
function getOverlapText(text: string, overlapTokens: number): string {
  const targetChars = overlapTokens * CHARS_PER_TOKEN;
  if (text.length <= targetChars) {
    return text + ' ';
  }

  // Try to break at sentence boundary
  const endPortion = text.slice(-targetChars * 2);
  const sentenceMatch = endPortion.match(/[.!?]\s+([^.!?]+)$/);

  if (sentenceMatch) {
    return sentenceMatch[1] + ' ';
  }

  // Fall back to word boundary
  const wordMatch = text.slice(-targetChars).match(/\s(\S+\s*)+$/);
  if (wordMatch) {
    return wordMatch[0].trim() + ' ';
  }

  return text.slice(-targetChars) + ' ';
}

/**
 * Extract page numbers from text if available
 * Looks for patterns like "Page 1", "- 1 -", etc.
 */
export function extractPageNumbers(text: string): Map<number, number> {
  const pageMap = new Map<number, number>(); // charPosition -> pageNumber

  // Common page number patterns
  const patterns = [
    /Page\s+(\d+)/gi,
    /- (\d+) -/g,
    /\[Page (\d+)\]/gi,
    /^(\d+)$/gm, // Standalone numbers on their own line
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const pageNum = parseInt(match[1], 10);
      if (pageNum > 0 && pageNum < 10000) { // Sanity check
        pageMap.set(match.index, pageNum);
      }
    }
  }

  return pageMap;
}

/**
 * Add page numbers to chunks based on position
 */
export function addPageNumbersToChunks(
  chunks: DocumentChunk[],
  pageMap: Map<number, number>
): DocumentChunk[] {
  if (pageMap.size === 0) {
    return chunks;
  }

  const pagePositions = Array.from(pageMap.entries()).sort((a, b) => a[0] - b[0]);

  return chunks.map(chunk => {
    // Find the page number for this chunk's position
    let pageNumber: number | undefined;

    for (const [pos, page] of pagePositions) {
      if (pos <= chunk.metadata.startChar) {
        pageNumber = page;
      } else {
        break;
      }
    }

    return {
      ...chunk,
      metadata: {
        ...chunk.metadata,
        pageNumber,
      },
    };
  });
}
