/**
 * Tests for BucketProvisioner — the core orchestrator.
 *
 * All S3 calls are mocked via aws-sdk-client-mock style:
 * we mock the S3Client.send method and assert the right commands
 * are sent with the right parameters.
 */

import { BucketProvisioner } from '../src/provisioner';
import type { BucketProvisionerOptions } from '../src/provisioner';
import { ProvisionerError } from '../src/types';

// We mock the S3Client.send at the instance level
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  };
});

const defaultOptions: BucketProvisionerOptions = {
  connection: {
    provider: 'minio',
    region: 'us-east-1',
    endpoint: 'http://minio:9000',
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  allowedOrigins: ['https://app.example.com'],
};

beforeEach(() => {
  mockSend.mockReset();
  // Default: all sends succeed
  mockSend.mockResolvedValue({});
});

describe('BucketProvisioner constructor', () => {
  it('creates provisioner with valid options', () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    expect(provisioner).toBeInstanceOf(BucketProvisioner);
  });

  it('throws on empty allowedOrigins', () => {
    expect(
      () => new BucketProvisioner({ ...defaultOptions, allowedOrigins: [] }),
    ).toThrow(ProvisionerError);
    expect(
      () => new BucketProvisioner({ ...defaultOptions, allowedOrigins: [] }),
    ).toThrow('allowedOrigins must contain at least one origin');
  });

  it('exposes S3Client via getClient()', () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    const client = provisioner.getClient();
    expect(client).toBeDefined();
    expect(typeof client.send).toBe('function');
  });
});

describe('BucketProvisioner.provision — private bucket', () => {
  it('provisions a private bucket with correct steps', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    const result = await provisioner.provision({
      bucketName: 'test-private',
      accessType: 'private',
    });

    expect(result.bucketName).toBe('test-private');
    expect(result.accessType).toBe('private');
    expect(result.provider).toBe('minio');
    expect(result.region).toBe('us-east-1');
    expect(result.endpoint).toBe('http://minio:9000');
    expect(result.blockPublicAccess).toBe(true);
    expect(result.versioning).toBe(false);
    expect(result.publicUrlPrefix).toBeNull();
    expect(result.lifecycleRules).toHaveLength(0);
    expect(result.corsRules).toHaveLength(1);

    // CORS for private bucket: PUT + HEAD only (no GET)
    expect(result.corsRules[0].allowedMethods).toContain('PUT');
    expect(result.corsRules[0].allowedMethods).toContain('HEAD');
    expect(result.corsRules[0].allowedMethods).not.toContain('GET');
  });

  it('calls S3 commands in correct order', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.provision({
      bucketName: 'test-private',
      accessType: 'private',
    });

    // Should have called: CreateBucket, PutPublicAccessBlock, DeleteBucketPolicy, PutBucketCors
    expect(mockSend).toHaveBeenCalledTimes(4);

    const commandNames = mockSend.mock.calls.map(
      (call: any[]) => call[0].constructor.name,
    );
    expect(commandNames[0]).toBe('CreateBucketCommand');
    expect(commandNames[1]).toBe('PutPublicAccessBlockCommand');
    expect(commandNames[2]).toBe('DeleteBucketPolicyCommand');
    expect(commandNames[3]).toBe('PutBucketCorsCommand');
  });

  it('deletes leftover bucket policy for private buckets', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.provision({
      bucketName: 'test-private',
      accessType: 'private',
    });

    const deletePolicyCall = mockSend.mock.calls.find(
      (call: any[]) => call[0].constructor.name === 'DeleteBucketPolicyCommand',
    );
    expect(deletePolicyCall).toBeDefined();
  });
});

