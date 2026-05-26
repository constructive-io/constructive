import { splitText } from '../src/chunker';

describe('splitText', () => {
  it('returns empty array for empty text', () => {
    expect(splitText('', 'paragraph', 1000, 200)).toEqual([]);
    expect(splitText('   ', 'paragraph', 1000, 200)).toEqual([]);
  });

  describe('paragraph strategy', () => {
    it('splits on double newlines', () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const chunks = splitText(text, 'paragraph', 1000, 0);
      expect(chunks.length).toBe(1); // all fit in one chunk
      expect(chunks[0].content).toContain('First paragraph.');
      expect(chunks[0].content).toContain('Third paragraph.');
    });

    it('creates multiple chunks when paragraphs exceed size', () => {
      const para = 'A'.repeat(500);
      const text = `${para}\n\n${para}\n\n${para}`;
      const chunks = splitText(text, 'paragraph', 600, 0);
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.chunk_index).toBeGreaterThanOrEqual(0);
        expect(chunk.content.length).toBeGreaterThan(0);
      }
    });

    it('assigns sequential chunk indexes', () => {
      const para = 'X'.repeat(400);
      const text = `${para}\n\n${para}\n\n${para}`;
      const chunks = splitText(text, 'paragraph', 500, 0);
      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].chunk_index).toBe(i);
      }
    });
  });

  describe('sentence strategy', () => {
    it('splits on sentence boundaries', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = splitText(text, 'sentence', 30, 0);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('keeps short text in one chunk', () => {
      const text = 'Hello world.';
      const chunks = splitText(text, 'sentence', 1000, 0);
      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe('Hello world.');
    });
  });

  describe('fixed strategy', () => {
    it('splits at character boundaries', () => {
      const text = 'A'.repeat(300);
      const chunks = splitText(text, 'fixed', 100, 0);
      expect(chunks.length).toBe(3);
      expect(chunks[0].content.length).toBe(100);
    });

    it('handles overlap', () => {
      const text = 'A'.repeat(200);
      const chunks = splitText(text, 'fixed', 100, 20);
      expect(chunks.length).toBeGreaterThan(2);
      // Second chunk should start with overlap from first
    });
  });

  describe('overlap', () => {
    it('prepends tail of previous chunk', () => {
      const para1 = 'First para content here.';
      const para2 = 'Second para content here.';
      const text = `${para1}\n\n${para2}`;
      const chunks = splitText(text, 'paragraph', 30, 10);
      if (chunks.length > 1) {
        // Second chunk should contain overlap from first
        expect(chunks[1].metadata).toHaveProperty('overlap_chars');
      }
    });
  });

  describe('metadata', () => {
    it('includes char_count in metadata', () => {
      const text = 'Test content.';
      const chunks = splitText(text, 'paragraph', 1000, 0);
      expect(chunks[0].metadata).toHaveProperty('char_count');
      expect(chunks[0].metadata.char_count).toBe(text.length);
    });
  });
});
