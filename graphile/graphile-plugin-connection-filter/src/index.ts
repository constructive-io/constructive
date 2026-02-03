import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-build';

// Import interfaces
import { $$filters } from './interfaces';
import type { OperatorsCategory } from './interfaces';

// Import the full PgConnectionArgFilterPlugin implementation
import { PgConnectionArgFilterPlugin } from './PgConnectionArgFilterPlugin';

// Import the full PgConnectionArgFilterAttributesPlugin implementation
import { PgConnectionArgFilterAttributesPlugin } from './PgConnectionArgFilterAttributesPlugin';

// Import the full PgConnectionArgFilterComputedAttributesPlugin implementation
import { PgConnectionArgFilterComputedAttributesPlugin } from './PgConnectionArgFilterComputedAttributesPlugin';

// Import the full PgConnectionArgFilterCompositeTypeAttributesPlugin implementation
import { PgConnectionArgFilterCompositeTypeAttributesPlugin } from './PgConnectionArgFilterCompositeTypeAttributesPlugin';

// Import the full PgConnectionArgFilterBackwardRelationsPlugin implementation
import { PgConnectionArgFilterBackwardRelationsPlugin } from './PgConnectionArgFilterBackwardRelationsPlugin';

// Import the full PgConnectionArgFilterForwardRelationsPlugin implementation
import { PgConnectionArgFilterForwardRelationsPlugin } from './PgConnectionArgFilterForwardRelationsPlugin';

// Import the full PgConnectionArgFilterRecordFunctionsPlugin implementation
import { PgConnectionArgFilterRecordFunctionsPlugin } from './PgConnectionArgFilterRecordFunctionsPlugin';

// Import the full PgConnectionArgFilterLogicalOperatorsPlugin implementation
import { PgConnectionArgFilterLogicalOperatorsPlugin } from './PgConnectionArgFilterLogicalOperatorsPlugin';

// Re-export types from types.ts
export type {
  OperatorSpec,
  OperatorsCategory,
  ConnectionFilterOptions,
  ConnectionFilterConfig,
  ConnectionFilterOperatorsDigest,
  MakeApplyFromOperatorSpec,
} from './types';

// Re-export interfaces
export { $$filters };

// Re-export PgConnectionArgFilterPlugin
export { PgConnectionArgFilterPlugin };

// Re-export PgConnectionArgFilterAttributesPlugin
export { PgConnectionArgFilterAttributesPlugin };

// Re-export PgConnectionArgFilterComputedAttributesPlugin
export { PgConnectionArgFilterComputedAttributesPlugin };

// Re-export PgConnectionArgFilterCompositeTypeAttributesPlugin
export { PgConnectionArgFilterCompositeTypeAttributesPlugin };

// Re-export PgConnectionArgFilterBackwardRelationsPlugin
export { PgConnectionArgFilterBackwardRelationsPlugin };

// Re-export PgConnectionArgFilterForwardRelationsPlugin
export { PgConnectionArgFilterForwardRelationsPlugin };

// Re-export PgConnectionArgFilterRecordFunctionsPlugin
export { PgConnectionArgFilterRecordFunctionsPlugin };

// Re-export PgConnectionArgFilterLogicalOperatorsPlugin
export { PgConnectionArgFilterLogicalOperatorsPlugin };

// Type augmentation for module declarations
import type { PgResource, PgCodec, PgCodecAttribute } from '@dataplan/pg';
import type { SQL } from 'pg-sql2';
import type { GraphQLInputType, GraphQLOutputType } from 'graphql';
import type { OperatorSpec } from './types';

// Augment DataplanPg namespace for PgCondition extensions
declare global {
  namespace DataplanPg {
    interface PgConditionExtensions {
      pgFilterAttribute?:
        | {
            fieldName: string;
            attributeName: string;
            attribute: PgCodecAttribute;
            codec?: never;
            expression?: never;
          }
        | /** The incoming alias _is_ the column */ {
            fieldName?: string;
            attributeName?: never;
            attribute?: never;
            codec: PgCodec<any, any, any, any, any, any, any>;
            expression?: SQL;
          };
      pgFilterRelation?: {
        tableExpression: SQL;
        alias?: string;
        localAttributes: string[];
        remoteAttributes: string[];
      };
    }
  }
}