describe('BucketProvisioner.provision — public bucket', () => {
  it('provisions a public bucket with correct steps', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    const result = await provisioner.provision({
      bucketName: 'test-public',
      accessType: 'public',
      publicUrlPrefix: 'https://cdn.example.com',
    });

    expect(result.bucketName).toBe('test-public');
    expect(result.accessType).toBe('public');
    expect(result.blockPublicAccess).toBe(false);
    expect(result.publicUrlPrefix).toBe('https://cdn.example.com');
    expect(result.corsRules).toHaveLength(1);

    // CORS for public bucket: PUT + GET + HEAD
    expect(result.corsRules[0].allowedMethods).toContain('PUT');
    expect(result.corsRules[0].allowedMethods).toContain('GET');
    expect(result.corsRules[0].allowedMethods).toContain('HEAD');
  });

  it('applies public-read bucket policy', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.provision({
      bucketName: 'test-public',
      accessType: 'public',
    });

    const putPolicyCall = mockSend.mock.calls.find(
      (call: any[]) => call[0].constructor.name === 'PutBucketPolicyCommand',
    );
    expect(putPolicyCall).toBeDefined();

    const policyInput = putPolicyCall![0].input;
    const policyDoc = JSON.parse(policyInput.Policy);
    expect(policyDoc.Statement[0].Effect).toBe('Allow');
    expect(policyDoc.Statement[0].Principal).toBe('*');
    expect(policyDoc.Statement[0].Action).toBe('s3:GetObject');
  });

  it('returns null publicUrlPrefix when not provided', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    const result = await provisioner.provision({
      bucketName: 'test-public',
      accessType: 'public',
    });
    expect(result.publicUrlPrefix).toBeNull();
  });
});

describe('BucketProvisioner.provision — temp bucket', () => {
  it('provisions a temp bucket with lifecycle rules', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    const result = await provisioner.provision({
      bucketName: 'test-temp',
      accessType: 'temp',
    });

    expect(result.bucketName).toBe('test-temp');
    expect(result.accessType).toBe('temp');
    expect(result.blockPublicAccess).toBe(true);
    expect(result.publicUrlPrefix).toBeNull();
    expect(result.lifecycleRules).toHaveLength(1);
    expect(result.lifecycleRules[0].id).toBe('temp-cleanup');
    expect(result.lifecycleRules[0].expirationDays).toBe(1);
  });

  it('calls PutBucketLifecycleConfiguration for temp buckets', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.provision({
      bucketName: 'test-temp',
      accessType: 'temp',
    });

    const lifecycleCall = mockSend.mock.calls.find(
      (call: any[]) => call[0].constructor.name === 'PutBucketLifecycleConfigurationCommand',
    );
    expect(lifecycleCall).toBeDefined();
  });

  it('uses upload CORS (PUT + GET + HEAD) for temp buckets', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    const result = await provisioner.provision({
      bucketName: 'test-temp',
      accessType: 'temp',
    });

    // Temp uses buildUploadCorsRules (not private)
    expect(result.corsRules[0].allowedMethods).toContain('GET');
  });
});

describe('BucketProvisioner.provision — versioning', () => {
  it('enables versioning when requested', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    const result = await provisioner.provision({
      bucketName: 'test-versioned',
      accessType: 'private',
      versioning: true,
    });

    expect(result.versioning).toBe(true);

    const versioningCall = mockSend.mock.calls.find(
      (call: any[]) => call[0].constructor.name === 'PutBucketVersioningCommand',
    );
    expect(versioningCall).toBeDefined();
  });

  it('skips versioning when not requested', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    const result = await provisioner.provision({
      bucketName: 'test-no-version',
      accessType: 'private',
    });

    expect(result.versioning).toBe(false);

    const versioningCall = mockSend.mock.calls.find(
      (call: any[]) => call[0].constructor.name === 'PutBucketVersioningCommand',
    );
    expect(versioningCall).toBeUndefined();
  });
});

describe('BucketProvisioner.provision — region handling', () => {
  it('uses connection region by default', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    const result = await provisioner.provision({
      bucketName: 'test-region',
      accessType: 'private',
    });

    expect(result.region).toBe('us-east-1');
  });

  it('overrides region with per-bucket option', async () => {
    const provisioner = new BucketProvisioner(defaultOptions);
    const result = await provisioner.provision({
      bucketName: 'test-region',
      accessType: 'private',
      region: 'eu-west-1',
    });

    expect(result.region).toBe('eu-west-1');
  });
});

