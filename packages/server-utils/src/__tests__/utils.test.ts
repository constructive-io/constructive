import { isUuid } from '../utils';

describe('isUuid', () => {
  it('accepts a canonical lowercase uuid', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('accepts an uppercase uuid', () => {
    expect(isUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
  });

  it('rejects a non-uuid string', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
  });

  it('rejects a uuid with a trailing character', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000x')).toBe(false);
  });

  it('rejects the empty string', () => {
    expect(isUuid('')).toBe(false);
  });
});
