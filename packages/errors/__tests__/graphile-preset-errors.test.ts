import { classify, errors } from '../src';

describe('Graphile preset configuration errors', () => {
  it('classifies caller trust failures as internal startup errors', () => {
    const error = errors.GRAPHILE_CALLER_PRESET_NOT_TRUSTED();

    expect(error).toMatchObject({
      code: 'GRAPHILE_CALLER_PRESET_NOT_TRUSTED',
      errorClass: 'internal',
      http: 500,
    });
    expect(classify(error.code)).toBe('internal');
  });

  it('retains safe context for malformed caller presets', () => {
    const error = errors.GRAPHILE_CALLER_PRESET_INVALID({
      presetPath: 'graphile.extends[0]',
      reason: 'extends must not contain a cycle',
    });

    expect(error.code).toBe('GRAPHILE_CALLER_PRESET_INVALID');
    expect(error.context).toEqual({
      presetPath: 'graphile.extends[0]',
      reason: 'extends must not contain a cycle',
    });
    expect(error.message).toContain('graphile.extends[0]');
  });

  it('identifies the protected setting without including its value', () => {
    const error = errors.GRAPHILE_PROTECTED_PRESET_OVERRIDE({
      presetPath: 'graphile.preset',
      protectedSetting: 'grafast.context',
    });

    expect(error.code).toBe('GRAPHILE_PROTECTED_PRESET_OVERRIDE');
    expect(error.context).toEqual({
      presetPath: 'graphile.preset',
      protectedSetting: 'grafast.context',
    });
    expect(error.message).not.toContain('pgSettings');
  });
});
