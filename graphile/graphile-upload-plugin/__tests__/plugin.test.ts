import { GraphQLScalarType, GraphQLError } from 'graphql';
import { createUploadPlugin } from '../src/plugin';
import type { UploadFieldDefinition } from '../src/types';

/**
 * Tests for the upload plugin's field generation and mutation wrapping logic.
 * Tests the internal `relevantUploadType` matching, `GraphQLInputObjectType_fields`
 * hook, and `GraphQLObjectType_fields_field` hook.
 */

// Shared mock resolver
const mockResolve = jest.fn(async (upload: any) => `url:${upload.filename}`);

// Helper to create the plugin and extract hooks
function getHooks(defs: UploadFieldDefinition[] = []) {
  const plugin = createUploadPlugin({ uploadFieldDefinitions: defs });
  return plugin.schema!.hooks as any;
}

// Helper to create a mock build object
function createMockBuild(registeredTypes: Map<string, any> = new Map()) {
  const types = registeredTypes;
  return {
    graphql: { GraphQLScalarType, GraphQLError },
    registerScalarType(
      name: string,
      _ext: any,
      factory: () => any,
      _reason: string
    ) {
      types.set(name, factory());
    },
    getTypeByName(name: string) {
      return types.get(name);
    },
    inflection: {
      attribute({ attributeName }: { codec: any; attributeName: string }) {
        // Simple camelCase inflection mock
        return attributeName;
      }
    },
    extend(base: any, extra: any, _reason?: string) {
      return { ...base, ...extra };
    }
  };
}

describe('relevantUploadType matching', () => {
  const typeDef: UploadFieldDefinition = {
    name: 'text',
    namespaceName: 'pg_catalog',
    type: 'Upload',
    resolve: mockResolve
  };

  const tagDef: UploadFieldDefinition = {
    tag: 'upload',
    resolve: mockResolve
  };

  it('should match by PG type name/namespace via codec extensions', () => {
    const hooks = getHooks([typeDef]);
    const types = new Map();
    const build = createMockBuild(types);
    hooks.init({}, build);

    const attribute = {
      codec: {
        name: 'text',
        extensions: { pg: { name: 'text', schemaName: 'pg_catalog' } }
      }
    };

    // Test through GraphQLInputObjectType_fields hook
    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: { avatar_url: attribute }
        },
        isPgBaseInput: true,
        isPgPatch: false,
        isMutationInput: false
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    const result = hooks.GraphQLInputObjectType_fields({}, build, context);
    expect(result).toHaveProperty('avatar_urlUpload');
  });

  it('should match by codec name as fallback', () => {
    const hooks = getHooks([typeDef]);
    const types = new Map();
    const build = createMockBuild(types);
    hooks.init({}, build);

    const attribute = {
      codec: { name: 'text' }
      // No extensions.pg
    };

    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: { avatar_url: attribute }
        },
        isPgBaseInput: true,
        isPgPatch: false,
        isMutationInput: false
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    const result = hooks.GraphQLInputObjectType_fields({}, build, context);
    expect(result).toHaveProperty('avatar_urlUpload');
  });

  it('should match by smart tag', () => {
    const hooks = getHooks([tagDef]);
    const types = new Map();
    const build = createMockBuild(types);
    hooks.init({}, build);

    const attribute = {
      codec: { name: 'text' },
      extensions: { tags: { upload: true } }
    };

    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: { photo: attribute }
        },
        isPgPatch: true,
        isPgBaseInput: false,
        isMutationInput: false
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    const result = hooks.GraphQLInputObjectType_fields({}, build, context);
    expect(result).toHaveProperty('photoUpload');
  });

  it('should not match when tag is absent', () => {
    const hooks = getHooks([tagDef]);
    const types = new Map();
    const build = createMockBuild(types);
    hooks.init({}, build);

    const attribute = {
      codec: { name: 'text' },
      extensions: { tags: {} }
    };

    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: { photo: attribute }
        },
        isPgBaseInput: true,
        isPgPatch: false,
        isMutationInput: false
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    const result = hooks.GraphQLInputObjectType_fields({}, build, context);
    expect(result).not.toHaveProperty('photoUpload');
  });

  it('should throw when definitions are ambiguous', () => {
    const hooks = getHooks([
      { name: 'text', namespaceName: 'pg_catalog', type: 'Upload', resolve: mockResolve },
      { tag: 'upload', resolve: mockResolve }
    ]);
    const types = new Map();
    const build = createMockBuild(types);
    hooks.init({}, build);

    // Attribute that matches BOTH definitions
    const attribute = {
      codec: {
        name: 'text',
        extensions: { pg: { name: 'text', schemaName: 'pg_catalog' } }
      },
      extensions: { tags: { upload: true } }
    };

    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: { photo: attribute }
        },
        isPgBaseInput: true,
        isPgPatch: false,
        isMutationInput: false
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    expect(() =>
      hooks.GraphQLInputObjectType_fields({}, build, context)
    ).toThrow('Upload field definitions are ambiguous');
  });
});

