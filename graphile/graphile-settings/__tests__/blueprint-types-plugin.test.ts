/**
 * Unit tests for the BlueprintTypes plugin factory.
 *
 * Tests the plugin structure, preset factory, and JSON Schema → GraphQL
 * field spec conversion without requiring a running PostGraphile server.
 */
import {
  createBlueprintTypesPlugin,
  BlueprintTypesPreset,
} from '../src/plugins/blueprint-types';
import type { NodeTypeRegistryEntry } from '../src/plugins/blueprint-types';
import { jsonSchemaToGraphQLFieldSpecs } from '../src/plugins/blueprint-types/json-schema-to-graphql';
import type { BuildLike } from '../src/plugins/blueprint-types/json-schema-to-graphql';
import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLList,
  GraphQLEnumType,
} from 'graphql';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_NODE_TYPES: NodeTypeRegistryEntry[] = [
  {
    name: 'DataId',
    slug: 'data-id',
    category: 'data',
    display_name: 'Data ID',
    description: 'Adds a UUID primary key column.',
    parameter_schema: { type: 'object' },
    tags: ['core'],
  },
  {
    name: 'DataTimestamps',
    slug: 'data-timestamps',
    category: 'data',
    display_name: 'Timestamps',
    description: 'Adds created_at / updated_at columns.',
    parameter_schema: {
      type: 'object',
      properties: {
        createdAtColumn: { type: 'string', description: 'Column name for created_at' },
        updatedAtColumn: { type: 'string', description: 'Column name for updated_at' },
      },
    },
    tags: ['core'],
  },
  {
    name: 'AuthzEntityMembership',
    slug: 'authz-entity-membership',
    category: 'authz',
    display_name: 'Entity Membership',
    description: 'Adds entity membership RLS policies.',
    parameter_schema: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          items: { type: 'string' },
          description: 'CRUD operations to apply',
        },
      },
      required: ['operations'],
    },
    tags: ['authz'],
  },
  {
    name: 'RelationBelongsTo',
    slug: 'relation-belongs-to',
    category: 'relation',
    display_name: 'Belongs To',
    description: 'Creates a foreign key relationship.',
    parameter_schema: {
      type: 'object',
      properties: {
        sourceTableRef: { type: 'string' },
        targetTableRef: { type: 'string' },
      },
      required: ['sourceTableRef', 'targetTableRef'],
    },
    tags: ['relation'],
  },
];

// ---------------------------------------------------------------------------
// Plugin structure tests
// ---------------------------------------------------------------------------

describe('createBlueprintTypesPlugin', () => {
  it('returns a valid GraphileConfig plugin object', () => {
    const plugin = createBlueprintTypesPlugin(SAMPLE_NODE_TYPES);

    expect(plugin.name).toBe('BlueprintTypesPlugin');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.schema).toBeDefined();
    expect(plugin.schema!.hooks).toBeDefined();
    expect(plugin.schema!.hooks!.init).toBeDefined();
    expect(plugin.schema!.hooks!.GraphQLInputObjectType_fields).toBeDefined();
  });

  it('works with an empty node types array', () => {
    const plugin = createBlueprintTypesPlugin([]);

    expect(plugin.name).toBe('BlueprintTypesPlugin');
    expect(plugin.schema!.hooks!.init).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Preset tests
// ---------------------------------------------------------------------------

describe('BlueprintTypesPreset', () => {
  it('returns a preset containing the plugin', () => {
    const preset = BlueprintTypesPreset(SAMPLE_NODE_TYPES);

    expect(preset.plugins).toBeDefined();
    expect(preset.plugins).toHaveLength(1);
    expect(preset.plugins![0].name).toBe('BlueprintTypesPlugin');
  });
});

// ---------------------------------------------------------------------------
// JSON Schema to GraphQL conversion tests
// ---------------------------------------------------------------------------

describe('jsonSchemaToGraphQLFieldSpecs', () => {
  const mockBuild: BuildLike = {
    graphql: {
      GraphQLString,
      GraphQLInt,
      GraphQLFloat,
      GraphQLBoolean,
      GraphQLNonNull: GraphQLNonNull as any,
      GraphQLList: GraphQLList as any,
      GraphQLEnumType: GraphQLEnumType as any,
    },
    getTypeByName: () => undefined,
  };

  it('converts string properties to GraphQLString', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'A name field' },
      },
    };

    const specs = jsonSchemaToGraphQLFieldSpecs(schema, 'TestParams', mockBuild);

    expect(specs.name).toBeDefined();
    expect(specs.name.type).toBe(GraphQLString);
    expect(specs.name.description).toBe('A name field');
  });

  it('converts integer properties to GraphQLInt', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        count: { type: 'integer' },
      },
    };

    const specs = jsonSchemaToGraphQLFieldSpecs(schema, 'TestParams', mockBuild);

    expect(specs.count.type).toBe(GraphQLInt);
  });

  it('converts number properties to GraphQLFloat', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        score: { type: 'number' },
      },
    };

    const specs = jsonSchemaToGraphQLFieldSpecs(schema, 'TestParams', mockBuild);

    expect(specs.score.type).toBe(GraphQLFloat);
  });

  it('converts boolean properties to GraphQLBoolean', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        enabled: { type: 'boolean' },
      },
    };

    const specs = jsonSchemaToGraphQLFieldSpecs(schema, 'TestParams', mockBuild);

    expect(specs.enabled.type).toBe(GraphQLBoolean);
  });

  it('wraps required fields with GraphQLNonNull', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        optional: { type: 'string' },
      },
      required: ['name'],
    };

    const specs = jsonSchemaToGraphQLFieldSpecs(schema, 'TestParams', mockBuild);

    expect(specs.name.type).toBeInstanceOf(GraphQLNonNull);
    expect((specs.name.type as InstanceType<typeof GraphQLNonNull>).ofType).toBe(GraphQLString);
    expect(specs.optional.type).toBe(GraphQLString);
  });

  it('converts enum properties to GraphQLEnumType', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['active', 'inactive'] },
      },
    };

    const specs = jsonSchemaToGraphQLFieldSpecs(schema, 'TestParams', mockBuild);

    expect(specs.status.type).toBeInstanceOf(GraphQLEnumType);
  });

  it('converts array properties to GraphQLList', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
      },
    };

    const specs = jsonSchemaToGraphQLFieldSpecs(schema, 'TestParams', mockBuild);

    expect(specs.tags.type).toBeInstanceOf(GraphQLList);
  });

  it('returns empty specs for schema without properties', () => {
    const schema = { type: 'object' as const };

    const specs = jsonSchemaToGraphQLFieldSpecs(schema, 'TestParams', mockBuild);

    expect(Object.keys(specs)).toHaveLength(0);
  });

  it('falls back to String for unknown types', () => {
    const buildWithJson: BuildLike = {
      ...mockBuild,
      getTypeByName: () => undefined,
    };

    const schema = {
      type: 'object' as const,
      properties: {
        metadata: { type: 'object' },
      },
    };

    const specs = jsonSchemaToGraphQLFieldSpecs(schema, 'TestParams', buildWithJson);

    // Falls back to JSON scalar or GraphQLString
    expect(specs.metadata).toBeDefined();
  });
});
