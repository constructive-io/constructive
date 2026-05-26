import type { ChunkStrategy, Chunk } from './types';

/**
 * Split text into overlapping chunks using the specified strategy.
 *
 * Strategies:
 *   fixed     — split at character boundaries every chunk_size characters
 *   sentence  — split on sentence boundaries (. ? ! followed by whitespace)
 *   paragraph — split on double-newline paragraph boundaries
 *   semantic  — same as paragraph (semantic splitting requires a model;
 *               falls back to paragraph for now)
 */
export function splitText(
  text: string,
  strategy: ChunkStrategy,
  chunkSize: number,
  chunkOverlap: number
): Chunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const segments = segmentText(text, strategy);
  return assembleChunks(segments, chunkSize, chunkOverlap);
}

// ── Segmentation ──────────────────────────────────────────────────────────

function segmentText(text: string, strategy: ChunkStrategy): string[] {
  switch (strategy) {
  case 'fixed':
    return [text];
  case 'sentence':
    return splitSentences(text);
  case 'paragraph':
  case 'semantic':
    return splitParagraphs(text);
  default:
    return [text];
  }
}

function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.filter((s) => s.trim().length > 0);
}

function splitParagraphs(text: string): string[] {
  const parts = text.split(/\n\s*\n/);
  return parts.filter((p) => p.trim().length > 0);
}

// ── Assembly ──────────────────────────────────────────────────────────────

/**
 * Assemble segments into chunks respecting size and overlap.
 * Segments that fit within chunkSize are merged together.
 * Segments exceeding chunkSize are split at character boundaries.
 */
function assembleChunks(
  segments: string[],
  chunkSize: number,
  chunkOverlap: number
): Chunk[] {
  const chunks: Chunk[] = [];
  let buffer = '';
  let chunkIndex = 0;

  for (const segment of segments) {
    const candidate = buffer.length > 0 ? buffer + '\n\n' + segment : segment;

    if (candidate.length <= chunkSize) {
      buffer = candidate;
    } else {
      // Flush current buffer as a chunk
      if (buffer.length > 0) {
        chunks.push(makeChunk(buffer, chunkIndex++));
      }

      // If the segment itself exceeds chunkSize, split it at fixed intervals
      if (segment.length > chunkSize) {
        const subChunks = splitFixed(segment, chunkSize, chunkOverlap);
        for (const sub of subChunks) {
          chunks.push(makeChunk(sub, chunkIndex++));
        }
        buffer = '';
      } else {
        buffer = segment;
      }
    }
  }

  // Flush remaining buffer
  if (buffer.length > 0) {
    chunks.push(makeChunk(buffer, chunkIndex++));
  }

  // Apply overlap: prepend tail of previous chunk to each subsequent chunk
  if (chunkOverlap > 0 && chunks.length > 1) {
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1].content;
      const overlapText = prev.slice(Math.max(0, prev.length - chunkOverlap));
      chunks[i] = {
        ...chunks[i],
        content: overlapText + chunks[i].content,
        metadata: {
          ...chunks[i].metadata,
          overlap_chars: overlapText.length
        }
      };
    }
  }

  return chunks;
}

function splitFixed(text: string, size: number, overlap: number): string[] {
  const result: string[] = [];
  let start = 0;
  while (start < text.length) {
    result.push(text.slice(start, start + size));
    start += size - overlap;
    if (start + overlap >= text.length && start < text.length) {
      result.push(text.slice(start));
      break;
    }
  }
  return result;
}

function makeChunk(content: string, chunkIndex: number): Chunk {
  return {
    content: content.trim(),
    chunk_index: chunkIndex,
    metadata: {
      char_count: content.trim().length
    }
  };
}
