/**
 * TypeScript namespace augmentations for graphile-connection-filter.
 *
 * These extend the Graphile type system so that our custom inflection methods,
 * build properties, scope properties, schema options, and behaviors are
 * recognized by the TypeScript compiler.
 */

import 'graphile-build';
import 'graphile-build-pg';
import type { ConnectionFilterOperatorSpec, ConnectionFilterOperatorsDigest, PgConnectionFilterOperatorsScope } from './types';

declare global {
  namespace GraphileBuild {
    interface Inflection {
      /** Filter type name for a table, e.g. "UserFilter" */
      filterType(this: Inflection, typeName: string): string;
      /** Filter field type name for a scalar, e.g. "StringFilter" */
      filterFieldType(this: Inflection, typeName: string): string;
      /** Filter field list type name for an array scalar, e.g. "StringListFilter" */
      filterFieldListType(this: Inflection, typeName: string): string;
    }

    interface Build {
      /** Returns the operator digest for a given codec, or null if not filterable */
      connectionFilterOperatorsDigest(codec: any): ConnectionFilterOperatorsDigest | null;
      /** Escapes LIKE wildcard characters (% and _) */
      escapeLikeWildcards(input: unknown): string;
      /** Registers a custom filter operator (used by satellite plugins) */
      addConnectionFilterOperator(
        typeNameOrNames: string | string[],
        filterName: string,
        spec: ConnectionFilterOperatorSpec
      ): void;
      /** Internal filter operator registry keyed by filter type name */
      [key: symbol]: any;
    }

    interface ScopeInputObject {
      /** True if this is a table-level connection filter type (e.g. UserFilter) */
      isPgConnectionFilter?: boolean;
      /** Operator type scope data (present on scalar filter types like StringFilter) */
      pgConnectionFilterOperators?: PgConnectionFilterOperatorsScope;
    }

    interface ScopeInputObjectFieldsField {
      /** True if this field is an attribute-based filter field */
      isPgConnectionFilterField?: boolean;
      /** True if this field is a filter operator (e.g. equalTo, lessThan) */
      isPgConnectionFilterOperator?: boolean;
      /** True if this field is a logical operator (and/or/not) */
      isPgConnectionFilterOperatorLogical?: boolean;
      /** True if this is a many-relation filter field */
      isPgConnectionFilterManyField?: boolean;
    }

    interface BehaviorStrings {
      filter: true;
      filterProc: true;
      'attribute:filterBy': true;
    }

    interface SchemaOptions {
      connectionFilterArrays?: boolean;
      connectionFilterLogicalOperators?: boolean;
      connectionFilterAllowNullInput?: boolean;
      connectionFilterAllowEmptyObjectInput?: boolean;
      connectionFilterAllowedFieldTypes?: string[];
      connectionFilterAllowedOperators?: string[];
      connectionFilterOperatorNames?: Record<string, string>;
      connectionFilterSetofFunctions?: boolean;
      connectionFilterComputedColumns?: boolean;
      connectionFilterRelations?: boolean;
    }
  }

  namespace GraphileConfig {
    interface Plugins {
      ConnectionFilterInflectionPlugin: true;
      ConnectionFilterTypesPlugin: true;
      ConnectionFilterArgPlugin: true;
      ConnectionFilterAttributesPlugin: true;
      ConnectionFilterOperatorsPlugin: true;
      ConnectionFilterCustomOperatorsPlugin: true;
      ConnectionFilterLogicalOperatorsPlugin: true;
      ConnectionFilterComputedAttributesPlugin: true;
    }
  }
}
