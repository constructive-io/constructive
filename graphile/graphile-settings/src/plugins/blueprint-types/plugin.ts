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
 * 4. `GraphQLSchema_types` hook: force-includes all blueprint types so
 *    they survive GraphQL's unreferenced-type pruning
 *
 * All field names use snake_case to match the JSONB format consumed by
 * construct_blueprint() and validated by tg_validate_blueprint_definition().
 *
 * Generated type hierarchy:
 *
 *   BlueprintDefinitionInput
 *   +-- tables: [BlueprintTableInput!]!
 *   |   +-- ref: String!
 *   |   +-- table_name: String!
 *   |   +-- nodes: [BlueprintNodeInput!]!       <-- @oneOf
 *   |   |   +-- shorthand: String
 *   |   |   +-- DataId: DataIdParams
 *   |   |   +-- DataTimestamps: DataTimestampsParams
 *   |   |   +-- AuthzEntityMembership: AuthzEntityMembershipParams
 *   |   |   +-- ...
 *   |   +-- fields: [BlueprintFieldInput!]
 *   |   +-- policies: [BlueprintPolicyInput!]
 *   |   +-- grant_roles: [String!]
 *   |   +-- grants: [JSON!]
 *   |   +-- use_rls: Boolean
 *   +-- relations: [BlueprintRelationInput!]     <-- @oneOf
 *   |   +-- RelationBelongsTo: RelationBelongsToParams
 *   |   +-- ...
 *   +-- indexes: [BlueprintIndexInput!]
 *   +-- full_text_searches: [BlueprintFullTextSearchInput!]
 *
 * When codegen runs, @oneOf types become discriminated union types:
 *
 *   type BlueprintNodeInput =
 *     | { DataId: DataIdParams }
 *     | { DataTimestamps: DataTimestampsParams }
 *     | { AuthzEntityMembership: AuthzEntityMembershipParams }
 */
import type { GraphileConfig } from 'graphile-config';
import type { GraphQLInputType, GraphQLNamedType } from 'graphql';
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
      isBlueprintField?: boolean;
      isBlueprintPolicy?: boolean;
      isBlueprintIndex?: boolean;
      isBlueprintFullTextSearch?: boolean;
      isBlueprintFtsSource?: boolean;
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
const BLUEPRINT_FIELD_INPUT = 'BlueprintFieldInput';
const BLUEPRINT_POLICY_INPUT = 'BlueprintPolicyInput';
const BLUEPRINT_INDEX_INPUT = 'BlueprintIndexInput';
const BLUEPRINT_FULL_TEXT_SEARCH_INPUT = 'BlueprintFullTextSearchInput';
const BLUEPRINT_FTS_SOURCE_INPUT = 'BlueprintFtsSourceInput';

