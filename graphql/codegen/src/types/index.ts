/**
 * Type exports for @constructive-io/graphql-codegen
 */

// Schema types
export type {
  CleanBelongsToRelation,
  CleanField,
  CleanFieldType,
  CleanHasManyRelation,
  CleanHasOneRelation,
  CleanManyToManyRelation,
  CleanRelations,
  CleanTable,
  ConstraintInfo,
  ForeignKeyConstraint,
  TableConstraints,
  TableInflection,
  TableQueryNames
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
  RelationalFilter
} from './query';

// Mutation types
export type {
  CreateInput,
  DeleteInput,
  MutationOptions,
  MutationResult,
  UpdateInput
} from './mutation';

// Selection types
export type {
  FieldSelection,
  FieldSelectionPreset,
  SelectionOptions,
  SimpleFieldSelection
} from './selection';

// Config types
export type {
  GraphQLSDKConfig,
  GraphQLSDKConfigTarget
} from './config';
export {
  DEFAULT_CONFIG,
  defineConfig,
  getConfigOptions,
  mergeConfig
} from './config';
