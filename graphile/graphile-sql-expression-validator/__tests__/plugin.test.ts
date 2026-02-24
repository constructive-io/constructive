// Mock heavy PostGraphile dependencies (side-effect-only imports for types)
jest.mock('graphile-build', () => ({}));
jest.mock('graphile-build-pg', () => ({}));

// Mock grafast's sideEffect to capture the validation callback
const mockSideEffect = jest.fn();
jest.mock('grafast', () => ({
  sideEffect: (...args: unknown[]) => mockSideEffect(...args)
}));

import {
  createSqlExpressionValidatorPlugin,
  SqlExpressionValidatorPreset
} from '../src';
import type { SqlExpressionValidatorOptions } from '../src';

beforeEach(() => {
  mockSideEffect.mockClear();
});

describe('createSqlExpressionValidatorPlugin', () => {
  it('should return a valid GraphileConfig.Plugin object', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    expect(plugin.name).toBe('SqlExpressionValidatorPlugin');
    expect(plugin.version).toBe('2.0.0');
    expect(plugin.description).toBeDefined();
    expect(plugin.schema).toBeDefined();
    expect(plugin.schema!.hooks).toBeDefined();
    expect(
      plugin.schema!.hooks!.GraphQLObjectType_fields_field
    ).toBeDefined();
  });

  it('should accept empty options', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    expect(plugin).toBeDefined();
  });

  it('should accept custom options', () => {
    const options: SqlExpressionValidatorOptions = {
      allowedFunctions: ['now', 'gen_random_uuid'],
      allowedSchemas: ['app_public'],
      maxExpressionLength: 5000
    };
    const plugin = createSqlExpressionValidatorPlugin(options);
    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('SqlExpressionValidatorPlugin');
  });
});

describe('SqlExpressionValidatorPreset', () => {
  it('should return a preset with the plugin', () => {
    const preset = SqlExpressionValidatorPreset();
    expect(preset.plugins).toBeDefined();
    expect(preset.plugins).toHaveLength(1);
    expect(preset.plugins![0].name).toBe('SqlExpressionValidatorPlugin');
  });

  it('should pass options through to the plugin', () => {
    const preset = SqlExpressionValidatorPreset({
      allowedSchemas: ['my_schema']
    });
    expect(preset.plugins).toHaveLength(1);
    expect(preset.plugins![0].name).toBe('SqlExpressionValidatorPlugin');
  });
});

/**
 * Helper to build mock context/build for the per-field hook.
 * The hook signature: (field, build, context) where context.scope has pgCodec.
 */
function makeMockContext(opts: {
  isRootMutation?: boolean;
  pgCodec?: Record<string, unknown> | null;
}) {
  return {
    scope: {
      isRootMutation: opts.isRootMutation ?? false,
      pgCodec: opts.pgCodec ?? null
    }
  };
}

function makeMockBuild() {
  return {
    inflection: {
      attribute: ({ attributeName }: { attributeName: string }) =>
        attributeName
    }
  };
}