describe('BucketProvisioner.createBucket — error handling', () => {
  it('tolerates BucketAlreadyOwnedByYou', async () => {
    const err = new Error('Bucket already owned');
    (err as any).name = 'BucketAlreadyOwnedByYou';
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    // Should not throw
    await provisioner.createBucket('existing-bucket');
  });

  it('tolerates BucketAlreadyExists', async () => {
    const err = new Error('Bucket already exists');
    (err as any).name = 'BucketAlreadyExists';
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.createBucket('existing-bucket');
  });

  it('wraps unknown errors in ProvisionerError', async () => {
    mockSend.mockRejectedValue(new Error('Network failure'));

    const provisioner = new BucketProvisioner(defaultOptions);
    await expect(provisioner.createBucket('fail-bucket')).rejects.toThrow(
      ProvisionerError,
    );

    await expect(provisioner.createBucket('fail-bucket')).rejects.toThrow(
      "Failed to create bucket 'fail-bucket'",
    );

    // Reset to default
    mockSend.mockReset();
    mockSend.mockResolvedValue({});
  });
});

describe('BucketProvisioner.bucketExists', () => {
  it('returns true when bucket exists', async () => {
    mockSend.mockResolvedValueOnce({});
    const provisioner = new BucketProvisioner(defaultOptions);
    const exists = await provisioner.bucketExists('existing');
    expect(exists).toBe(true);
  });

  it('returns false when bucket does not exist (404)', async () => {
    const err = new Error('Not Found');
    (err as any).$metadata = { httpStatusCode: 404 };
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    const exists = await provisioner.bucketExists('missing');
    expect(exists).toBe(false);
  });

  it('returns false when NotFound error name', async () => {
    const err = new Error('Not Found');
    (err as any).name = 'NotFound';
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    const exists = await provisioner.bucketExists('missing');
    expect(exists).toBe(false);
  });

  it('throws ACCESS_DENIED on 403', async () => {
    const err = new Error('Forbidden');
    (err as any).$metadata = { httpStatusCode: 403 };
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    await expect(provisioner.bucketExists('forbidden')).rejects.toThrow(
      ProvisionerError,
    );
  });

  it('throws PROVIDER_ERROR on other errors', async () => {
    mockSend.mockRejectedValueOnce(new Error('Unknown error'));

    const provisioner = new BucketProvisioner(defaultOptions);
    await expect(provisioner.bucketExists('error')).rejects.toThrow(
      ProvisionerError,
    );
  });
});

describe('BucketProvisioner.deleteBucketPolicy', () => {
  it('tolerates NoSuchBucketPolicy', async () => {
    const err = new Error('No such policy');
    (err as any).name = 'NoSuchBucketPolicy';
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.deleteBucketPolicy('no-policy-bucket');
  });

  it('tolerates 404 status code', async () => {
    const err = new Error('Not found');
    (err as any).$metadata = { httpStatusCode: 404 };
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.deleteBucketPolicy('no-policy-bucket');
  });
});

