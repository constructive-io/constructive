import { uploadFile } from '../src/upload';
import { UploadError } from '../src/types';
import { REQUEST_UPLOAD_URL_MUTATION, CONFIRM_UPLOAD_MUTATION } from '../src/queries';
import type { GraphQLExecutor, FileInput } from '../src/types';

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
 * Known SHA-256 of "hello world"
 */
const HELLO_WORLD_HASH = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

// Mock fetch globally for S3 PUT tests
const originalFetch = global.fetch;

beforeEach(() => {
  // Reset fetch mock before each test
  global.fetch = originalFetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('uploadFile', () => {
  describe('fresh upload (not deduplicated)', () => {
    it('should hash, request URL, PUT to S3, and confirm', async () => {
      const file = createMockFile('hello world');
      const executeCalls: Array<{ query: string; variables: Record<string, unknown> }> = [];

      const execute: GraphQLExecutor = async (query, variables) => {
        executeCalls.push({ query, variables });

        if (query === REQUEST_UPLOAD_URL_MUTATION) {
          return {
            requestUploadUrl: {
              uploadUrl: 'https://s3.example.com/presigned-put-url',
              fileId: 'file-uuid-123',
              key: HELLO_WORLD_HASH,
              deduplicated: false,
              expiresAt: new Date(Date.now() + 900_000).toISOString(),
            },
          };
        }

        if (query === CONFIRM_UPLOAD_MUTATION) {
          return {
            confirmUpload: {
              fileId: 'file-uuid-123',
              status: 'ready',
              success: true,
            },
          };
        }

        throw new Error(`Unexpected query: ${query}`);
      };

      // Mock fetch for S3 PUT
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '',
      });

      const result = await uploadFile({
        file,
        bucketKey: 'avatars',
        execute,
      });

      // Verify result
      expect(result.fileId).toBe('file-uuid-123');
      expect(result.key).toBe(HELLO_WORLD_HASH);
      expect(result.deduplicated).toBe(false);
      expect(result.status).toBe('ready');

      // Verify requestUploadUrl was called with correct input
      expect(executeCalls[0].query).toBe(REQUEST_UPLOAD_URL_MUTATION);
      const requestInput = (executeCalls[0].variables.input as Record<string, unknown>);
      expect(requestInput.bucketKey).toBe('avatars');
      expect(requestInput.contentHash).toBe(HELLO_WORLD_HASH);
      expect(requestInput.contentType).toBe('text/plain');
      expect(requestInput.size).toBe(11);
      expect(requestInput.filename).toBe('test.txt');

      // Verify S3 PUT was called
      expect(global.fetch).toHaveBeenCalledWith(
        'https://s3.example.com/presigned-put-url',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
        }),
      );

      // Verify confirmUpload was called
      expect(executeCalls[1].query).toBe(CONFIRM_UPLOAD_MUTATION);
      expect(executeCalls[1].variables).toEqual({ input: { fileId: 'file-uuid-123' } });
    });
  });

  describe('deduplicated upload', () => {
    it('should skip PUT and confirm when deduplicated', async () => {
      const file = createMockFile('hello world');
      const executeCalls: Array<{ query: string }> = [];

      const execute: GraphQLExecutor = async (query) => {
        executeCalls.push({ query });

        if (query === REQUEST_UPLOAD_URL_MUTATION) {
          return {
            requestUploadUrl: {
              uploadUrl: null,
              fileId: 'existing-file-uuid',
              key: HELLO_WORLD_HASH,
              deduplicated: true,
              expiresAt: null,
            },
          };
        }

        throw new Error(`Unexpected query after dedup: ${query}`);
      };

      global.fetch = jest.fn();

      const result = await uploadFile({
        file,
        bucketKey: 'avatars',
        execute,
      });

      expect(result.fileId).toBe('existing-file-uuid');
      expect(result.deduplicated).toBe(true);
      expect(result.status).toBe('ready');

      // Only requestUploadUrl should have been called (no confirm, no PUT)
      expect(executeCalls).toHaveLength(1);
      expect(executeCalls[0].query).toBe(REQUEST_UPLOAD_URL_MUTATION);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw INVALID_FILE for null file', async () => {
      const execute: GraphQLExecutor = jest.fn();
      await expect(
        uploadFile({ file: null as any, bucketKey: 'test', execute }),
      ).rejects.toMatchObject({ code: 'INVALID_FILE' });
    });

    it('should throw INVALID_FILE for empty bucketKey', async () => {
      const file = createMockFile('test');
      const execute: GraphQLExecutor = jest.fn();
      await expect(
        uploadFile({ file, bucketKey: '', execute }),
      ).rejects.toMatchObject({ code: 'INVALID_FILE' });
    });

    it('should throw REQUEST_UPLOAD_URL_FAILED when mutation fails', async () => {
      const file = createMockFile('test');
      const execute: GraphQLExecutor = async () => {
        throw new Error('Network error');
      };

      await expect(
        uploadFile({ file, bucketKey: 'test', execute }),
      ).rejects.toMatchObject({ code: 'REQUEST_UPLOAD_URL_FAILED' });
    });

    it('should throw PUT_UPLOAD_FAILED when S3 returns error', async () => {
      const file = createMockFile('test');
      const execute: GraphQLExecutor = async (query) => {
        if (query === REQUEST_UPLOAD_URL_MUTATION) {
          return {
            requestUploadUrl: {
              uploadUrl: 'https://s3.example.com/put',
              fileId: 'file-1',
              key: 'hash',
              deduplicated: false,
              expiresAt: new Date().toISOString(),
            },
          };
        }
        throw new Error('Unexpected');
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'SignatureDoesNotMatch',
      });

      await expect(
        uploadFile({ file, bucketKey: 'test', execute }),
      ).rejects.toMatchObject({ code: 'PUT_UPLOAD_FAILED' });
    });

    it('should throw CONFIRM_UPLOAD_FAILED when confirm mutation fails', async () => {
      const file = createMockFile('test');
      let callCount = 0;

      const execute: GraphQLExecutor = async (query) => {
        callCount++;
        if (query === REQUEST_UPLOAD_URL_MUTATION) {
          return {
            requestUploadUrl: {
              uploadUrl: 'https://s3.example.com/put',
              fileId: 'file-1',
              key: 'hash',
              deduplicated: false,
              expiresAt: new Date().toISOString(),
            },
          };
        }
        if (query === CONFIRM_UPLOAD_MUTATION) {
          throw new Error('Database error');
        }
        throw new Error('Unexpected');
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '',
      });

      await expect(
        uploadFile({ file, bucketKey: 'test', execute }),
      ).rejects.toMatchObject({ code: 'CONFIRM_UPLOAD_FAILED' });
    });
  });

  describe('abort support', () => {
    it('should throw ABORTED when signal is already aborted', async () => {
      const file = createMockFile('test');
      const execute: GraphQLExecutor = jest.fn();
      const controller = new AbortController();
      controller.abort();

      await expect(
        uploadFile({ file, bucketKey: 'test', execute, signal: controller.signal }),
      ).rejects.toMatchObject({ code: 'ABORTED' });
    });
  });

  describe('content type handling', () => {
    it('should use application/octet-stream when file.type is empty', async () => {
      const file = createMockFile('binary data', 'file.bin', '');
      const executeCalls: Array<{ query: string; variables: Record<string, unknown> }> = [];

      const execute: GraphQLExecutor = async (query, variables) => {
        executeCalls.push({ query, variables });
        if (query === REQUEST_UPLOAD_URL_MUTATION) {
          return {
            requestUploadUrl: {
              uploadUrl: 'https://s3.example.com/put',
              fileId: 'file-1',
              key: 'hash',
              deduplicated: false,
              expiresAt: new Date().toISOString(),
            },
          };
        }
        if (query === CONFIRM_UPLOAD_MUTATION) {
          return { confirmUpload: { fileId: 'file-1', status: 'ready', success: true } };
        }
        throw new Error('Unexpected');
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '',
      });

      await uploadFile({ file, bucketKey: 'test', execute });

      const requestInput = (executeCalls[0].variables.input as Record<string, unknown>);
      expect(requestInput.contentType).toBe('application/octet-stream');
    });
  });
});
