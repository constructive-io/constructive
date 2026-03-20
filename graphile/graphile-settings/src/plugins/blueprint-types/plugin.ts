/**
 * Node Type Registry Plugin
 *
 * Generic PostGraphile v5 plugin that queries node_type_registry at schema
 * build time through the existing pgService connection (gather phase) and
 * generates @oneOf typed input types with SuperCase node type names as
 * discriminant keys.
 *
 * Architecture (correct PostGraphile v5 pattern):
 * 1. `gather` phase: hooks into pgIntrospection_introspection to query
 *    node_type_registry through the existing pgService (no separate pool —
 *    uses withPgClientFromPgService like PgIntrospectionPlugin)
 * 2. `init` hook: registers all input type shells from gathered entries
 * 3. `GraphQLInputObjectType_fields` hook: populates fields on those types
 *
 * Generated type hierarchy:
 *
 *   BlueprintDefinitionInput
 *   +-- tables: [BlueprintTableInput!]
 *   |   +-- ref: String!
 *   |   +-- tableName: String!
 *   |   +-- nodes: [BlueprintNodeInput!]!    <-- @oneOf
 *   |       +-- shorthand: String
 *   |       +-- DataId: DataIdParams
 *   |       +-- DataTimestamps: DataTimestampsParams
 *   |       +-- AuthzEntityMembership: AuthzEntityMembershipParams
 *   |       +-- ...
 *   +-- relations: [BlueprintRelationInput!]  <-- @oneOf
 *       +-- RelationBelongsTo: RelationBelongsToParams
 *       +-- ...
 *
 * When codegen runs, @oneOf types become discriminated union types:
 *
 *   type BlueprintNodeInput =
 *     | { DataId: DataIdParams }
 *     | { DataTimestamps: DataTimestampsParams }
 *     | { AuthzEntityMembership: AuthzEntityMembershipParams }
 */
import type { GraphileConfig } from 'graphile-config';
import type { GraphQLInputType } from 'graphql';
import { withPgClientFromPgService } from 'graphile-build-pg';
import { jsonSchemaToGraphQLFieldSpecs } from './json-schema-to-graphql';

// ============================================================================
// Types
// ============================================================================

export interface NodeTypeRegistryEntry {
  name: string;
  slug: string;
  category: string;
  display_name: string;
  description: string;
  parameter_schema: Record<string, unknown>;
  tags: string[];
}

// ============================================================================
// Scope augmentation for PostGraphile v5
// ============================================================================

declare global {
  namespace GraphileBuild {
    interface ScopeInputObject {
      isBlueprintOneOf?: boolean;
      isBlueprintNodeParams?: boolean;
      isBlueprintTable?: boolean;
      isBlueprintDefinition?: boolean;
      isBlueprintRelation?: boolean;
      blueprintNodeTypeName?: string;
    }

    interface BuildInput {
      nodeTypeRegistryEntries?: NodeTypeRegistryEntry[];
    }
  }
}

// ============================================================================
// Constants
// ============================================================================

const BLUEPRINT_NODE_INPUT = 'BlueprintNodeInput';
const BLUEPRINT_TABLE_INPUT = 'BlueprintTableInput';
const BLUEPRINT_RELATION_INPUT = 'BlueprintRelationInput';
const BLUEPRINT_DEFINITION_INPUT = 'BlueprintDefinitionInput';

const NODE_TYPE_REGISTRY_QUERY = `
  SELECT
    name,
    slug,
    category,
    COALESCE(display_name, name) as display_name,
    COALESCE(description, '') as description,
    COALESCE(parameter_schema, '{}'::jsonb) as parameter_schema,
    COALESCE(tags, '{}') as tags
  FROM metaschema_public.node_type_registry
  ORDER BY category, name
`;

// ============================================================================
// Shared schema hooks
// ============================================================================

/**
 * Builds the schema hooks (init + GraphQLInputObjectType_fields) from
 * a function that retrieves node type entries. Used by both the gather-phase
 * plugin (reads from build.input) and the static/legacy plugin (closure).
 */