// Augment GraphileBuild namespace
declare global {
  namespace GraphileBuild {
    interface SchemaOptions {
      connectionFilterAllowedOperators?: string[];
      connectionFilterAllowedFieldTypes?: string[];
      connectionFilterArrays?: boolean;
      connectionFilterComputedColumns?: boolean;
      connectionFilterOperatorNames?: Record<string, string>;
      connectionFilterRelations?: boolean;
      connectionFilterSetofFunctions?: boolean;
      connectionFilterLogicalOperators?: boolean;
      connectionFilterAllowNullInput?: boolean;
      connectionFilterAllowEmptyObjectInput?: boolean;
      pgIgnoreReferentialIntegrity?: boolean;
    }

    interface Inflection {
      filterType(this: Inflection, typeName: string): string;
      filterFieldType(this: Inflection, typeName: string): string;
      filterFieldListType(this: Inflection, typeName: string): string;
      filterManyType(
        this: Inflection,
        table: PgCodec<any, any, any, any, any, any, any>,
        foreignTable: PgResource<any, any, any, any>
      ): string;
      filterBackwardSingleRelationExistsFieldName(
        this: Inflection,
        relationFieldName: string
      ): string;
      filterBackwardManyRelationExistsFieldName(
        this: Inflection,
        relationFieldName: string
      ): string;
      filterSingleRelationByKeysBackwardsFieldName(
        this: Inflection,
        fieldName: string
      ): string;
      filterManyRelationByKeysFieldName(
        this: Inflection,
        fieldName: string
      ): string;
      filterForwardRelationExistsFieldName(relationFieldName: string): string;
      filterSingleRelationFieldName(fieldName: string): string;
    }

    interface ScopeInputObject {
      isPgConnectionFilter?: boolean;
      pgConnectionFilterOperators?: {
        isList: boolean;
        pgCodecs: ReadonlyArray<PgCodec<any, any, any, any, any, any, any>>;
        inputTypeName: string;
        rangeElementInputTypeName: string | null;
        domainBaseTypeName: string | null;
      };
      pgConnectionFilterOperatorsCategory?: OperatorsCategory;
      fieldType?: GraphQLOutputType;
      fieldInputType?: GraphQLInputType;
      rangeElementInputType?: GraphQLInputType;
      domainBaseType?: GraphQLOutputType;
      foreignTable?: PgResource<any, any, any, any>;
      isPgConnectionFilterMany?: boolean;
    }

    interface Build {
      connectionFilterOperatorsDigest(
        codec: PgCodec<any, any, any, any, any, any, any>
      ): {
        operatorsTypeName: string;
        relatedTypeName: string;
        isList: boolean;
        inputTypeName: string;
        rangeElementInputTypeName: string | null;
        domainBaseTypeName: string | null;
      } | null;
      escapeLikeWildcards(input: unknown): string;
      [$$filters]: Map<string, Map<string, OperatorSpec>>;
      addConnectionFilterOperator(
        typeName: string | string[],
        filterName: string,
        spec: OperatorSpec
      ): void;
    }

    interface ScopeInputObjectFieldsField {
      isPgConnectionFilterField?: boolean;
      isPgConnectionFilterManyField?: boolean;
      isPgConnectionFilterOperatorLogical?: boolean;
      isPgConnectionFilterOperator?: boolean;
    }
  }
}

// =============================================================================
// Plugin Definitions (v5 format)
// =============================================================================

// Read version from package.json at runtime
const version = '4.0.0';

/**
 * ConnectionArgFilterPlugin - Provides inflection methods for filter types
 */
export const ConnectionArgFilterPlugin: GraphileConfig.Plugin = {
  name: 'PostGraphileConnectionFilter_ConnectionArgFilterPlugin',
  version,
  inflection: {
    add: {
      filterType(_preset, typeName: string) {
        return `${typeName}Filter`;
      },
      filterFieldType(_preset, typeName: string) {
        return `${typeName}Filter`;
      },
      filterFieldListType(_preset, typeName: string) {
        return `${typeName}ListFilter`;
      },
    },
  },
};

/**
 * Placeholder plugins - These will be implemented in subsequent migration steps.
 * Each plugin follows the v5 pattern: { name, version, schema: { hooks: {} } }
 */

// PgConnectionArgFilterAttributesPlugin is imported from its own file above
// PgConnectionArgFilterComputedAttributesPlugin is imported from its own file above
// PgConnectionArgFilterCompositeTypeAttributesPlugin is imported from its own file above
// PgConnectionArgFilterBackwardRelationsPlugin is imported from its own file above
// PgConnectionArgFilterForwardRelationsPlugin is imported from its own file above
// PgConnectionArgFilterRecordFunctionsPlugin is imported from its own file above
// PgConnectionArgFilterLogicalOperatorsPlugin is imported from its own file above

