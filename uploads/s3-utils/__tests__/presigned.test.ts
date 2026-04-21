/**
 * Tests for presigned URL helpers.
 *
 * These tests verify the function signatures and parameter handling.
 * Actual S3 integration is tested in the server-test suite.
 */

import { presignPutUrl, presignGetUrl, headObject } from '../src/presigned';

// Mock the AWS SDK modules
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-presigned-url.example.com'),
}));

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    PutObjectCommand: jest.fn().mockImplementation((params) => ({ input: params })),
    GetObjectCommand: jest.fn().mockImplementation((params) => ({ input: params })),
    HeadObjectCommand: jest.fn().mockImplementation((params) => ({ input: params })),
  };
});

const mockClient = {
  send: jest.fn(),
} as any;

describe('presignPutUrl', () => {
  it('generates a presigned PUT URL', async () => {
    const url = await presignPutUrl(mockClient, {
      bucket: 'test-bucket',
      key: 'uploads/photo.jpg',
      contentType: 'image/jpeg',
      contentLength: 102400,
    });
    expect(url).toBe('https://mock-presigned-url.example.com');
  });

  it('uses default expiresIn of 900 seconds', async () => {
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    await presignPutUrl(mockClient, {
      bucket: 'test-bucket',
      key: 'test.txt',
      contentType: 'text/plain',
      contentLength: 100,
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      mockClient,
      expect.anything(),
      { expiresIn: 900 },
    );
  });

  it('respects custom expiresIn', async () => {
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    await presignPutUrl(mockClient, {
      bucket: 'test-bucket',
      key: 'test.txt',
      contentType: 'text/plain',
      contentLength: 100,
      expiresIn: 1800,
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      mockClient,
      expect.anything(),
      { expiresIn: 1800 },
    );
  });
});

describe('presignGetUrl', () => {
  it('generates a presigned GET URL', async () => {
    const url = await presignGetUrl(mockClient, {
      bucket: 'test-bucket',
      key: 'uploads/photo.jpg',
    });
    expect(url).toBe('https://mock-presigned-url.example.com');
  });

  it('uses default expiresIn of 3600 seconds', async () => {
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    await presignGetUrl(mockClient, {
      bucket: 'test-bucket',
      key: 'test.txt',
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      mockClient,
      expect.anything(),
      { expiresIn: 3600 },
    );
  });
});

describe('headObject', () => {
  beforeEach(() => {
    mockClient.send.mockReset();
  });

  it('returns metadata when object exists', async () => {
    mockClient.send.mockResolvedValue({
      ContentType: 'image/jpeg',
      ContentLength: 102400,
    });

    const result = await headObject(mockClient, 'test-bucket', 'photo.jpg');
    expect(result).toEqual({
      contentType: 'image/jpeg',
      contentLength: 102400,
    });
  });

  it('returns null when object does not exist (NotFound)', async () => {
    mockClient.send.mockRejectedValue(
      Object.assign(new Error('Not Found'), { name: 'NotFound' }),
    );

    const result = await headObject(mockClient, 'test-bucket', 'missing.jpg');
    expect(result).toBeNull();
  });

  it('returns null when object does not exist (404)', async () => {
    mockClient.send.mockRejectedValue(
      Object.assign(new Error('Not Found'), { $metadata: { httpStatusCode: 404 } }),
    );

    const result = await headObject(mockClient, 'test-bucket', 'missing.jpg');
    expect(result).toBeNull();
  });

  it('throws on other errors', async () => {
    mockClient.send.mockRejectedValue(new Error('Access Denied'));

    await expect(
      headObject(mockClient, 'test-bucket', 'secret.jpg'),
    ).rejects.toThrow('Access Denied');
  });
});
