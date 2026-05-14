import '../augmentations';

import type { GraphileConfig } from 'graphile-config';

import type { BulkNamingStrategy } from '../types';

/**
 * Builds a mutation field name based on the naming strategy.
 *
 * - 'bulk': bulkCreateUser
 * - 'pluralized': createUsers
 * - 'many': createManyUsers
 */
function buildFieldName(
  inflection: any,
  verb: string,
  resourceName: string,
  naming: BulkNamingStrategy
): string {
  const typeName = inflection.upperCamelCase(resourceName);
  switch (naming) {
  case 'pluralized':
    return inflection.camelCase(`${verb}_${inflection.pluralize(resourceName)}`);
  case 'many':
    return inflection.camelCase(`${verb}_many_${inflection.pluralize(resourceName)}`);
  case 'bulk':
  default:
    return inflection.camelCase(`bulk_${verb}_${typeName}`);
  }
}

/**
 * BulkInflectionPlugin
 *
 * Adds inflection methods for naming bulk mutation types, fields, and enums.
 * Naming is configurable via the `bulkNaming` schema option.
 */
export const BulkInflectionPlugin: GraphileConfig.Plugin = {
  name: 'BulkInflectionPlugin',
  version: '0.1.0',
  description: 'Adds inflection methods for bulk mutation type naming',

  inflection: {
    add: {
      // Mutation field names — read naming from preset schema options
      bulkInsertField(_preset: any, resourceName: string): string {
        const naming = (_preset?.schema?.bulkNaming ?? 'bulk') as BulkNamingStrategy;
        return buildFieldName(this, 'create', resourceName, naming);
      },
      bulkUpsertField(_preset: any, resourceName: string): string {
        const naming = (_preset?.schema?.bulkNaming ?? 'bulk') as BulkNamingStrategy;
        return buildFieldName(this, 'upsert', resourceName, naming);
      },
      bulkUpdateField(_preset: any, resourceName: string): string {
        const naming = (_preset?.schema?.bulkNaming ?? 'bulk') as BulkNamingStrategy;
        return buildFieldName(this, 'update', resourceName, naming);
      },
      bulkDeleteField(_preset: any, resourceName: string): string {
        const naming = (_preset?.schema?.bulkNaming ?? 'bulk') as BulkNamingStrategy;
        return buildFieldName(this, 'delete', resourceName, naming);
      },

      // Payload type names
      bulkInsertPayloadType(_preset: any, typeName: string): string {
        return `BulkCreate${typeName}Payload`;
      },
      bulkUpsertPayloadType(_preset: any, typeName: string): string {
        return `BulkUpsert${typeName}Payload`;
      },
      bulkUpdatePayloadType(_preset: any, typeName: string): string {
        return `BulkUpdate${typeName}Payload`;
      },
      bulkDeletePayloadType(_preset: any, typeName: string): string {
        return `BulkDelete${typeName}Payload`;
      },

      // Input type names
      bulkInsertInputType(_preset: any, typeName: string): string {
        return `BulkCreate${typeName}Input`;
      },
      bulkUpsertInputType(_preset: any, typeName: string): string {
        return `BulkUpsert${typeName}Input`;
      },
      bulkUpdateInputType(_preset: any, typeName: string): string {
        return `BulkUpdate${typeName}Input`;
      },
      bulkDeleteInputType(_preset: any, typeName: string): string {
        return `BulkDelete${typeName}Input`;
      },

      // Per-table enum types
      uniqueConstraintEnumType(_preset: any, typeName: string): string {
        return `${typeName}UniqueConstraint`;
      },
      columnEnumType(_preset: any, typeName: string): string {
        return `${typeName}Column`;
      },

      // ON CONFLICT input types
      bulkInsertOnConflictInputType(_preset: any, typeName: string): string {
        return `BulkCreate${typeName}OnConflictInput`;
      },
      bulkUpsertOnConflictInputType(_preset: any, typeName: string): string {
        return `BulkUpsert${typeName}OnConflictInput`;
      },

      // Values item types
      bulkInsertValuesItemType(_preset: any, typeName: string): string {
        return `${typeName}BulkCreateItem`;
      },
      bulkUpsertValuesItemType(_preset: any, typeName: string): string {
        return `${typeName}BulkUpsertItem`;
      },

      // Relational nested input type names
      bulkNestedValuesItemType(
        _preset: any,
        parentTypeName: string,
        childTypeName: string
      ): string {
        return `${childTypeName}BulkNestedIn${parentTypeName}Input`;
      }
    }
  }
};
