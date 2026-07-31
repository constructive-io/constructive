import { DEFAULT_BUCKET_QUERY_FIELD } from '../src/queries';
import type { FileInput,GraphQLExecutor } from '../src/types';
import { uploadFile } from '../src/upload';

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
  global.fetch = originalFetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

/**
 * Build a mock executor that returns data nested under the bucket query field.
 * The per-table pattern returns: { bucketByKey: { requestUploadUrl: { ... } } }
 */
function createMockExecutor(
  payload: Record<string, unknown>,
  bucketQueryField = DEFAULT_BUCKET_QUERY_FIELD,
): { execute: GraphQLExecutor; calls: Array<{ query: string; variables: Record<string, unknown> }> } {
  const calls: Array<{ query: string; variables: Record<string, unknown> }> = [];
  const execute: GraphQLExecutor = async (query, variables) => {
    calls.push({ query, variables });
    return {
      [bucketQueryField]: {
        id: 'bucket-uuid',
        requestUploadUrl: payload,
      },
    };
  };
  return { execute, calls };
}

describe('uploadFile', () => {
  describe('fresh upload (not deduplicated)', () => {
    it('should hash, request URL via bucket field, and PUT to S3', async () => {
      const file = createMockFile('hello world');
      const { execute, calls } = createMockExecutor({
        uploadUrl: 'https://s3.example.com/presigned-put-url',
        fileId: 'file-uuid-123',
        key: HELLO_WORLD_HASH,
        deduplicated: false,
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
        previousVersionId: null,
      });

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

      expect(result.fileId).toBe('file-uuid-123');
      expect(result.key).toBe(HELLO_WORLD_HASH);
      expect(result.deduplicated).toBe(false);

      // Verify per-table query was called with flat variables (not input object)
      expect(calls).toHaveLength(1);
      expect(calls[0].query).toContain('bucketByKey');
      expect(calls[0].query).toContain('requestUploadUrl');
      expect(calls[0].variables.key).toBe('avatars');
      expect(calls[0].variables.contentHash).toBe(HELLO_WORLD_HASH);
      expect(calls[0].variables.contentType).toBe('text/plain');
      expect(calls[0].variables.size).toBe(11);
      expect(calls[0].variables.filename).toBe('test.txt');

      // Verify S3 PUT was called
      expect(global.fetch).toHaveBeenCalledWith(
        'https://s3.example.com/presigned-put-url',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
        }),
      );
    });
  });

  describe('deduplicated upload', () => {
    it('should skip PUT when deduplicated', async () => {
      const file = createMockFile('hello world');
      const { execute, calls } = createMockExecutor({
        uploadUrl: null,
        fileId: 'existing-file-uuid',
        key: HELLO_WORLD_HASH,
        deduplicated: true,
        expiresAt: null,
        previousVersionId: null,
      });

      global.fetch = jest.fn();

      const result = await uploadFile({
        file,
        bucketKey: 'avatars',
        execute,
      });

      expect(result.fileId).toBe('existing-file-uuid');
      expect(result.deduplicated).toBe(true);

      expect(calls).toHaveLength(1);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('custom bucketQueryField', () => {
    it('should use the provided bucket query field name', async () => {
      const file = createMockFile('hello world');
      const { execute, calls } = createMockExecutor(
        {
          uploadUrl: 'https://s3.example.com/put',
          fileId: 'file-1',
          key: HELLO_WORLD_HASH,
          deduplicated: false,
          expiresAt: new Date().toISOString(),
          previousVersionId: null,
        },
        'appBucketByKey',
      );

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '',
      });

      await uploadFile({
        file,
        bucketKey: 'private',
        execute,
        bucketQueryField: 'appBucketByKey',
      });

      expect(calls[0].query).toContain('appBucketByKey');
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

    it('should throw REQUEST_UPLOAD_URL_FAILED when query fails', async () => {
      const file = createMockFile('test');
      const execute: GraphQLExecutor = async () => {
        throw new Error('Network error');
      };

      await expect(
        uploadFile({ file, bucketKey: 'test', execute }),
      ).rejects.toMatchObject({ code: 'REQUEST_UPLOAD_URL_FAILED' });
    });

    it('should throw REQUEST_UPLOAD_URL_FAILED when bucket not found', async () => {
      const file = createMockFile('test');
      const execute: GraphQLExecutor = async () => {
        return { bucketByKey: null } as any;
      };

      await expect(
        uploadFile({ file, bucketKey: 'nonexistent', execute }),
      ).rejects.toMatchObject({ code: 'REQUEST_UPLOAD_URL_FAILED' });
    });

    it('should throw PUT_UPLOAD_FAILED when S3 returns error', async () => {
      const file = createMockFile('test');
      const { execute } = createMockExecutor({
        uploadUrl: 'https://s3.example.com/put',
        fileId: 'file-1',
        key: 'hash',
        deduplicated: false,
        expiresAt: new Date().toISOString(),
        previousVersionId: null,
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'SignatureDoesNotMatch',
      });

      await expect(
        uploadFile({ file, bucketKey: 'test', execute }),
      ).rejects.toMatchObject({ code: 'PUT_UPLOAD_FAILED' });
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
      const { execute, calls } = createMockExecutor({
        uploadUrl: 'https://s3.example.com/put',
        fileId: 'file-1',
        key: 'hash',
        deduplicated: false,
        expiresAt: new Date().toISOString(),
        previousVersionId: null,
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '',
      });

      await uploadFile({ file, bucketKey: 'test', execute });

      expect(calls[0].variables.contentType).toBe('application/octet-stream');
    });
  });
});
