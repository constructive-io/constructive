/**
 * Type exports for @constructive-io/graphql-codegen
 */

// Schema types
export type {
  BelongsToRelation,
  ConstraintInfo,
  Field,
  FieldType,
  ForeignKeyConstraint,
  HasManyRelation,
  HasOneRelation,
  ManyToManyRelation,
  Relations,
  Table,
  TableConstraints,
  TableInflection,
  TableQueryNames,
} from './schema';

// Query types
export type {
  ConnectionResult,
  FieldFilter,
  Filter,
  FilterOperator,
  OrderByItem,
  PageInfo,
  QueryOptions,
  RelationalFilter,
} from './query';

// Mutation types
export type {
  CreateInput,
  DeleteInput,
  MutationOptions,
  MutationResult,
  UpdateInput,
} from './mutation';

// Selection types
export type {
  FieldSelection,
  FieldSelectionPreset,
  SelectionOptions,
  SimpleFieldSelection,
} from './selection';

// Config types
export type {
  GraphQLSDKConfig,
  GraphQLSDKConfigTarget,
  GraphQLSDKMultiConfig,
  SchemaConfig,
} from './config';
export {
  DEFAULT_CONFIG,
  defineConfig,
  getConfigOptions,
  mergeConfig,
} from './config';
