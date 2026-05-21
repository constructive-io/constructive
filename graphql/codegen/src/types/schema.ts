/**
 * Schema metadata types are owned by @constructive-io/graphql-query.
 *
 * Codegen consumes and re-exports them so there is one Table/TableSubscription
 * contract across introspection and generation.
 */
export type {
  Argument,
  BelongsToRelation,
  ConstraintInfo,
  Field,
  FieldArgument,
  FieldType,
  ForeignKeyConstraint,
  HasManyRelation,
  HasOneRelation,
  ManyToManyRelation,
  ObjectField,
  Operation,
  Relations,
  ResolvedType,
  Table,
  TableConstraints,
  TableInflection,
  TableQueryNames,
  TableSubscription,
  TypeRef,
  TypeRegistry,
} from '@constructive-io/graphql-query';
