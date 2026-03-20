/**
 * Blueprint Types Plugin
 *
 * PostGraphile v5 plugin that generates @oneOf typed input types for blueprint
 * definitions based on node_type_registry entries.
 *
 * Architecture (correct PostGraphile v5 pattern):
 * 1. `init` hook: registers all input type shells via build.registerInputObjectType()
 * 2. `GraphQLInputObjectType_fields` hook: populates fields on those registered types
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
  }
}

// ============================================================================
// Constants
// ============================================================================

const BLUEPRINT_NODE_INPUT = 'BlueprintNodeInput';
const BLUEPRINT_TABLE_INPUT = 'BlueprintTableInput';
const BLUEPRINT_RELATION_INPUT = 'BlueprintRelationInput';
const BLUEPRINT_DEFINITION_INPUT = 'BlueprintDefinitionInput';

// ============================================================================
// Plugin factory
// ============================================================================

/**
 * Creates the BlueprintTypesPlugin with the given node type registry entries.
 *
 * @param nodeTypes - Array of node_type_registry rows (from DB or static config)
 */
export function createBlueprintTypesPlugin(
  nodeTypes: NodeTypeRegistryEntry[],
): GraphileConfig.Plugin {
  // Pre-compute node type lookups
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

  return {
    name: 'BlueprintTypesPlugin',
    version: '1.0.0',
    description:
      'Generates @oneOf typed input types for blueprint definitions from node_type_registry',

    schema: {
      hooks: {
        /**
         * Register all blueprint input types as shells.
         * Fields are populated in the GraphQLInputObjectType_fields hook.
         */
        init(_, build) {
          // 1. Register per-node-type params input types
          //    e.g., DataIdParams, AuthzEntityMembershipParams
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
              'BlueprintTypesPlugin: ' + paramsTypeName,
            );
          }

          // 2. Register BlueprintNodeInput (@oneOf -- all non-relation node types + shorthand)
          build.registerInputObjectType(
            BLUEPRINT_NODE_INPUT,
            {
              isBlueprintOneOf: true,
            },
            () => ({
              description:
                'A single node in a blueprint definition. Exactly one field must be set. Use the SuperCase node type name as the key with its parameters as the value, or use "shorthand" with just the node type name string.',
              isOneOf: true,
            }),
            'BlueprintTypesPlugin: BlueprintNodeInput',
          );

          // 3. Register BlueprintRelationInput (@oneOf -- relation node types)
          build.registerInputObjectType(
            BLUEPRINT_RELATION_INPUT,
            {
              isBlueprintOneOf: true,
              isBlueprintRelation: true,
            },
            () => ({
              description:
                'A relation in a blueprint definition. Exactly one field must be set. Use the SuperCase relation type name as the key.',
              isOneOf: true,
            }),
            'BlueprintTypesPlugin: BlueprintRelationInput',
          );

          // 4. Register BlueprintTableInput
          build.registerInputObjectType(
            BLUEPRINT_TABLE_INPUT,
            {
              isBlueprintTable: true,
            },
            () => ({
              description:
                'A table definition within a blueprint. Specifies the table reference, name, and an array of typed nodes.',
            }),
            'BlueprintTypesPlugin: BlueprintTableInput',
          );

          // 5. Register BlueprintDefinitionInput
          build.registerInputObjectType(
            BLUEPRINT_DEFINITION_INPUT,
            {
              isBlueprintDefinition: true,
            },
            () => ({
              description:
                'The complete blueprint definition. Contains tables with typed nodes and relations.',
            }),
            'BlueprintTypesPlugin: BlueprintDefinitionInput',
          );

          return _;
        },

        /**
         * Populate fields on the registered blueprint input types.
         * Uses scope flags set during init to identify each type.
         */
        GraphQLInputObjectType_fields(fields, build, context) {
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

            // If schema has properties, add them as fields
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
                  'BlueprintTypesPlugin: ' + blueprintNodeTypeName + '.' + fieldName,
                );
              }
              return result;
            }

            // Empty params type -- add a placeholder
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
              'BlueprintTypesPlugin: ' + blueprintNodeTypeName + '._',
            );
          }

          // --- BlueprintNodeInput (@oneOf with all non-relation node types) ---
          if (isBlueprintOneOf && !isBlueprintRelation) {
            let result = fields;

            // Add shorthand field
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
              'BlueprintTypesPlugin: BlueprintNodeInput.shorthand',
            );

            // Add each non-relation node type as a field
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
                'BlueprintTypesPlugin: BlueprintNodeInput.' + nt.name,
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
                'BlueprintTypesPlugin: BlueprintRelationInput.' + nt.name,
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
              'BlueprintTypesPlugin: BlueprintTableInput fields',
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
              'BlueprintTypesPlugin: BlueprintDefinitionInput fields',
            );
          }

          return fields;
        },
      },
    },
  };
}

// ============================================================================
// Preset factory
// ============================================================================

/**
 * Creates a preset that includes the BlueprintTypes plugin.
 *
 * @param nodeTypes - Node type registry entries to generate types from.
 *   In production, these come from querying node_type_registry at build time.
 *   For testing, pass them directly.
 */
export function BlueprintTypesPreset(
  nodeTypes: NodeTypeRegistryEntry[],
): GraphileConfig.Preset {
  return {
    plugins: [createBlueprintTypesPlugin(nodeTypes)],
  };
}