describe('GraphQLInputObjectType_fields hook', () => {
  const def: UploadFieldDefinition = {
    tag: 'upload',
    resolve: mockResolve
  };

  it('should skip non-codec input types', () => {
    const hooks = getHooks([def]);
    const build = createMockBuild();

    const context = {
      scope: {
        pgCodec: null as any,
        isPgBaseInput: true,
        isPgPatch: false,
        isMutationInput: false
      }
    };

    const fields = { existingField: {} };
    const result = hooks.GraphQLInputObjectType_fields(fields, build, context);
    expect(result).toBe(fields);
  });

  it('should skip codecs without attributes', () => {
    const hooks = getHooks([def]);
    const build = createMockBuild();

    const context = {
      scope: {
        pgCodec: { name: 'MyType' } as any, // no attributes
        isPgBaseInput: true,
        isPgPatch: false,
        isMutationInput: false
      }
    };

    const fields = { existingField: {} };
    const result = hooks.GraphQLInputObjectType_fields(fields, build, context);
    expect(result).toBe(fields);
  });

  it('should skip non-mutation input types', () => {
    const hooks = getHooks([def]);
    const types = new Map();
    const build = createMockBuild(types);
    hooks.init({}, build);

    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: {
            photo: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            }
          }
        },
        isPgPatch: false,
        isPgBaseInput: false,
        isMutationInput: false
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    const fields = {};
    const result = hooks.GraphQLInputObjectType_fields(fields, build, context);
    expect(result).toBe(fields);
  });

  it('should add upload fields for isPgPatch scope', () => {
    const hooks = getHooks([def]);
    const types = new Map();
    const build = createMockBuild(types);
    hooks.init({}, build);

    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: {
            photo: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            }
          }
        },
        isPgPatch: true,
        isPgBaseInput: false,
        isMutationInput: false
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    const result = hooks.GraphQLInputObjectType_fields({}, build, context);
    expect(result).toHaveProperty('photoUpload');
  });

  it('should add upload fields for isMutationInput scope', () => {
    const hooks = getHooks([def]);
    const types = new Map();
    const build = createMockBuild(types);
    hooks.init({}, build);

    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: {
            photo: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            }
          }
        },
        isPgPatch: false,
        isPgBaseInput: false,
        isMutationInput: true
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    const result = hooks.GraphQLInputObjectType_fields({}, build, context);
    expect(result).toHaveProperty('photoUpload');
  });

  it('should skip when Upload type is not registered', () => {
    const hooks = getHooks([def]);
    // Don't call init, so Upload type is not registered
    const build = createMockBuild();

    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: {
            photo: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            }
          }
        },
        isPgBaseInput: true,
        isPgPatch: false,
        isMutationInput: false
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    const result = hooks.GraphQLInputObjectType_fields({}, build, context);
    expect(result).not.toHaveProperty('photoUpload');
  });

  it('should throw on duplicate upload field names', () => {
    const hooks = getHooks([
      { tag: 'upload', resolve: mockResolve },
      { tag: 'upload2', resolve: mockResolve }
    ]);
    const types = new Map();
    const build = createMockBuild(types);
    // Override inflection to produce same field name for different attributes
    build.inflection.attribute = () => 'photo';
    hooks.init({}, build);

    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: {
            photo1: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            },
            photo2: {
              codec: { name: 'text' },
              extensions: { tags: { upload2: true } }
            }
          }
        },
        isPgBaseInput: true,
        isPgPatch: false,
        isMutationInput: false
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    expect(() =>
      hooks.GraphQLInputObjectType_fields({}, build, context)
    ).toThrow(/Two columns produce the same upload field name/);
  });

  it('should handle multiple upload fields on the same codec', () => {
    const hooks = getHooks([def]);
    const types = new Map();
    const build = createMockBuild(types);
    hooks.init({}, build);

    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: {
            avatar: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            },
            cover_photo: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            },
            name: {
              codec: { name: 'text' },
              extensions: { tags: {} }
            }
          }
        },
        isPgBaseInput: true,
        isPgPatch: false,
        isMutationInput: false
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    const result = hooks.GraphQLInputObjectType_fields({}, build, context);
    expect(result).toHaveProperty('avatarUpload');
    expect(result).toHaveProperty('cover_photoUpload');
    expect(result).not.toHaveProperty('nameUpload');
  });
});

