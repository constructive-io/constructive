import { isComputedScalarAttributeResource } from '../pg-resources';

const tableCodec = { attributes: { id: {} } };
const scalarCodec = {};

function resource(overrides: any): any {
  return {
    isUnique: true,
    codec: scalarCodec,
    parameters: [{ codec: tableCodec }],
    ...overrides
  };
}

describe('isComputedScalarAttributeResource', () => {
  it('accepts a unique scalar function taking a table row', () => {
    expect(isComputedScalarAttributeResource(resource({}))).toBe(true);
  });

  it('rejects a resource without parameters', () => {
    expect(isComputedScalarAttributeResource(resource({ parameters: [] }))).toBe(
      false
    );
  });

  it('rejects a table-returning resource (codec has attributes)', () => {
    expect(
      isComputedScalarAttributeResource(resource({ codec: tableCodec }))
    ).toBe(false);
  });

  it('rejects a non-unique resource', () => {
    expect(
      isComputedScalarAttributeResource(resource({ isUnique: false }))
    ).toBe(false);
  });

  it('rejects when the first parameter is not a table row', () => {
    expect(
      isComputedScalarAttributeResource(
        resource({ parameters: [{ codec: scalarCodec }] })
      )
    ).toBe(false);
  });
});
