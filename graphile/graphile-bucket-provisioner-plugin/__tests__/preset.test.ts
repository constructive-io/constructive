/**
 * Tests for the bucket provisioner preset.
 */

jest.mock('@constructive-io/bucket-provisioner', () => ({
  BucketProvisioner: jest.fn().mockImplementation(() => ({
    provision: jest.fn(),
  })),
}));

jest.mock('@pgpmjs/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('grafast', () => ({
  context: jest.fn(() => ({
    get: jest.fn((key: string) => `mock-${key}`),
  })),
  lambda: jest.fn(),
  object: jest.fn((obj: any) => obj),
}));

jest.mock('graphile-utils', () => ({
  extendSchema: jest.fn((factory: any) => {
    const schema = factory();
    return {
      name: 'ExtendSchemaPlugin',
      schema: { hooks: {} },
      _typeDefs: schema.typeDefs,
      _plans: schema.plans,
    };
  }),
  gql: jest.fn((strings: TemplateStringsArray) => strings.join('')),
}));

import { BucketProvisionerPreset } from '../src/preset';

describe('BucketProvisionerPreset', () => {
  it('returns a preset with plugins array', () => {
    const preset = BucketProvisionerPreset({
      connection: {
        provider: 'minio',
        region: 'us-east-1',
        endpoint: 'http://minio:9000',
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
      allowedOrigins: ['https://app.example.com'],
    });

    expect(preset).toBeDefined();
    expect(preset.plugins).toBeDefined();
    expect(preset.plugins).toHaveLength(1);
  });

  it('passes options through to the plugin', () => {
    const preset = BucketProvisionerPreset({
      connection: {
        provider: 's3',
        region: 'us-west-2',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
      },
      allowedOrigins: ['https://app.example.com'],
      bucketNamePrefix: 'myapp',
      versioning: true,
    });

    expect(preset.plugins).toHaveLength(1);
    // The plugin should be the BucketProvisionerPlugin
    const plugin = preset.plugins![0];
    expect(plugin).toBeDefined();
  });

  it('creates a preset with lazy connection getter', () => {
    const preset = BucketProvisionerPreset({
      connection: () => ({
        provider: 'minio',
        region: 'us-east-1',
        endpoint: 'http://minio:9000',
        accessKeyId: 'test',
        secretAccessKey: 'test',
      }),
      allowedOrigins: ['https://app.example.com'],
    });

    expect(preset.plugins).toHaveLength(1);
  });
});
