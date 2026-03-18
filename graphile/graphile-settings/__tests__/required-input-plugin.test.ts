import { GraphQLNonNull, GraphQLString, GraphQLInt } from 'graphql';
import { RequiredInputPlugin, RequiredInputPreset } from '../src/plugins/required-input-plugin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockAttribute(name: string, opts: Record<string, any> = {}) {
  return {
    codec: { name: 'text' },
    notNull: false,
    hasDefault: false,
    extensions: opts.extensions || {},
    ...opts,
  };
}

function createMockCodec(
  name: string,
  attributes: Record<string, any>,
) {
  return {
    name,
    attributes,
    isAnonymous: false,
    extensions: { pg: { schemaName: 'app_public' } },
  };
}

function createMockBuild() {
  return {
    graphql: { GraphQLNonNull },
    inflection: {
      attribute({ attributeName }: { attributeName: string }) {
        // Simple camelCase conversion: snake_case -> camelCase
        return attributeName.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
      },
    },
    extend(base: Record<string, any>, extra: Record<string, any>, _hint: string) {
      return { ...base, ...extra };
    },
  };
}

function callHook(
  fields: Record<string, any>,
  build: any,
  scope: Record<string, any>,
) {
  const hook = RequiredInputPlugin.schema!.hooks!.GraphQLInputObjectType_fields as (
    fields: Record<string, any>,
    build: any,
    context: { scope: Record<string, any> },
  ) => Record<string, any>;
  return hook(fields, build, { scope });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RequiredInputPlugin', () => {
  it('exports a valid plugin object', () => {
    expect(RequiredInputPlugin).toBeDefined();
    expect(RequiredInputPlugin.name).toBe('RequiredInputPlugin');
    expect(RequiredInputPlugin.version).toBe('1.0.0');
    expect(RequiredInputPlugin.schema).toBeDefined();
    expect(RequiredInputPlugin.schema!.hooks).toBeDefined();
    expect(RequiredInputPlugin.schema!.hooks!.GraphQLInputObjectType_fields).toBeDefined();
  });

  it('wraps @requiredInput tagged field with NonNull in mutation input', () => {
    const codec = createMockCodec('membership', {
      id: createMockAttribute('id', { notNull: true, hasDefault: true }),
      grantor_id: createMockAttribute('grantor_id', {
        extensions: { tags: { requiredInput: true } },
      }),
      name: createMockAttribute('name'),
    });

    const fields = {
      id: { type: GraphQLString },
      grantorId: { type: GraphQLString },
      name: { type: GraphQLString },
    };

    const build = createMockBuild();
    const result = callHook(fields, build, {
      pgCodec: codec,
      isMutationInput: true,
    });

    // grantorId should be wrapped with NonNull
    expect(result.grantorId.type).toBeInstanceOf(GraphQLNonNull);
    expect(result.grantorId.type.ofType).toBe(GraphQLString);

    // Other fields should remain unchanged
    expect(result.id.type).toBe(GraphQLString);
    expect(result.name.type).toBe(GraphQLString);
  });

  it('wraps @requiredInput tagged field in isPgPatch scope', () => {
    const codec = createMockCodec('membership', {
      grantor_id: createMockAttribute('grantor_id', {
        extensions: { tags: { requiredInput: true } },
      }),
    });

    const fields = {
      grantorId: { type: GraphQLString },
    };

    const build = createMockBuild();
    const result = callHook(fields, build, {
      pgCodec: codec,
      isPgPatch: true,
    });

    expect(result.grantorId.type).toBeInstanceOf(GraphQLNonNull);
  });

  it('wraps @requiredInput tagged field in isPgBaseInput scope', () => {
    const codec = createMockCodec('membership', {
      grantor_id: createMockAttribute('grantor_id', {
        extensions: { tags: { requiredInput: true } },
      }),
    });

    const fields = {
      grantorId: { type: GraphQLString },
    };

    const build = createMockBuild();
    const result = callHook(fields, build, {
      pgCodec: codec,
      isPgBaseInput: true,
    });

    expect(result.grantorId.type).toBeInstanceOf(GraphQLNonNull);
  });

  it('does not modify fields when no @requiredInput tag is present', () => {
    const codec = createMockCodec('user', {
      id: createMockAttribute('id'),
      email: createMockAttribute('email'),
    });

    const fields = {
      id: { type: GraphQLString },
      email: { type: GraphQLString },
    };

    const build = createMockBuild();
    const result = callHook(fields, build, {
      pgCodec: codec,
      isMutationInput: true,
    });

    expect(result.id.type).toBe(GraphQLString);
    expect(result.email.type).toBe(GraphQLString);
  });

  it('does not modify fields for non-mutation input types', () => {
    const codec = createMockCodec('membership', {
      grantor_id: createMockAttribute('grantor_id', {
        extensions: { tags: { requiredInput: true } },
      }),
    });

    const fields = {
      grantorId: { type: GraphQLString },
    };

    const build = createMockBuild();

    // Not a mutation input type (e.g., a filter or condition type)
    const result = callHook(fields, build, {
      pgCodec: codec,
      isPgPatch: false,
      isPgBaseInput: false,
      isMutationInput: false,
    });

    expect(result.grantorId.type).toBe(GraphQLString);
  });

  it('returns fields unchanged when pgCodec is missing', () => {
    const fields = {
      id: { type: GraphQLString },
    };

    const build = createMockBuild();
    const result = callHook(fields, build, {});

    expect(result).toBe(fields);
  });

  it('returns fields unchanged when pgCodec has no attributes', () => {
    const codec = { name: 'custom_type', isAnonymous: false };

    const fields = {
      id: { type: GraphQLString },
    };

    const build = createMockBuild();
    const result = callHook(fields, build, {
      pgCodec: codec,
      isMutationInput: true,
    });

    expect(result).toBe(fields);
  });

  it('skips fields that are already NonNull', () => {
    const codec = createMockCodec('membership', {
      grantor_id: createMockAttribute('grantor_id', {
        notNull: true,
        extensions: { tags: { requiredInput: true } },
      }),
    });

    const alreadyNonNull = new GraphQLNonNull(GraphQLString);
    const fields = {
      grantorId: { type: alreadyNonNull },
    };

    const build = createMockBuild();
    const result = callHook(fields, build, {
      pgCodec: codec,
      isMutationInput: true,
    });

    // Should remain the same NonNull instance, not double-wrapped
    expect(result.grantorId.type).toBe(alreadyNonNull);
  });

  it('handles multiple @requiredInput fields on the same codec', () => {
    const codec = createMockCodec('invite', {
      sender_id: createMockAttribute('sender_id', {
        extensions: { tags: { requiredInput: true } },
      }),
      receiver_id: createMockAttribute('receiver_id', {
        extensions: { tags: { requiredInput: true } },
      }),
      message: createMockAttribute('message'),
    });

    const fields = {
      senderId: { type: GraphQLString },
      receiverId: { type: GraphQLString },
      message: { type: GraphQLString },
    };

    const build = createMockBuild();
    const result = callHook(fields, build, {
      pgCodec: codec,
      isMutationInput: true,
    });

    expect(result.senderId.type).toBeInstanceOf(GraphQLNonNull);
    expect(result.receiverId.type).toBeInstanceOf(GraphQLNonNull);
    expect(result.message.type).toBe(GraphQLString);
  });

  it('skips attributes whose GraphQL field does not exist', () => {
    const codec = createMockCodec('membership', {
      hidden_field: createMockAttribute('hidden_field', {
        extensions: { tags: { requiredInput: true } },
      }),
    });

    // The field is not in the GraphQL fields (e.g., omitted by another plugin)
    const fields = {
      someOtherField: { type: GraphQLString },
    };

    const build = createMockBuild();
    const result = callHook(fields, build, {
      pgCodec: codec,
      isMutationInput: true,
    });

    // Should not crash, fields unchanged
    expect(result.someOtherField.type).toBe(GraphQLString);
  });

  it('preserves existing field properties when wrapping', () => {
    const codec = createMockCodec('membership', {
      grantor_id: createMockAttribute('grantor_id', {
        extensions: { tags: { requiredInput: true } },
      }),
    });

    const fields = {
      grantorId: {
        type: GraphQLString,
        description: 'The grantor of this membership',
        extensions: { someExtension: true },
      },
    };

    const build = createMockBuild();
    const result = callHook(fields, build, {
      pgCodec: codec,
      isMutationInput: true,
    });

    expect(result.grantorId.type).toBeInstanceOf(GraphQLNonNull);
    expect(result.grantorId.description).toBe('The grantor of this membership');
    expect(result.grantorId.extensions).toEqual({ someExtension: true });
  });

  it('works with non-string types (e.g., GraphQLInt)', () => {
    const codec = createMockCodec('score', {
      player_id: createMockAttribute('player_id', {
        extensions: { tags: { requiredInput: true } },
      }),
    });

    const fields = {
      playerId: { type: GraphQLInt },
    };

    const build = createMockBuild();
    const result = callHook(fields, build, {
      pgCodec: codec,
      isMutationInput: true,
    });

    expect(result.playerId.type).toBeInstanceOf(GraphQLNonNull);
    expect(result.playerId.type.ofType).toBe(GraphQLInt);
  });
});

describe('RequiredInputPreset', () => {
  it('exports a valid preset with the plugin', () => {
    expect(RequiredInputPreset).toBeDefined();
    expect(RequiredInputPreset.plugins).toContain(RequiredInputPlugin);
  });
});