describe('GraphQLObjectType_fields_field hook behavior', () => {
  it('should skip non-mutation fields', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const field = { type: 'String', plan: jest.fn() };
    const build = makeMockBuild();
    const context = makeMockContext({ isRootMutation: false });

    const result = hook(field, build, context);
    expect(result).toBe(field); // Should return unchanged
  });

  it('should skip when pgCodec is missing', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const field = { type: 'String', plan: jest.fn() };
    const build = makeMockBuild();
    const context = makeMockContext({
      isRootMutation: true,
      pgCodec: null
    });

    const result = hook(field, build, context);
    expect(result).toBe(field);
  });

  it('should skip when pgCodec has no attributes', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const field = { type: 'String', plan: jest.fn() };
    const build = makeMockBuild();
    const context = makeMockContext({
      isRootMutation: true,
      pgCodec: { name: 'widget' } // no attributes
    });

    const result = hook(field, build, context);
    expect(result).toBe(field);
  });

  it('should skip when no @sqlExpression columns exist on the codec', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const field = {
      type: 'CreateWidgetPayload',
      plan: jest.fn()
    };
    const build = makeMockBuild();
    const context = makeMockContext({
      isRootMutation: true,
      pgCodec: {
        attributes: {
          id: { extensions: { tags: {} } },
          name: { extensions: { tags: {} } }
        }
      }
    });

    const result = hook(field, build, context);
    expect(result).toBe(field); // Unchanged — no @sqlExpression
  });

  it('should wrap plan when @sqlExpression columns exist', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const originalPlan = jest.fn().mockReturnValue('originalStep');
    const field = {
      type: 'CreateWidgetPayload',
      plan: originalPlan
    };
    const build = makeMockBuild();
    const context = makeMockContext({
      isRootMutation: true,
      pgCodec: {
        attributes: {
          id: { extensions: { tags: {} } },
          formula: {
            extensions: { tags: { sqlExpression: true } }
          }
        }
      }
    });

    const result = hook(field, build, context);
    // The plan function should be wrapped (different from original)
    expect(result.plan).not.toBe(originalPlan);
    expect(typeof result.plan).toBe('function');
    // Should NOT have a resolve property (v5 plan-only)
    expect(result.resolve).toBeUndefined();
  });

  it('should call sideEffect and original plan when wrapped plan executes', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const originalPlan = jest.fn().mockReturnValue('originalStep');
    const field = {
      type: 'CreateWidgetPayload',
      plan: originalPlan
    };
    const build = makeMockBuild();
    const context = makeMockContext({
      isRootMutation: true,
      pgCodec: {
        attributes: {
          formula: {
            extensions: { tags: { sqlExpression: true } }
          }
        }
      }
    });

    const result = hook(field, build, context);

    // Execute the wrapped plan
    const mockFieldArgs = {
      get: jest.fn().mockReturnValue('inputStep')
    };
    const $parent = 'parentStep';
    const returnValue = result.plan($parent, mockFieldArgs);

    // sideEffect should have been called with the input step
    expect(mockSideEffect).toHaveBeenCalledTimes(1);
    expect(mockSideEffect).toHaveBeenCalledWith(
      'inputStep',
      expect.any(Function)
    );

    // fieldArgs.get('input') should have been called
    expect(mockFieldArgs.get).toHaveBeenCalledWith('input');

    // Original plan should have been called
    expect(originalPlan).toHaveBeenCalledWith($parent, mockFieldArgs);
    expect(returnValue).toBe('originalStep');
  });

  it('should validate text input in sideEffect callback', async () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const field = {
      type: 'CreateWidgetPayload',
      plan: jest.fn().mockReturnValue('step')
    };
    const build = makeMockBuild();
    const context = makeMockContext({
      isRootMutation: true,
      pgCodec: {
        attributes: {
          formula: {
            extensions: { tags: { sqlExpression: true } }
          }
        }
      }
    });

    const result = hook(field, build, context);

    // Execute wrapped plan to trigger sideEffect registration
    const mockFieldArgs = {
      get: jest.fn().mockReturnValue('inputStep')
    };
    result.plan('parent', mockFieldArgs);

    // Extract the sideEffect callback
    const validationCallback = mockSideEffect.mock.calls[0][1];

    // Valid expression should not throw
    await expect(
      validationCallback({ formula: 'now()' })
    ).resolves.not.toThrow();

    // Invalid expression (column reference) should throw
    await expect(
      validationCallback({ formula: 'username' })
    ).rejects.toThrow('Invalid SQL expression in formula');
  });

  it('should validate deeply nested text input in sideEffect callback', async () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const field = {
      type: 'CreateWidgetPayload',
      plan: jest.fn().mockReturnValue('step')
    };
    const build = makeMockBuild();
    const context = makeMockContext({
      isRootMutation: true,
      pgCodec: {
        attributes: {
          formula: {
            extensions: { tags: { sqlExpression: true } }
          }
        }
      }
    });

    const result = hook(field, build, context);
    const mockFieldArgs = {
      get: jest.fn().mockReturnValue('inputStep')
    };
    result.plan('parent', mockFieldArgs);

    const validationCallback = mockSideEffect.mock.calls[0][1];

    await expect(
      validationCallback({ level1: { level2: { formula: 'username' } } })
    ).rejects.toThrow('Invalid SQL expression in formula');
  });

  it('should skip null/undefined values in sideEffect callback', async () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const field = {
      type: 'CreateWidgetPayload',
      plan: jest.fn().mockReturnValue('step')
    };
    const build = makeMockBuild();
    const context = makeMockContext({
      isRootMutation: true,
      pgCodec: {
        attributes: {
          formula: {
            extensions: { tags: { sqlExpression: true } }
          }
        }
      }
    });

    const result = hook(field, build, context);
    const mockFieldArgs = {
      get: jest.fn().mockReturnValue('inputStep')
    };
    result.plan('parent', mockFieldArgs);

    const validationCallback = mockSideEffect.mock.calls[0][1];

    // null value should be skipped without error
    await expect(
      validationCallback({ formula: null })
    ).resolves.not.toThrow();

    // undefined value should be skipped without error
    await expect(
      validationCallback({ formula: undefined })
    ).resolves.not.toThrow();

    // Missing input should be skipped without error
    await expect(
      validationCallback(null)
    ).resolves.not.toThrow();
  });

  it('should skip when field has no plan', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const field = {
      type: 'CreateWidgetPayload'
      // no plan
    };
    const build = makeMockBuild();
    const context = makeMockContext({
      isRootMutation: true,
      pgCodec: {
        attributes: {
          formula: {
            extensions: { tags: { sqlExpression: true } }
          }
        }
      }
    });

    const result = hook(field, build, context);
    expect(result).toBe(field); // Unchanged — no plan to wrap
  });

  it('should throw error when @rawSqlAstField points to missing column', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const field = {
      type: 'CreateWidgetPayload',
      plan: jest.fn()
    };
    const build = makeMockBuild();
    const context = makeMockContext({
      isRootMutation: true,
      pgCodec: {
        attributes: {
          formula: {
            extensions: {
              tags: {
                sqlExpression: true,
                rawSqlAstField: 'nonexistent_column'
              }
            }
          }
        },
        extensions: {
          pg: { schemaName: 'app_public', name: 'widgets' }
        }
      }
    });

    expect(() => hook(field, build, context)).toThrow(
      '@rawSqlAstField points to missing column "nonexistent_column"'
    );
  });

  it('should handle AST companion column detection', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!
      .GraphQLObjectType_fields_field as Function;

    const originalPlan = jest.fn().mockReturnValue('step');
    const field = {
      type: 'CreateWidgetPayload',
      plan: originalPlan
    };
    const build = makeMockBuild();
    const context = makeMockContext({
      isRootMutation: true,
      pgCodec: {
        attributes: {
          formula: {
            extensions: { tags: { sqlExpression: true } }
          },
          formula_ast: {
            extensions: { tags: {} }
          }
        }
      }
    });

    const result = hook(field, build, context);
    // Should wrap because @sqlExpression exists
    expect(result.plan).not.toBe(originalPlan);
  });
});

describe('exports', () => {
  it('should export all expected symbols from index', async () => {
    const mod = await import('../src');
    expect(mod.parseAndValidateSqlExpression).toBeDefined();
    expect(mod.validateAst).toBeDefined();
    expect(mod.DEFAULT_ALLOWED_FUNCTIONS).toBeDefined();
    expect(mod.createSqlExpressionValidatorPlugin).toBeDefined();
    expect(mod.SqlExpressionValidatorPreset).toBeDefined();
  });
});