/** All blueprint type names — used by GraphQLSchema_types to force-include */
const ALL_BLUEPRINT_TYPE_NAMES = [
  BLUEPRINT_DEFINITION_INPUT,
  BLUEPRINT_TABLE_INPUT,
  BLUEPRINT_NODE_INPUT,
  BLUEPRINT_RELATION_INPUT,
  BLUEPRINT_FIELD_INPUT,
  BLUEPRINT_POLICY_INPUT,
  BLUEPRINT_INDEX_INPUT,
  BLUEPRINT_FULL_TEXT_SEARCH_INPUT,
  BLUEPRINT_FTS_SOURCE_INPUT,
];

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
              'The complete blueprint definition. Contains tables with typed nodes, relations, indexes, and full-text searches.',
          }),
          'NodeTypeRegistryPlugin: BlueprintDefinitionInput',
        );

        build.registerInputObjectType(
          BLUEPRINT_FIELD_INPUT,
          { isBlueprintField: true },
          () => ({
            description:
              'A custom field (column) to add to a blueprint table. Passed as raw JSONB to metaschema field provisioning.',
          }),
          'NodeTypeRegistryPlugin: BlueprintFieldInput',
        );

        build.registerInputObjectType(
          BLUEPRINT_POLICY_INPUT,
          { isBlueprintPolicy: true },
          () => ({
            description:
              'An RLS policy entry for a blueprint table. The _type field maps to $type in the JSONB and selects the Authz* policy type.',
          }),
          'NodeTypeRegistryPlugin: BlueprintPolicyInput',
        );

        build.registerInputObjectType(
          BLUEPRINT_INDEX_INPUT,
          { isBlueprintIndex: true },
          () => ({
            description:
              'An index definition within a blueprint. Indexes are defined at the definition level and reference tables by ref.',
          }),
          'NodeTypeRegistryPlugin: BlueprintIndexInput',
        );

        build.registerInputObjectType(
          BLUEPRINT_FULL_TEXT_SEARCH_INPUT,
          { isBlueprintFullTextSearch: true },
          () => ({
            description:
              'A full-text search configuration for a blueprint table. References a tsvector field and its source fields.',
          }),
          'NodeTypeRegistryPlugin: BlueprintFullTextSearchInput',
        );

        build.registerInputObjectType(
          BLUEPRINT_FTS_SOURCE_INPUT,
          { isBlueprintFtsSource: true },
          () => ({
            description:
              'A source field contributing to a full-text search tsvector column.',
          }),
          'NodeTypeRegistryPlugin: BlueprintFtsSourceInput',
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
            isBlueprintField,
            isBlueprintPolicy,
            isBlueprintIndex,
            isBlueprintFullTextSearch,
            isBlueprintFtsSource,
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

        // --- BlueprintFieldInput ---
        if (isBlueprintField) {
          return extend(
            fields,
            {
              name: fieldWithHooks(
                { fieldName: 'name' },
                () => ({
                  type: new GraphQLNonNull(GraphQLString),
                  description: 'The column name for this field.',
                }),
              ),
              type: fieldWithHooks(
                { fieldName: 'type' },
                () => ({
                  type: new GraphQLNonNull(GraphQLString),
                  description: 'The PostgreSQL type (e.g., "text", "integer", "boolean", "uuid").',
                }),
              ),
              is_not_null: fieldWithHooks(
                { fieldName: 'is_not_null' },
                () => ({
                  type: build.graphql.GraphQLBoolean,
                  description: 'Whether the column has a NOT NULL constraint. Defaults to false.',
                }),
              ),
              default_value: fieldWithHooks(
                { fieldName: 'default_value' },
                () => ({
                  type: GraphQLString,
                  description: 'SQL default value expression (e.g., "true", "now()").',
                }),
              ),
              description: fieldWithHooks(
                { fieldName: 'description' },
                () => ({
                  type: GraphQLString,
                  description: 'Comment/description for this field.',
                }),
              ),
            },
            'NodeTypeRegistryPlugin: BlueprintFieldInput fields',
          );
        }

        // --- BlueprintPolicyInput ---
        if (isBlueprintPolicy) {
          return extend(
            fields,
            {
              _type: fieldWithHooks(
                { fieldName: '_type' },
                () => ({
                  type: new GraphQLNonNull(GraphQLString),
                  description: 'Authz* policy type name (e.g., "AuthzEntityMembership", "AuthzDirectOwner", "AuthzAllowAll"). Maps to $type in the JSONB.',
                }),
              ),
              policy_role: fieldWithHooks(
                { fieldName: 'policy_role' },
                () => ({
                  type: GraphQLString,
                  description: 'Role for this policy (e.g., "authenticated"). Defaults to "authenticated".',
                }),
              ),
              permissive: fieldWithHooks(
                { fieldName: 'permissive' },
                () => ({
                  type: build.graphql.GraphQLBoolean,
                  description: 'Whether this policy is permissive (true) or restrictive (false). Defaults to true.',
                }),
              ),
              policy_name: fieldWithHooks(
                { fieldName: 'policy_name' },
                () => ({
                  type: GraphQLString,
                  description: 'Optional custom name for this policy.',
                }),
              ),
            },
            'NodeTypeRegistryPlugin: BlueprintPolicyInput fields',
          );
        }

        // --- BlueprintIndexInput ---
        if (isBlueprintIndex) {
          return extend(
            fields,
            {
              table_ref: fieldWithHooks(
                { fieldName: 'table_ref' },
                () => ({
                  type: new GraphQLNonNull(GraphQLString),
                  description: 'Reference key of the table this index belongs to.',
                }),
              ),
              columns: fieldWithHooks(
                { fieldName: 'columns' },
                () => ({
                  type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
                  description: 'Array of column names for a multi-column index. Mutually exclusive with "column".',
                }),
              ),
              column: fieldWithHooks(
                { fieldName: 'column' },
                () => ({
                  type: GraphQLString,
                  description: 'Single column name for the index. Mutually exclusive with "columns".',
                }),
              ),
              access_method: fieldWithHooks(
                { fieldName: 'access_method' },
                () => ({
                  type: GraphQLString,
                  description: 'Index access method (e.g., "BTREE", "GIN", "GIST"). Defaults to BTREE.',
                }),
              ),
              is_unique: fieldWithHooks(
                { fieldName: 'is_unique' },
                () => ({
                  type: build.graphql.GraphQLBoolean,
                  description: 'Whether this is a unique index. Defaults to false.',
                }),
              ),
              name: fieldWithHooks(
                { fieldName: 'name' },
                () => ({
                  type: GraphQLString,
                  description: 'Optional custom name for the index. Auto-generated if omitted.',
                }),
              ),
            },
            'NodeTypeRegistryPlugin: BlueprintIndexInput fields',
          );
        }

        // --- BlueprintFullTextSearchInput ---
        if (isBlueprintFullTextSearch) {
          const BlueprintFtsSourceInputType = build.getTypeByName(
            BLUEPRINT_FTS_SOURCE_INPUT,
          ) as GraphQLInputType | undefined;

          return extend(
            fields,
            {
              table_ref: fieldWithHooks(
                { fieldName: 'table_ref' },
                () => ({
                  type: new GraphQLNonNull(GraphQLString),
                  description: 'Reference key of the table this full-text search belongs to.',
                }),
              ),
              field: fieldWithHooks(
                { fieldName: 'field' },
                () => ({
                  type: new GraphQLNonNull(GraphQLString),
                  description: 'Name of the tsvector field on the table.',
                }),
              ),
              sources: fieldWithHooks(
                { fieldName: 'sources' },
                () => ({
                  type: BlueprintFtsSourceInputType
                    ? new GraphQLNonNull(
                        new GraphQLList(
                          new GraphQLNonNull(BlueprintFtsSourceInputType),
                        ),
                      )
                    : new GraphQLNonNull(
                        new GraphQLList(
                          new GraphQLNonNull(GraphQLString),
                        ),
                      ),
                  description: 'Array of source fields that feed into this tsvector.',
                }),
              ),
            },
            'NodeTypeRegistryPlugin: BlueprintFullTextSearchInput fields',
          );
        }

        // --- BlueprintFtsSourceInput ---
        if (isBlueprintFtsSource) {
          return extend(
            fields,
            {
              field: fieldWithHooks(
                { fieldName: 'field' },
                () => ({
                  type: new GraphQLNonNull(GraphQLString),
                  description: 'Name of the source column.',
                }),
              ),
              weight: fieldWithHooks(
                { fieldName: 'weight' },
                () => ({
                  type: GraphQLString,
                  description: 'tsvector weight: A, B, C, or D. Defaults to D.',
                }),
              ),
              lang: fieldWithHooks(
                { fieldName: 'lang' },
                () => ({
                  type: GraphQLString,
                  description: 'Text search configuration (e.g., "pg_catalog.simple", "pg_catalog.english"). Defaults to pg_catalog.simple.',
                }),
              ),
            },
            'NodeTypeRegistryPlugin: BlueprintFtsSourceInput fields',
          );
        }

        // --- BlueprintTableInput ---
        if (isBlueprintTable) {
          const BlueprintNodeInputType = build.getTypeByName(
            BLUEPRINT_NODE_INPUT,
          ) as GraphQLInputType | undefined;
          const BlueprintFieldInputType = build.getTypeByName(
            BLUEPRINT_FIELD_INPUT,
          ) as GraphQLInputType | undefined;
          const BlueprintPolicyInputType = build.getTypeByName(
            BLUEPRINT_POLICY_INPUT,
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
              table_name: fieldWithHooks(
                { fieldName: 'table_name' },
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
              fields: fieldWithHooks(
                { fieldName: 'fields' },
                () => ({
                  type: BlueprintFieldInputType
                    ? new GraphQLList(
                        new GraphQLNonNull(BlueprintFieldInputType),
                      )
                    : new GraphQLList(GraphQLString),
                  description: 'Custom fields (columns) to add to this table.',
                }),
              ),
              policies: fieldWithHooks(
                { fieldName: 'policies' },
                () => ({
                  type: BlueprintPolicyInputType
                    ? new GraphQLList(
                        new GraphQLNonNull(BlueprintPolicyInputType),
                      )
                    : new GraphQLList(GraphQLString),
                  description: 'RLS policies for this table.',
                }),
              ),
              grant_roles: fieldWithHooks(
                { fieldName: 'grant_roles' },
                () => ({
                  type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
                  description: 'Roles to grant access to (e.g., ["authenticated"]).',
                }),
              ),
              grants: fieldWithHooks(
                { fieldName: 'grants' },
                () => {
                  const JSONType = build.getTypeByName('JSON') as GraphQLInputType | undefined;
                  return {
                    type: new GraphQLList(JSONType ?? GraphQLString),
                    description: 'Grant privilege specifications as JSON arrays (e.g., [["select", "*"], ["insert", "*"]]).',
                  };
                },
              ),
              use_rls: fieldWithHooks(
                { fieldName: 'use_rls' },
                () => ({
                  type: build.graphql.GraphQLBoolean,
                  description: 'Whether to enable RLS on this table. Defaults to true.',
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
          const BlueprintIndexInputType = build.getTypeByName(
            BLUEPRINT_INDEX_INPUT,
          ) as GraphQLInputType | undefined;
          const BlueprintFullTextSearchInputType = build.getTypeByName(
            BLUEPRINT_FULL_TEXT_SEARCH_INPUT,
          ) as GraphQLInputType | undefined;

          return extend(
            fields,
            {
              tables: fieldWithHooks(
                { fieldName: 'tables' },
                () => ({
                  type: BlueprintTableInputType
                    ? new GraphQLNonNull(
                        new GraphQLList(
                          new GraphQLNonNull(BlueprintTableInputType),
                        ),
                      )
                    : new GraphQLNonNull(
                        new GraphQLList(GraphQLString),
                      ),
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
              indexes: fieldWithHooks(
                { fieldName: 'indexes' },
                () => ({
                  type: BlueprintIndexInputType
                    ? new GraphQLList(
                        new GraphQLNonNull(BlueprintIndexInputType),
                      )
                    : new GraphQLList(GraphQLString),
                  description: 'Array of index definitions. Each index references a table by ref.',
                }),
              ),
              full_text_searches: fieldWithHooks(
                { fieldName: 'full_text_searches' },
                () => ({
                  type: BlueprintFullTextSearchInputType
                    ? new GraphQLList(
                        new GraphQLNonNull(BlueprintFullTextSearchInputType),
                      )
                    : new GraphQLList(GraphQLString),
                  description: 'Array of full-text search configurations. Each references a table by ref.',
                }),
              ),
            },
            'NodeTypeRegistryPlugin: BlueprintDefinitionInput fields',
          );
        }

        return fields;
      },

      // Force-include all blueprint types so they survive GraphQL's
      // unreferenced-type pruning (printSchema only emits reachable types)
      GraphQLSchema_types(types: GraphQLNamedType[], build) {
        const nodeTypes = getNodeTypes(build);
        if (nodeTypes.length === 0) return types;

        for (const typeName of ALL_BLUEPRINT_TYPE_NAMES) {
          const type = build.getTypeByName(typeName) as GraphQLNamedType | undefined;
          if (type && !types.includes(type)) {
            types.push(type);
          }
        }

        // Also include all per-node-type Params types
        for (const nt of nodeTypes) {
          const paramsTypeName = nt.name + 'Params';
          const type = build.getTypeByName(paramsTypeName) as GraphQLNamedType | undefined;
          if (type && !types.includes(type)) {
            types.push(type);
          }
        }

        return types;
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
