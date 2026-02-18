import {
  createSqlExpressionValidatorPlugin,
  SqlExpressionValidatorPlugin,
  SqlExpressionValidatorPreset
} from '../src';
import type { SqlExpressionValidatorOptions } from '../src/types';

describe('createSqlExpressionValidatorPlugin', () => {
  it('should return a valid GraphileConfig.Plugin object', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    expect(plugin.name).toBe('SqlExpressionValidatorPlugin');
    expect(plugin.version).toBe('2.0.0');
    expect(plugin.description).toBeDefined();
    expect(plugin.schema).toBeDefined();
    expect(plugin.schema!.hooks).toBeDefined();
    expect(plugin.schema!.hooks!.GraphQLObjectType_fields).toBeDefined();
  });

  it('should accept empty options', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    expect(plugin).toBeDefined();
  });

  it('should accept custom options', () => {
    const options: SqlExpressionValidatorOptions = {
      allowedFunctions: ['now', 'gen_random_uuid'],
      allowedSchemas: ['app_public'],
      maxExpressionLength: 5000,
      allowOwnedSchemas: true,
      getAdditionalAllowedSchemas: async () => ['extra_schema']
    };
    const plugin = createSqlExpressionValidatorPlugin(options);
    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('SqlExpressionValidatorPlugin');
  });
});

describe('SqlExpressionValidatorPlugin', () => {
  it('should be the same as createSqlExpressionValidatorPlugin', () => {
    expect(SqlExpressionValidatorPlugin).toBe(
      createSqlExpressionValidatorPlugin
    );
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
      allowedSchemas: ['my_schema'],
      allowOwnedSchemas: true
    });
    expect(preset.plugins).toHaveLength(1);
    // The plugin is created with the options -- we can't inspect them directly
    // but we can verify the plugin was created successfully
    expect(preset.plugins![0].name).toBe('SqlExpressionValidatorPlugin');
  });
});