export const PgConnectionArgFilterOperatorsPlugin: GraphileConfig.Plugin = {
  name: 'PgConnectionArgFilterOperatorsPlugin',
  version,
  // TODO: Implement core operators
};

export const AddConnectionFilterOperatorPlugin: GraphileConfig.Plugin = {
  name: 'AddConnectionFilterOperatorPlugin',
  version,
  schema: {
    hooks: {
      build(build) {
        const { inflection } = build;
        build[$$filters] = new Map();
        build.addConnectionFilterOperator = (
          typeNameOrNames: string | string[],
          filterName: string,
          spec: OperatorSpec
        ) => {
          if (
            !build.status.isBuildPhaseComplete ||
            build.status.isInitPhaseComplete
          ) {
            throw new Error(
              `addConnectionFilterOperator may only be called during the 'init' phase`
            );
          }
          const typeNames = Array.isArray(typeNameOrNames)
            ? typeNameOrNames
            : [typeNameOrNames];
          for (const typeName of typeNames) {
            const filterTypeName = inflection.filterType(typeName);
            let operatorSpecByFilterName = build[$$filters].get(filterTypeName);
            if (!operatorSpecByFilterName) {
              operatorSpecByFilterName = new Map();
              build[$$filters].set(filterTypeName, operatorSpecByFilterName);
            }
            if (operatorSpecByFilterName.has(filterName)) {
              throw new Error(
                `Filter '${filterName}' already registered on '${filterTypeName}'`
              );
            }
            operatorSpecByFilterName.set(filterName, spec);
          }
        };
        return build;
      },
    },
  },
};

/**
 * Placeholder for makeApplyFromOperatorSpec utility function.
 * This will be implemented when PgConnectionArgFilterOperatorsPlugin is migrated.
 */
export function makeApplyFromOperatorSpec(
  _build: GraphileBuild.Build,
  _typeName: string,
  _fieldName: string,
  _spec: OperatorSpec,
  _type: GraphQLInputType
): any {
  // TODO: Implement when migrating PgConnectionArgFilterOperatorsPlugin
  throw new Error('makeApplyFromOperatorSpec not yet implemented for v5');
}

// =============================================================================
// Preset Export
// =============================================================================

/**
 * PostGraphile Connection Filter Preset for Graphile v5
 *
 * This preset provides advanced filtering capabilities for PostgreSQL
 * connections in PostGraphile v5. It includes plugins for:
 * - Attribute filtering
 * - Computed attribute filtering
 * - Composite type filtering
 * - Record function filtering
 * - Relation filtering (forward and backward)
 * - Logical operators (and, or, not)
 * - Standard comparison operators
 *
 * Usage:
 * ```ts
 * import { PostGraphileConnectionFilterPreset } from 'graphile-plugin-connection-filter';
 *
 * const preset: GraphileConfig.Preset = {
 *   extends: [PostGraphileConnectionFilterPreset],
 *   schema: {
 *     connectionFilterRelations: true,
 *     connectionFilterLogicalOperators: true,
 *   },
 * };
 * ```
 */
export const PostGraphileConnectionFilterPreset: GraphileConfig.Preset = {
  plugins: [
    ConnectionArgFilterPlugin,
    PgConnectionArgFilterPlugin,
    PgConnectionArgFilterAttributesPlugin,
    PgConnectionArgFilterComputedAttributesPlugin,
    PgConnectionArgFilterCompositeTypeAttributesPlugin,
    PgConnectionArgFilterRecordFunctionsPlugin,
    // Relations plugins (controlled by connectionFilterRelations option)
    PgConnectionArgFilterBackwardRelationsPlugin,
    PgConnectionArgFilterForwardRelationsPlugin,
    // Logical operators (controlled by connectionFilterLogicalOperators option)
    PgConnectionArgFilterLogicalOperatorsPlugin,
    // Core operators plugin
    PgConnectionArgFilterOperatorsPlugin,
    // Custom operator registration support
    AddConnectionFilterOperatorPlugin,
  ],
  schema: {
    // Default configuration options
    connectionFilterArrays: true,
    connectionFilterComputedColumns: true,
    connectionFilterRelations: false,
    connectionFilterSetofFunctions: true,
    connectionFilterLogicalOperators: true,
    connectionFilterAllowNullInput: false,
    connectionFilterAllowEmptyObjectInput: false,
  },
};

// Default export for convenience
export default PostGraphileConnectionFilterPreset;
