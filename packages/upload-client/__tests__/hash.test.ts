import { hashFile, hashFileChunked } from '../src/hash';
import { UploadError } from '../src/types';
import type { FileInput } from '../src/types';

/**
 * Create a mock FileInput from a string body.
 */
function createMockFile(
  body: string,
  name = 'test.txt',
  type = 'text/plain',
): FileInput {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  return {
    name,
    size: data.byteLength,
    type,
    arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    slice: (start = 0, end = data.byteLength) => {
      const sliced = data.slice(start, end);
      return new Blob([sliced]);
    },
  };
}

/**
 * Known SHA-256 hash of an empty string.
 * echo -n "" | sha256sum → e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
 */
const EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * Known SHA-256 of "hello world"
 * echo -n "hello world" | sha256sum → b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
 */
const HELLO_WORLD_HASH = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

describe('hashFile', () => {
  it('should produce correct SHA-256 for known input', async () => {
    const file = createMockFile('hello world');
    const hash = await hashFile(file);
    expect(hash).toBe(HELLO_WORLD_HASH);
  });

  it('should produce a 64-char lowercase hex string', async () => {
    const file = createMockFile('test content');
    const hash = await hashFile(file);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce deterministic output (same content = same hash)', async () => {
    const file1 = createMockFile('identical content');
    const file2 = createMockFile('identical content');
    const hash1 = await hashFile(file1);
    const hash2 = await hashFile(file2);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different content', async () => {
    const file1 = createMockFile('content A');
    const file2 = createMockFile('content B');
    const hash1 = await hashFile(file1);
    const hash2 = await hashFile(file2);
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty file (zero bytes)', async () => {
    const file = createMockFile('');
    // size is 0, but the function should still hash it
    const hash = await hashFile(file);
    expect(hash).toBe(EMPTY_HASH);
  });

  it('should throw UploadError for null file', async () => {
    await expect(hashFile(null as any)).rejects.toThrow(UploadError);
    await expect(hashFile(null as any)).rejects.toMatchObject({ code: 'INVALID_FILE' });
  });

  it('should handle binary-like content (UTF-8 multibyte)', async () => {
    const file = createMockFile('emoji: 🎉🚀 and accents: ñ ü ö');
    const hash = await hashFile(file);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('hashFileChunked', () => {
  it('should produce the same hash as hashFile for the same content', async () => {
    const body = 'hello world';
    const file = createMockFile(body);
    const hashDirect = await hashFile(file);
    const hashChunked = await hashFileChunked(createMockFile(body));
    expect(hashChunked).toBe(hashDirect);
  });

  it('should produce correct hash with very small chunk size', async () => {
    // Force many chunks by using 1-byte chunk size
    const file = createMockFile('hello world');
    const hash = await hashFileChunked(file, 1);
    expect(hash).toBe(HELLO_WORLD_HASH);
  });

  it('should produce correct hash when chunk size exceeds file size', async () => {
    const file = createMockFile('hello world');
    // Chunk size of 1MB for an 11-byte file → single chunk
    const hash = await hashFileChunked(file, 1024 * 1024);
    expect(hash).toBe(HELLO_WORLD_HASH);
  });

  it('should fire progress callbacks', async () => {
    const body = 'abcdefghij'; // 10 bytes
    const file = createMockFile(body);
    const progressValues: number[] = [];

    await hashFileChunked(file, 3, (pct) => progressValues.push(pct));

    // With 10 bytes and 3-byte chunks: 3, 6, 9, 10 → ~30%, 60%, 90%, 100%
    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[progressValues.length - 1]).toBe(100);
    // Each value should be increasing
    for (let i = 1; i < progressValues.length; i++) {
      expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
    }
  });

  it('should handle empty file', async () => {
    const file = createMockFile('');
    const hash = await hashFileChunked(file);
    expect(hash).toBe(EMPTY_HASH);
  });

  it('should throw for invalid chunk size', async () => {
    const file = createMockFile('test');
    await expect(hashFileChunked(file, 0)).rejects.toThrow(UploadError);
    await expect(hashFileChunked(file, -1)).rejects.toThrow(UploadError);
  });

  it('should produce same hash for simulated large file (multiple chunks)', async () => {
    // Create a "large" string (1000 chars) and hash with 100-byte chunks
    const body = 'x'.repeat(1000);
    const file = createMockFile(body);
    const hashDirect = await hashFile(file);
    const hashChunked = await hashFileChunked(createMockFile(body), 100);
    expect(hashChunked).toBe(hashDirect);
  });
});
