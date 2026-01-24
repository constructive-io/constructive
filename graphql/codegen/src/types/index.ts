/**
 * Type exports for @constructive-io/graphql-codegen
 */

// Schema types
export type {
  CleanTable,
  CleanField,
  CleanFieldType,
  CleanRelations,
  CleanBelongsToRelation,
  CleanHasOneRelation,
  CleanHasManyRelation,
  CleanManyToManyRelation,
  TableInflection,
  TableQueryNames,
  TableConstraints,
  ConstraintInfo,
  ForeignKeyConstraint,
} from './schema';

// Query types
export type {
  PageInfo,
  ConnectionResult,
  QueryOptions,
  OrderByItem,
  FilterOperator,
  FieldFilter,
  RelationalFilter,
  Filter,
} from './query';

// Mutation types
export type {
  MutationOptions,
  CreateInput,
  UpdateInput,
  DeleteInput,
  MutationResult,
} from './mutation';

// Selection types
export type {
  SimpleFieldSelection,
  FieldSelectionPreset,
  FieldSelection,
  SelectionOptions,
} from './selection';

// Config types
export type {
  GraphQLSDKConfig,
  GraphQLSDKConfigTarget,
  GraphQLSDKMultiConfig,
} from './config';

export {
  defineConfig,
  getConfigOptions,
  mergeConfig,
  isMultiConfig,
  DEFAULT_CONFIG,
} from './config';