describe('plugin hook behavior', () => {
  it('should skip non-Mutation types', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!.GraphQLObjectType_fields as any;

    const fields = { someField: { type: 'String' } };
    const build = { input: { pgRegistry: { pgResources: {} } } };
    const context = { Self: { name: 'Query' } };

    const result = hook(fields, build, context);
    expect(result).toBe(fields); // Should return unchanged
  });

  it('should return fields unchanged when no pgRegistry exists', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!.GraphQLObjectType_fields as any;

    const fields = { someField: { type: 'String' } };
    const build = { input: {} };
    const context = { Self: { name: 'Mutation' } };

    const result = hook(fields, build, context);
    expect(result).toBe(fields);
  });

  it('should pass through fields when no @sqlExpression columns exist', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!.GraphQLObjectType_fields as any;

    const fields = {
      createUser: {
        type: 'CreateUserPayload',
        resolve: () => ({})
      }
    };
    const build = {
      input: {
        pgRegistry: {
          pgResources: {
            users: {
              codec: {
                attributes: {
                  id: { extensions: { tags: {} } },
                  name: { extensions: { tags: {} } }
                }
              }
            }
          }
        }
      },
      inflection: {
        attribute: ({ attributeName }: { attributeName: string }) =>
          attributeName
      }
    };
    const context = { Self: { name: 'Mutation' } };

    const result = hook(fields, build, context);
    // Fields should be returned without wrapping since no @sqlExpression columns
    expect(result.createUser.resolve).toBe(fields.createUser.resolve);
  });

  it('should wrap resolve for mutation fields when @sqlExpression columns exist', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!.GraphQLObjectType_fields as any;

    const originalResolve = jest.fn().mockResolvedValue({ id: 1 });
    const fields = {
      createWidget: {
        type: 'CreateWidgetPayload',
        resolve: originalResolve
      }
    };
    const build = {
      input: {
        pgRegistry: {
          pgResources: {
            widgets: {
              codec: {
                attributes: {
                  id: { extensions: { tags: {} } },
                  formula: {
                    extensions: { tags: { sqlExpression: true } }
                  }
                }
              }
            }
          }
        }
      },
      inflection: {
        attribute: ({ attributeName }: { attributeName: string }) =>
          attributeName
      }
    };
    const context = { Self: { name: 'Mutation' } };

    const result = hook(fields, build, context);
    // The resolve function should be wrapped (different from original)
    expect(result.createWidget.resolve).not.toBe(originalResolve);
    expect(typeof result.createWidget.resolve).toBe('function');
  });

  it('should validate text input and rewrite to canonical form', async () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!.GraphQLObjectType_fields as any;

    const originalResolve = jest
      .fn()
      .mockResolvedValue({ id: 1 });
    const fields = {
      createWidget: {
        type: 'CreateWidgetPayload',
        resolve: originalResolve
      }
    };
    const build = {
      input: {
        pgRegistry: {
          pgResources: {
            widgets: {
              codec: {
                attributes: {
                  id: { extensions: { tags: {} } },
                  formula: {
                    extensions: { tags: { sqlExpression: true } }
                  }
                }
              }
            }
          }
        }
      },
      inflection: {
        attribute: ({ attributeName }: { attributeName: string }) =>
          attributeName
      }
    };
    const context = { Self: { name: 'Mutation' } };

    const result = hook(fields, build, context);
    const wrappedResolve = result.createWidget.resolve;

    // Call the wrapped resolve with a valid expression
    const args = { input: { formula: 'now()' } };
    await wrappedResolve({}, args, {}, {});

    expect(originalResolve).toHaveBeenCalledTimes(1);
    // The formula value should have been replaced with canonical form
    expect(args.input.formula).toBeDefined();
  });

  it('should throw on invalid SQL expression', async () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!.GraphQLObjectType_fields as any;

    const originalResolve = jest.fn();
    const fields = {
      createWidget: {
        type: 'CreateWidgetPayload',
        resolve: originalResolve
      }
    };
    const build = {
      input: {
        pgRegistry: {
          pgResources: {
            widgets: {
              codec: {
                attributes: {
                  id: { extensions: { tags: {} } },
                  formula: {
                    extensions: { tags: { sqlExpression: true } }
                  }
                }
              }
            }
          }
        }
      },
      inflection: {
        attribute: ({ attributeName }: { attributeName: string }) =>
          attributeName
      }
    };
    const context = { Self: { name: 'Mutation' } };

    const result = hook(fields, build, context);
    const wrappedResolve = result.createWidget.resolve;

    // Call with a column reference (forbidden)
    const args = { input: { formula: 'username' } };
    await expect(
      wrappedResolve({}, args, {}, {})
    ).rejects.toThrow('Invalid SQL expression in formula');

    // Original resolve should NOT have been called
    expect(originalResolve).not.toHaveBeenCalled();
  });

  it('should throw error when @rawSqlAstField points to missing column', () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!.GraphQLObjectType_fields as any;

    const fields = {
      createWidget: {
        type: 'CreateWidgetPayload',
        resolve: jest.fn()
      }
    };
    const build = {
      input: {
        pgRegistry: {
          pgResources: {
            widgets: {
              codec: {
                attributes: {
                  id: { extensions: { tags: {} } },
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
            }
          }
        }
      },
      inflection: {
        attribute: ({ attributeName }: { attributeName: string }) =>
          attributeName
      }
    };
    const context = { Self: { name: 'Mutation' } };

    expect(() => hook(fields, build, context)).toThrow(
      '@rawSqlAstField points to missing column "nonexistent_column"'
    );
  });

  it('should write AST to companion column when it exists', async () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!.GraphQLObjectType_fields as any;

    const originalResolve = jest
      .fn()
      .mockResolvedValue({ id: 1 });
    const fields = {
      createWidget: {
        type: 'CreateWidgetPayload',
        resolve: originalResolve
      }
    };
    const build = {
      input: {
        pgRegistry: {
          pgResources: {
            widgets: {
              codec: {
                attributes: {
                  id: { extensions: { tags: {} } },
                  formula: {
                    extensions: { tags: { sqlExpression: true } }
                  },
                  formula_ast: {
                    extensions: { tags: {} }
                  }
                }
              }
            }
          }
        }
      },
      inflection: {
        attribute: ({ attributeName }: { attributeName: string }) =>
          attributeName
      }
    };
    const context = { Self: { name: 'Mutation' } };

    const result = hook(fields, build, context);
    const wrappedResolve = result.createWidget.resolve;

    const args = { input: { formula: 'now()' } };
    await wrappedResolve({}, args, {}, {});

    // The AST should have been written to the companion column
    expect(args.input).toHaveProperty('formula_ast');
    expect((args.input as any).formula_ast).toBeDefined();
    expect(typeof (args.input as any).formula_ast).toBe('object');
  });

  it('should skip null/undefined text values without error', async () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!.GraphQLObjectType_fields as any;

    const originalResolve = jest
      .fn()
      .mockResolvedValue({ id: 1 });
    const fields = {
      createWidget: {
        type: 'CreateWidgetPayload',
        resolve: originalResolve
      }
    };
    const build = {
      input: {
        pgRegistry: {
          pgResources: {
            widgets: {
              codec: {
                attributes: {
                  id: { extensions: { tags: {} } },
                  formula: {
                    extensions: { tags: { sqlExpression: true } }
                  }
                }
              }
            }
          }
        }
      },
      inflection: {
        attribute: ({ attributeName }: { attributeName: string }) =>
          attributeName
      }
    };
    const context = { Self: { name: 'Mutation' } };

    const result = hook(fields, build, context);
    const wrappedResolve = result.createWidget.resolve;

    // null value should be skipped
    const argsNull = { input: { formula: null as string | null } };
    await wrappedResolve({}, argsNull, {}, {});
    expect(originalResolve).toHaveBeenCalledTimes(1);

    // undefined value should be skipped
    const argsUndef = { input: { formula: undefined as string | undefined } };
    await wrappedResolve({}, argsUndef, {}, {});
    expect(originalResolve).toHaveBeenCalledTimes(2);
  });

  it('should use default resolver when no resolve is provided', async () => {
    const plugin = createSqlExpressionValidatorPlugin();
    const hook = plugin.schema!.hooks!.GraphQLObjectType_fields as any;

    const fields = {
      createWidget: {
        type: 'CreateWidgetPayload'
        // no resolve function
      }
    };
    const build = {
      input: {
        pgRegistry: {
          pgResources: {
            widgets: {
              codec: {
                attributes: {
                  id: { extensions: { tags: {} } },
                  formula: {
                    extensions: { tags: { sqlExpression: true } }
                  }
                }
              }
            }
          }
        }
      },
      inflection: {
        attribute: ({ attributeName }: { attributeName: string }) =>
          attributeName
      }
    };
    const context = { Self: { name: 'Mutation' } };

    const result = hook(fields, build, context);
    const wrappedResolve = result.createWidget.resolve;

    // The default resolver returns source[fieldName]
    const source = { createWidget: { success: true } };
    const args = { input: {} }; // No formula in args
    const returnValue = await wrappedResolve(source, args, {}, {});
    expect(returnValue).toEqual({ success: true });
  });
});

describe('exports', () => {
  it('should export all expected symbols from index', async () => {
    const mod = await import('../src');
    expect(mod.parseAndValidateSqlExpression).toBeDefined();
    expect(mod.validateAst).toBeDefined();
    expect(mod.DEFAULT_ALLOWED_FUNCTIONS).toBeDefined();
    expect(mod.createSqlExpressionValidatorPlugin).toBeDefined();
    expect(mod.SqlExpressionValidatorPlugin).toBeDefined();
    expect(mod.SqlExpressionValidatorPreset).toBeDefined();
  });
});