function buildSchemaHooks(
  getNodeTypes: (build: GraphileBuild.Build) => NodeTypeRegistryEntry[],
): GraphileConfig.Plugin['schema'] {
  return {
    hooks: {
      init(_, build) {
        const nodeTypes = getNodeTypes(build);
        if (nodeTypes.length === 0) return _;

        for (const nt of nodeTypes) {
          const paramsTypeName = nt.name + 'Params';
          build.registerInputObjectType(
            paramsTypeName,
            {
              isBlueprintNodeParams: true,
              blueprintNodeTypeName: nt.name,
            },
            () => ({
              description: nt.description,
            }),
            'NodeTypeRegistryPlugin: ' + paramsTypeName,
          );
        }

        build.registerInputObjectType(
          BLUEPRINT_NODE_INPUT,
          { isBlueprintOneOf: true },
          () => ({
            description:
              'A single node in a blueprint definition. Exactly one field must be set. Use the SuperCase node type name as the key with its parameters as the value, or use "shorthand" with just the node type name string.',
            isOneOf: true,
          }),
          'NodeTypeRegistryPlugin: BlueprintNodeInput',
        );

        build.registerInputObjectType(
          BLUEPRINT_RELATION_INPUT,
          { isBlueprintOneOf: true, isBlueprintRelation: true },
          () => ({
            description:
              'A relation in a blueprint definition. Exactly one field must be set. Use the SuperCase relation type name as the key.',
            isOneOf: true,
          }),
          'NodeTypeRegistryPlugin: BlueprintRelationInput',
        );

        build.registerInputObjectType(
          BLUEPRINT_TABLE_INPUT,
          { isBlueprintTable: true },
          () => ({
            description:
              'A table definition within a blueprint. Specifies the table reference, name, and an array of typed nodes.',
          }),
          'NodeTypeRegistryPlugin: BlueprintTableInput',
        );

        build.registerInputObjectType(
          BLUEPRINT_DEFINITION_INPUT,
          { isBlueprintDefinition: true },
          () => ({
            description:
              'The complete blueprint definition. Contains tables with typed nodes and relations.',
          }),
          'NodeTypeRegistryPlugin: BlueprintDefinitionInput',
        );

        return _;
      },

      GraphQLInputObjectType_fields(fields, build, context) {
        const nodeTypes = getNodeTypes(build);
        if (nodeTypes.length === 0) return fields;

        const nodeTypesByName = new Map<string, NodeTypeRegistryEntry>();
        const relationNodeTypes: NodeTypeRegistryEntry[] = [];
        const nonRelationNodeTypes: NodeTypeRegistryEntry[] = [];

        for (const nt of nodeTypes) {
          nodeTypesByName.set(nt.name, nt);
          if (nt.category === 'relation') {
            relationNodeTypes.push(nt);
          } else {
            nonRelationNodeTypes.push(nt);
          }
        }

        const {
          extend,
          graphql: { GraphQLString, GraphQLNonNull, GraphQLList },
        } = build;
        const {
          fieldWithHooks,
          scope: {
            isBlueprintOneOf,
            isBlueprintNodeParams,
            isBlueprintTable,
            isBlueprintDefinition,
            isBlueprintRelation,
            blueprintNodeTypeName,
          },
        } = context;

        // --- Per-node-type params (e.g., DataIdParams) ---
        if (isBlueprintNodeParams && blueprintNodeTypeName) {
          const nt = nodeTypesByName.get(blueprintNodeTypeName);
          if (!nt) return fields;

          const schema = nt.parameter_schema as {
            type: string;
            properties?: Record<string, unknown>;
            required?: string[];
          };

          const fieldSpecs = jsonSchemaToGraphQLFieldSpecs(
            schema,
            nt.name + 'Params',
            build,
          );

          if (Object.keys(fieldSpecs).length > 0) {
            let result = fields;
            for (const [fieldName, spec] of Object.entries(fieldSpecs)) {
              result = extend(
                result,
                {
                  [fieldName]: fieldWithHooks(
                    { fieldName },
                    () => spec,
                  ),
                },
                'NodeTypeRegistryPlugin: ' + blueprintNodeTypeName + '.' + fieldName,
              );
            }
            return result;
          }

          return extend(
            fields,
            {
              _: fieldWithHooks(
                { fieldName: '_' },
                () => ({
                  type: build.graphql.GraphQLBoolean,
                  description:
                    'No parameters required. Pass true or omit entirely.',
                }),
              ),
            },
            'NodeTypeRegistryPlugin: ' + blueprintNodeTypeName + '._',
          );
        }

        // --- BlueprintNodeInput (@oneOf with all non-relation node types) ---
        if (isBlueprintOneOf && !isBlueprintRelation) {
          let result = fields;

          result = extend(
            result,
            {
              shorthand: fieldWithHooks(
                { fieldName: 'shorthand' },
                () => ({
                  type: GraphQLString,
                  description:
                    'String shorthand: just the SuperCase node type name (e.g., "DataTimestamps"). Use when the node type has no required parameters.',
                }),
              ),
            },
            'NodeTypeRegistryPlugin: BlueprintNodeInput.shorthand',
          );

          for (const nt of nonRelationNodeTypes) {
            const paramsTypeName = nt.name + 'Params';
            const ParamsType = build.getTypeByName(paramsTypeName) as GraphQLInputType | undefined;
            if (!ParamsType) continue;

            result = extend(
              result,
              {
                [nt.name]: fieldWithHooks(
                  { fieldName: nt.name },
                  () => ({
                    type: ParamsType,
                    description: 'Parameters for ' + nt.name + ' (' + nt.display_name + ')',
                  }),
                ),
              },
              'NodeTypeRegistryPlugin: BlueprintNodeInput.' + nt.name,
            );
          }

          return result;
        }

        // --- BlueprintRelationInput (@oneOf with relation node types) ---
        if (isBlueprintOneOf && isBlueprintRelation) {
          let result = fields;

          for (const nt of relationNodeTypes) {
            const paramsTypeName = nt.name + 'Params';
            const ParamsType = build.getTypeByName(paramsTypeName) as GraphQLInputType | undefined;
            if (!ParamsType) continue;

            result = extend(
              result,
              {
                [nt.name]: fieldWithHooks(
                  { fieldName: nt.name },
                  () => ({
                    type: ParamsType,
                    description: 'Parameters for ' + nt.name + ' (' + nt.display_name + ')',
                  }),
                ),
              },
              'NodeTypeRegistryPlugin: BlueprintRelationInput.' + nt.name,
            );
          }

          return result;
        }

        // --- BlueprintTableInput ---
        if (isBlueprintTable) {
          const BlueprintNodeInputType = build.getTypeByName(
            BLUEPRINT_NODE_INPUT,
          ) as GraphQLInputType | undefined;

          return extend(
            fields,
            {
              ref: fieldWithHooks(
                { fieldName: 'ref' },
                () => ({
                  type: new GraphQLNonNull(GraphQLString),
                  description:
                    'Unique reference key for this table within the blueprint (used for cross-references in relations).',
                }),
              ),
              tableName: fieldWithHooks(
                { fieldName: 'tableName' },
                () => ({
                  type: new GraphQLNonNull(GraphQLString),
                  description: 'The PostgreSQL table name to create.',
                }),
              ),
              nodes: fieldWithHooks(
                { fieldName: 'nodes' },
                () => ({
                  type: BlueprintNodeInputType
                    ? new GraphQLNonNull(
                        new GraphQLList(
                          new GraphQLNonNull(BlueprintNodeInputType),
                        ),
                      )
                    : new GraphQLNonNull(
                        new GraphQLList(
                          new GraphQLNonNull(GraphQLString),
                        ),
                      ),
                  description:
                    'Array of node type entries (data, authz, field behaviors) to apply to this table.',
                }),
              ),
            },
            'NodeTypeRegistryPlugin: BlueprintTableInput fields',
          );
        }

        // --- BlueprintDefinitionInput ---
        if (isBlueprintDefinition) {
          const BlueprintTableInputType = build.getTypeByName(
            BLUEPRINT_TABLE_INPUT,
          ) as GraphQLInputType | undefined;
          const BlueprintRelationInputType = build.getTypeByName(
            BLUEPRINT_RELATION_INPUT,
          ) as GraphQLInputType | undefined;

          return extend(
            fields,
            {
              tables: fieldWithHooks(
                { fieldName: 'tables' },
                () => ({
                  type: BlueprintTableInputType
                    ? new GraphQLList(
                        new GraphQLNonNull(BlueprintTableInputType),
                      )
                    : new GraphQLList(GraphQLString),
                  description: 'Array of table definitions.',
                }),
              ),
              relations: fieldWithHooks(
                { fieldName: 'relations' },
                () => ({
                  type: BlueprintRelationInputType
                    ? new GraphQLList(
                        new GraphQLNonNull(BlueprintRelationInputType),
                      )
                    : new GraphQLList(GraphQLString),
                  description: 'Array of relation definitions.',
                }),
              ),
            },
            'NodeTypeRegistryPlugin: BlueprintDefinitionInput fields',
          );
        }

        return fields;
      },
    },
  };
}