describe('BucketProvisioner.inspect', () => {
  it('inspects an existing private bucket', async () => {
    // HeadBucket succeeds
    mockSend.mockResolvedValueOnce({});

    // GetPublicAccessBlock
    mockSend.mockResolvedValueOnce({
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    });

    // GetBucketPolicy — no policy
    const noPolicyErr = new Error('No policy');
    (noPolicyErr as any).name = 'NoSuchBucketPolicy';
    mockSend.mockRejectedValueOnce(noPolicyErr);

    // GetBucketCors
    mockSend.mockResolvedValueOnce({
      CORSRules: [
        {
          AllowedOrigins: ['https://app.example.com'],
          AllowedMethods: ['PUT', 'HEAD'],
          AllowedHeaders: ['Content-Type'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    });

    // GetBucketVersioning
    mockSend.mockResolvedValueOnce({ Status: 'Enabled' });

    // GetBucketLifecycle — no rules
    const noLifecycleErr = new Error('No lifecycle');
    (noLifecycleErr as any).name = 'NoSuchLifecycleConfiguration';
    mockSend.mockRejectedValueOnce(noLifecycleErr);

    const provisioner = new BucketProvisioner(defaultOptions);
    const result = await provisioner.inspect('test-bucket', 'private');

    expect(result.bucketName).toBe('test-bucket');
    expect(result.accessType).toBe('private');
    expect(result.blockPublicAccess).toBe(true);
    expect(result.versioning).toBe(true);
    expect(result.corsRules).toHaveLength(1);
    expect(result.corsRules[0].allowedMethods).toContain('PUT');
    expect(result.lifecycleRules).toHaveLength(0);
  });

  it('throws BUCKET_NOT_FOUND for non-existent bucket', async () => {
    const makeNotFoundErr = () => {
      const e = new Error('Not Found');
      (e as any).name = 'NotFound';
      return e;
    };
    mockSend.mockRejectedValueOnce(makeNotFoundErr());

    const provisioner = new BucketProvisioner(defaultOptions);
    await expect(
      provisioner.inspect('missing-bucket', 'private'),
    ).rejects.toThrow(ProvisionerError);

    mockSend.mockRejectedValueOnce(makeNotFoundErr());
    await expect(
      provisioner.inspect('missing-bucket', 'private'),
    ).rejects.toThrow("Bucket 'missing-bucket' does not exist");
  });
});

describe('BucketProvisioner — S3 provider', () => {
  it('works with AWS S3 config (no endpoint)', () => {
    const provisioner = new BucketProvisioner({
      connection: {
        provider: 's3',
        region: 'us-east-1',
        accessKeyId: 'AKIATEST',
        secretAccessKey: 'secrettest',
      },
      allowedOrigins: ['https://app.example.com'],
    });
    expect(provisioner).toBeDefined();
  });

  it('returns null endpoint for S3', async () => {
    const provisioner = new BucketProvisioner({
      connection: {
        provider: 's3',
        region: 'us-west-2',
        accessKeyId: 'AKIATEST',
        secretAccessKey: 'secrettest',
      },
      allowedOrigins: ['https://app.example.com'],
    });

    const result = await provisioner.provision({
      bucketName: 'aws-bucket',
      accessType: 'private',
    });

    expect(result.endpoint).toBeNull();
    expect(result.provider).toBe('s3');
    expect(result.region).toBe('us-west-2');
  });
});

describe('BucketProvisioner — graceful degradation (error-code matching)', () => {
  it('setBucketPolicy tolerates XmlParseException', async () => {
    const err = new Error('not well-formed');
    (err as any).Code = 'XmlParseException';
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    // Should not throw — graceful degradation
    await provisioner.setBucketPolicy('test-bucket', {
      Version: '2012-10-17',
      Statement: [],
    });
  });

  it('setBucketPolicy tolerates NotImplemented', async () => {
    const err = new Error('not implemented');
    (err as any).name = 'NotImplemented';
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.setBucketPolicy('test-bucket', {
      Version: '2012-10-17',
      Statement: [],
    });
  });

  it('setBucketPolicy throws on genuine errors', async () => {
    mockSend.mockRejectedValueOnce(new Error('Access denied'));

    const provisioner = new BucketProvisioner(defaultOptions);
    await expect(
      provisioner.setBucketPolicy('test-bucket', {
        Version: '2012-10-17',
        Statement: [],
      }),
    ).rejects.toThrow(ProvisionerError);
  });

  it('enableVersioning tolerates XmlParseException', async () => {
    const err = new Error('not well-formed');
    (err as any).Code = 'XmlParseException';
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.enableVersioning('test-bucket');
  });

  it('enableVersioning tolerates NotImplemented', async () => {
    const err = new Error('not implemented');
    (err as any).name = 'NotImplemented';
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.enableVersioning('test-bucket');
  });

  it('enableVersioning tolerates VersioningConfiguration message', async () => {
    const err = new Error('VersioningConfiguration is not supported');
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.enableVersioning('test-bucket');
  });

  it('enableVersioning throws on genuine errors', async () => {
    mockSend.mockRejectedValueOnce(new Error('Network failure'));

    const provisioner = new BucketProvisioner(defaultOptions);
    await expect(
      provisioner.enableVersioning('test-bucket'),
    ).rejects.toThrow(ProvisionerError);
  });

  it('setLifecycleRules tolerates XmlParseException', async () => {
    const err = new Error('not well-formed');
    (err as any).Code = 'XmlParseException';
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.setLifecycleRules('test-bucket', [
      { id: 'test', prefix: '', expirationDays: 1, enabled: true },
    ]);
  });

  it('setLifecycleRules tolerates NotImplemented', async () => {
    const err = new Error('not implemented');
    (err as any).name = 'NotImplemented';
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.setLifecycleRules('test-bucket', [
      { id: 'test', prefix: '', expirationDays: 1, enabled: true },
    ]);
  });

  it('setLifecycleRules tolerates LifecycleConfiguration message', async () => {
    const err = new Error('LifecycleConfiguration is not supported');
    mockSend.mockRejectedValueOnce(err);

    const provisioner = new BucketProvisioner(defaultOptions);
    await provisioner.setLifecycleRules('test-bucket', [
      { id: 'test', prefix: '', expirationDays: 1, enabled: true },
    ]);
  });

  it('setLifecycleRules throws on genuine errors', async () => {
    mockSend.mockRejectedValueOnce(new Error('Network failure'));

    const provisioner = new BucketProvisioner(defaultOptions);
    await expect(
      provisioner.setLifecycleRules('test-bucket', [
        { id: 'test', prefix: '', expirationDays: 1, enabled: true },
      ]),
    ).rejects.toThrow(ProvisionerError);
  });
});

describe('BucketProvisioner — error propagation', () => {
  it('wraps PutPublicAccessBlock failure as POLICY_FAILED', async () => {
    // CreateBucket succeeds
    mockSend.mockResolvedValueOnce({});
    // PutPublicAccessBlock fails
    mockSend.mockRejectedValueOnce(new Error('Access denied'));

    const provisioner = new BucketProvisioner(defaultOptions);
    try {
      await provisioner.provision({
        bucketName: 'fail-bucket',
        accessType: 'private',
      });
      fail('Expected ProvisionerError');
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisionerError);
      expect((err as ProvisionerError).code).toBe('POLICY_FAILED');
    }
  });

  it('wraps PutBucketCors failure as CORS_FAILED', async () => {
    // CreateBucket, PutPublicAccessBlock, DeleteBucketPolicy succeed
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});
    // PutBucketCors fails
    mockSend.mockRejectedValueOnce(new Error('CORS error'));

    const provisioner = new BucketProvisioner(defaultOptions);
    try {
      await provisioner.provision({
        bucketName: 'cors-fail',
        accessType: 'private',
      });
      fail('Expected ProvisionerError');
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisionerError);
      expect((err as ProvisionerError).code).toBe('CORS_FAILED');
    }
  });

  it('wraps PutBucketVersioning failure as VERSIONING_FAILED', async () => {
    // CreateBucket, PutPublicAccessBlock, DeleteBucketPolicy, PutBucketCors succeed
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});
    // PutBucketVersioning fails
    mockSend.mockRejectedValueOnce(new Error('Versioning error'));

    const provisioner = new BucketProvisioner(defaultOptions);
    try {
      await provisioner.provision({
        bucketName: 'version-fail',
        accessType: 'private',
        versioning: true,
      });
      fail('Expected ProvisionerError');
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisionerError);
      expect((err as ProvisionerError).code).toBe('VERSIONING_FAILED');
    }
  });

  it('wraps PutBucketLifecycleConfiguration failure as LIFECYCLE_FAILED', async () => {
    // CreateBucket, PutPublicAccessBlock, DeleteBucketPolicy, PutBucketCors succeed
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});
    // PutBucketLifecycleConfiguration fails
    mockSend.mockRejectedValueOnce(new Error('Lifecycle error'));

    const provisioner = new BucketProvisioner(defaultOptions);
    try {
      await provisioner.provision({
        bucketName: 'lifecycle-fail',
        accessType: 'temp',
      });
      fail('Expected ProvisionerError');
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisionerError);
      expect((err as ProvisionerError).code).toBe('LIFECYCLE_FAILED');
    }
  });
});
