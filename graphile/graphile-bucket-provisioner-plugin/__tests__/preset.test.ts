/**
 * Tests for the bucket reconciliation preset.
 */

jest.mock('grafast', () => ({
  context: jest.fn(),
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
  it('returns a preset with the reconciliation plugin', () => {
    const preset = BucketProvisionerPreset();

    expect(preset.plugins).toHaveLength(1);
    expect(preset.plugins![0]).toBeDefined();
  });
});
