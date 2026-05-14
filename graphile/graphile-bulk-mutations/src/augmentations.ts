/**
 * TypeScript namespace augmentations for graphile-bulk-mutations.
 *
 * Extends the Graphile type system so that custom inflection methods,
 * build properties, scope properties, schema options, and behaviors
 * are recognized by the TypeScript compiler.
 */

import 'graphile-build';
import 'graphile-build-pg';

import type { BulkNamingStrategy } from './types';

declare global {
  namespace GraphileBuild {
    interface Inflection {
      /** Bulk insert mutation name, e.g. "bulkCreateUser" */
      bulkInsertField(this: Inflection, resourceName: string): string;
      /** Bulk upsert mutation name, e.g. "bulkUpsertUser" */
      bulkUpsertField(this: Inflection, resourceName: string): string;
      /** Bulk update mutation name, e.g. "bulkUpdateUser" */
      bulkUpdateField(this: Inflection, resourceName: string): string;
      /** Bulk delete mutation name, e.g. "bulkDeleteUser" */
      bulkDeleteField(this: Inflection, resourceName: string): string;
      /** Payload type name, e.g. "BulkCreateUserPayload" */
      bulkInsertPayloadType(this: Inflection, typeName: string): string;
      /** Payload type name, e.g. "BulkUpsertUserPayload" */
      bulkUpsertPayloadType(this: Inflection, typeName: string): string;
      /** Payload type name, e.g. "BulkUpdateUserPayload" */
      bulkUpdatePayloadType(this: Inflection, typeName: string): string;
      /** Payload type name, e.g. "BulkDeleteUserPayload" */
      bulkDeletePayloadType(this: Inflection, typeName: string): string;
      /** Input type for bulk create values, e.g. "BulkCreateUserInput" */
      bulkInsertInputType(this: Inflection, typeName: string): string;
      /** Input type for bulk upsert values, e.g. "BulkUpsertUserInput" */
      bulkUpsertInputType(this: Inflection, typeName: string): string;
      /** Input type for bulk update, e.g. "BulkUpdateUserInput" */
      bulkUpdateInputType(this: Inflection, typeName: string): string;
      /** Input type for bulk delete, e.g. "BulkDeleteUserInput" */
      bulkDeleteInputType(this: Inflection, typeName: string): string;
      /** Per-table unique constraint enum, e.g. "UserUniqueConstraint" */
      uniqueConstraintEnumType(this: Inflection, typeName: string): string;
      /** Per-table column enum, e.g. "UserColumn" */
      columnEnumType(this: Inflection, typeName: string): string;
      /** ON CONFLICT input for insert, e.g. "BulkCreateUserOnConflictInput" */
      bulkInsertOnConflictInputType(this: Inflection, typeName: string): string;
      /** ON CONFLICT input for upsert, e.g. "BulkUpsertUserOnConflictInput" */
      bulkUpsertOnConflictInputType(this: Inflection, typeName: string): string;
      /** Values item input type, e.g. "UserBulkCreateItem" */
      bulkInsertValuesItemType(this: Inflection, typeName: string): string;
      /** Values item input type for upsert, e.g. "UserBulkUpsertItem" */
      bulkUpsertValuesItemType(this: Inflection, typeName: string): string;
      /** Nested values item type for relational inserts */
      bulkNestedValuesItemType(
        this: Inflection,
        parentTypeName: string,
        childTypeName: string
      ): string;
    }

    interface BehaviorStrings {
      bulkInsert: true;
      bulkUpsert: true;
      bulkUpdate: true;
      bulkDelete: true;
    }

    interface ScopeEnum {
      isBulkMutationConstraintEnum?: boolean;
      isBulkMutationColumnEnum?: boolean;
    }

    interface ScopeObject {
      isBulkMutationPayload?: boolean;
    }

    interface ScopeObjectFieldsField {
      isBulkMutationPayloadReturningField?: boolean;
      isBulkMutationPayloadAffectedCountField?: boolean;
    }

    interface ScopeInputObject {
      isBulkMutationInput?: boolean;
      isBulkMutationOnConflictInput?: boolean;
      isBulkMutationValuesItem?: boolean;
      isBulkRelationalNestedInput?: boolean;
      /** Resource name for relation discovery in BulkRelationalPlugin */
      bulkMutationResourceName?: string;
    }

    interface SchemaOptions {
      bulkNaming?: BulkNamingStrategy;
      bulkInsert?: boolean;
      bulkUpsert?: boolean;
      bulkUpdate?: boolean;
      bulkDelete?: boolean;
      bulkRelational?: boolean;
      bulkReturning?: boolean;
      bulkMaxRows?: number;
      bulkMaxNestingDepth?: number;
      bulkRequireWhere?: boolean;
    }
  }

  namespace GraphileConfig {
    interface Plugins {
      BulkInflectionPlugin: true;
      BulkTypesPlugin: true;
      BulkInsertPlugin: true;
      BulkUpsertPlugin: true;
      BulkUpdatePlugin: true;
      BulkDeletePlugin: true;
      BulkRelationalPlugin: true;
    }
  }
}