// ============================================================================
// Gather-phase plugin (production -- queries DB through existing pgService)
// ============================================================================

/**
 * NodeTypeRegistryPlugin
 *
 * Gather-phase plugin that queries node_type_registry through the existing
 * pgService connection, then generates @oneOf typed input types in the
 * schema phase. No separate PG pool -- uses the same connection PostGraphile
 * already has (same pattern as PgIntrospectionPlugin / PgEnumTablesPlugin).
 *
 * If the table doesn't exist (42P01) or the query fails, the plugin
 * gracefully skips and no types are registered.
 */
export const NodeTypeRegistryPlugin: GraphileConfig.Plugin = {
  name: 'NodeTypeRegistryPlugin',
  version: '1.0.0',
  description:
    'Queries node_type_registry via the existing pgService and generates @oneOf typed input types with SuperCase keys',

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gather: {
    namespace: 'nodeTypeRegistry',
    version: 1,

    initialState() {
      return { entries: [] as NodeTypeRegistryEntry[] };
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async finalize(info: any) {
      info.buildInput.nodeTypeRegistryEntries =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (info as any).state.entries ?? [];
    },

    hooks: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async pgIntrospection_introspection(info: any, event: any) {
        const { serviceName } = event;
        const pgService = info.resolvedPreset.pgServices?.find(
          (svc: { name: string }) => svc.name === serviceName,
        );
        if (!pgService) return;

        try {
          const result = await withPgClientFromPgService(
            pgService,
            null,
            (client) =>
              client.query<NodeTypeRegistryEntry>({ text: NODE_TYPE_REGISTRY_QUERY }),
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const state = (info as any).state;
          if (!state.entries) {
            state.entries = [];
          }
          state.entries.push(...result.rows);
        } catch (error: unknown) {
          const pgError = error as { code?: string; message?: string };
          if (pgError.code === '42P01') {
            // 42P01 = undefined_table -- expected when DB hasn't been migrated
            return;
          }
          // Warn but don't fail the schema build
          console.warn(
            '[NodeTypeRegistryPlugin] Failed to query node_type_registry:',
            pgError.message ?? String(error),
          );
        }
      },
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,

  schema: buildSchemaHooks(
    (build) => (build.input as GraphileBuild.BuildInput).nodeTypeRegistryEntries ?? [],
  ),
};

// ============================================================================
// Preset
// ============================================================================

/**
 * Preset that includes the NodeTypeRegistryPlugin.
 *
 * Add to ConstructivePreset.extends[] -- the plugin will automatically
 * query node_type_registry through the existing pgService connection
 * during the gather phase. No separate pool, no manual wiring.
 */
export const NodeTypeRegistryPreset: GraphileConfig.Preset = {
  plugins: [NodeTypeRegistryPlugin],
};

// ============================================================================
// Legacy exports for backward compatibility
// ============================================================================

/**
 * @deprecated Use NodeTypeRegistryPlugin directly. The gather-phase plugin
 * queries node_type_registry automatically via pgService. This factory is
 * kept for backward compatibility and tests that pass static entries.
 */
export function createBlueprintTypesPlugin(
  nodeTypes: NodeTypeRegistryEntry[],
): GraphileConfig.Plugin {
  return {
    name: 'BlueprintTypesPlugin',
    version: '1.0.0',
    description:
      'Generates @oneOf typed input types from static node_type_registry entries',
    schema: buildSchemaHooks(() => nodeTypes),
  };
}

/**
 * @deprecated Use NodeTypeRegistryPreset directly. The gather-phase plugin
 * queries node_type_registry automatically via pgService. This factory is
 * kept for backward compatibility and tests that pass static entries.
 */
export function BlueprintTypesPreset(
  nodeTypes: NodeTypeRegistryEntry[],
): GraphileConfig.Preset {
  return {
    plugins: [createBlueprintTypesPlugin(nodeTypes)],
  };
}