describe('GraphQLObjectType_fields_field hook (mutation resolver wrapping)', () => {
  beforeEach(() => {
    mockResolve.mockClear();
  });

  const def: UploadFieldDefinition = {
    tag: 'upload',
    resolve: mockResolve,
    type: 'image'
  };

  it('should skip non-mutation fields', () => {
    const hooks = getHooks([def]);
    const build = createMockBuild();

    const field = { resolve: jest.fn() };
    const context = {
      scope: {
        isRootMutation: false,
        fieldName: 'createPost',
        pgCodec: { name: 'Post', attributes: {} }
      }
    };

    const result = hooks.GraphQLObjectType_fields_field(field, build, context);
    expect(result).toBe(field);
  });

  it('should skip when pgCodec is missing', () => {
    const hooks = getHooks([def]);
    const build = createMockBuild();

    const field = { resolve: jest.fn() };
    const context = {
      scope: {
        isRootMutation: true,
        fieldName: 'createPost',
        pgCodec: null as any
      }
    };

    const result = hooks.GraphQLObjectType_fields_field(field, build, context);
    expect(result).toBe(field);
  });

  it('should skip when no upload fields match', () => {
    const hooks = getHooks([def]);
    const build = createMockBuild();

    const field = { resolve: jest.fn() };
    const context = {
      scope: {
        isRootMutation: true,
        fieldName: 'createPost',
        pgCodec: {
          name: 'Post',
          attributes: {
            title: {
              codec: { name: 'text' },
              extensions: { tags: {} }
            }
          }
        }
      }
    };

    const result = hooks.GraphQLObjectType_fields_field(field, build, context);
    expect(result).toBe(field);
  });

  it('should wrap resolve when upload fields match', () => {
    const hooks = getHooks([def]);
    const build = createMockBuild();

    const oldResolve = jest.fn().mockResolvedValue({ id: '1' });
    const field = { resolve: oldResolve, type: 'Post' };
    const context = {
      scope: {
        isRootMutation: true,
        fieldName: 'createPost',
        pgCodec: {
          name: 'Post',
          attributes: {
            photo: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            }
          }
        }
      }
    };

    const result = hooks.GraphQLObjectType_fields_field(field, build, context);
    expect(result.resolve).not.toBe(oldResolve);
    expect(result.type).toBe('Post'); // Spread rest preserved
  });

  it('should resolve upload promises and call custom resolver', async () => {
    const hooks = getHooks([def]);
    const build = createMockBuild();

    const oldResolve = jest.fn().mockResolvedValue({ id: '1' });
    const field = { resolve: oldResolve };
    const context = {
      scope: {
        isRootMutation: true,
        fieldName: 'createPost',
        pgCodec: {
          name: 'Post',
          attributes: {
            photo: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            }
          }
        }
      }
    };

    const wrappedField = hooks.GraphQLObjectType_fields_field(
      field,
      build,
      context
    );

    const fakeUpload = { filename: 'photo.jpg', createReadStream: jest.fn() };
    const args = {
      input: {
        photoUpload: Promise.resolve(fakeUpload),
        title: 'My Post'
      }
    };
    const ctx = { user: { id: '1' } };
    const info = { fieldName: 'createPost' };

    await wrappedField.resolve({}, args, ctx, info);

    // Upload resolver should have been called with the upload
    expect(mockResolve).toHaveBeenCalledTimes(1);
    expect(mockResolve).toHaveBeenCalledWith(
      fakeUpload,
      args,
      ctx,
      expect.objectContaining({
        uploadPlugin: {
          tags: { upload: true },
          type: 'image'
        }
      })
    );

    // The original column value should be set
    expect((args.input as any).photo).toBe('url:photo.jpg');

    // The old resolver should have been called
    expect(oldResolve).toHaveBeenCalledTimes(1);
  });

  it('should recursively resolve nested upload promises', async () => {
    const hooks = getHooks([def]);
    const build = createMockBuild();

    const oldResolve = jest.fn().mockResolvedValue({ id: '1' });
    const field = { resolve: oldResolve };
    const context = {
      scope: {
        isRootMutation: true,
        fieldName: 'createPost',
        pgCodec: {
          name: 'Post',
          attributes: {
            photo: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            }
          }
        }
      }
    };

    const wrappedField = hooks.GraphQLObjectType_fields_field(
      field,
      build,
      context
    );

    const fakeUpload = { filename: 'deep.png', createReadStream: jest.fn() };
    const args = {
      input: {
        nested: {
          photoUpload: Promise.resolve(fakeUpload)
        }
      }
    };

    await wrappedField.resolve({}, args, {}, {});

    // Should have found and resolved the nested promise
    expect(mockResolve).toHaveBeenCalledTimes(1);
  });

  it('should use default resolver when no resolve is provided on field', async () => {
    const hooks = getHooks([def]);
    const build = createMockBuild();

    // Field without a resolve function
    const field = { type: 'Post' };
    const context = {
      scope: {
        isRootMutation: true,
        fieldName: 'createPost',
        pgCodec: {
          name: 'Post',
          attributes: {
            photo: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            }
          }
        }
      }
    };

    const wrappedField = hooks.GraphQLObjectType_fields_field(
      field,
      build,
      context
    );

    const source = { createPost: { id: '1', title: 'Test' } };
    const args = { input: { title: 'Test' } };

    const result = await wrappedField.resolve(source, args, {}, {});
    // Default resolver: (obj) => obj[fieldName]
    expect(result).toEqual({ id: '1', title: 'Test' });
  });

  it('should skip non-Promise values during recursive walk', async () => {
    const hooks = getHooks([def]);
    const build = createMockBuild();

    const oldResolve = jest.fn().mockResolvedValue({ id: '1' });
    const field = { resolve: oldResolve };
    const context = {
      scope: {
        isRootMutation: true,
        fieldName: 'createPost',
        pgCodec: {
          name: 'Post',
          attributes: {
            photo: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            }
          }
        }
      }
    };

    const wrappedField = hooks.GraphQLObjectType_fields_field(
      field,
      build,
      context
    );

    const args = {
      input: {
        title: 'Normal string',
        count: 42,
        active: true,
        meta: null as any
      }
    };

    await wrappedField.resolve({}, args, {}, {});

    // No uploads to resolve
    expect(mockResolve).not.toHaveBeenCalled();
    expect(oldResolve).toHaveBeenCalledTimes(1);
  });

  it('should handle upload promises that are not in uploadResolversByFieldName', async () => {
    const hooks = getHooks([def]);
    const build = createMockBuild();

    const oldResolve = jest.fn().mockResolvedValue({ id: '1' });
    const field = { resolve: oldResolve };
    const context = {
      scope: {
        isRootMutation: true,
        fieldName: 'createPost',
        pgCodec: {
          name: 'Post',
          attributes: {
            photo: {
              codec: { name: 'text' },
              extensions: { tags: { upload: true } }
            }
          }
        }
      }
    };

    const wrappedField = hooks.GraphQLObjectType_fields_field(
      field,
      build,
      context
    );

    // Promise with a key that doesn't match any upload field
    const args = {
      input: {
        unknownUpload: Promise.resolve({ filename: 'nope.txt' })
      }
    };

    await wrappedField.resolve({}, args, {}, {});

    // Should not call the upload resolver since key doesn't match
    expect(mockResolve).not.toHaveBeenCalled();
    expect(oldResolve).toHaveBeenCalledTimes(1);
  });
});

describe('createUploadPlugin', () => {
  it('should return a valid plugin object', () => {
    const plugin = createUploadPlugin();

    expect(plugin.name).toBe('UploadPlugin');
    expect(plugin.version).toBe('2.0.0');
    expect(plugin.description).toBe('File upload support for PostGraphile v5');
    expect(plugin.after).toEqual([
      'PgAttributesPlugin',
      'PgMutationCreatePlugin',
      'PgMutationUpdateDeletePlugin'
    ]);
    expect(plugin.schema).toBeDefined();
    expect(plugin.schema!.hooks).toBeDefined();
  });

  it('should default to empty uploadFieldDefinitions', () => {
    const hooks = getHooks();
    const types = new Map();
    const build = createMockBuild(types);
    hooks.init({}, build);

    // No definitions, so no upload fields should be created
    const context = {
      scope: {
        pgCodec: {
          name: 'MyTable',
          attributes: {
            photo: {
              codec: { name: 'text' },
              extensions: { tags: {} }
            }
          }
        },
        isPgBaseInput: true,
        isPgPatch: false,
        isMutationInput: false
      },
      fieldWithHooks: (_scope: any, config: any) => config
    };

    const result = hooks.GraphQLInputObjectType_fields({}, build, context);
    expect(result).not.toHaveProperty('photoUpload');
  });
});

describe('UploadPlugin export', () => {
  it('should export UploadPlugin as alias for createUploadPlugin', async () => {
    const { UploadPlugin, createUploadPlugin } = await import('../src/plugin');
    expect(UploadPlugin).toBe(createUploadPlugin);
  });
});
