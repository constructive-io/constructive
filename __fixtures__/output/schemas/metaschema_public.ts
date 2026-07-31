import { Timestamp,UUID } from './_common';
export interface CheckConstraint {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string | null;
  type: string | null;
  field_ids: any;
  expr: any | null;
  smart_tags: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class CheckConstraint implements CheckConstraint {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string | null;
  type: string | null;
  field_ids: any;
  expr: any | null;
  smart_tags: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: CheckConstraint) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.name = data.name;
    this.type = data.type;
    this.field_ids = data.field_ids;
    this.expr = data.expr;
    this.smart_tags = data.smart_tags;
    this.category = data.category;
    this.tags = data.tags;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface CompositeType {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  name: string;
  label: string | null;
  description: string | null;
  attributes: any;
  smart_tags: any | null;
  category: any;
  tags: any;
}
export class CompositeType implements CompositeType {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  name: string;
  label: string | null;
  description: string | null;
  attributes: any;
  smart_tags: any | null;
  category: any;
  tags: any;
  constructor(data: CompositeType) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.schema_id = data.schema_id;
    this.name = data.name;
    this.label = data.label;
    this.description = data.description;
    this.attributes = data.attributes;
    this.smart_tags = data.smart_tags;
    this.category = data.category;
    this.tags = data.tags;
  }
}
export interface Database {
  id: UUID;
  owner_id: UUID | null;
  schema_hash: string | null;
  name: string | null;
  label: string | null;
  hash: UUID | null;
  platform: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class Database implements Database {
  id: UUID;
  owner_id: UUID | null;
  schema_hash: string | null;
  name: string | null;
  label: string | null;
  hash: UUID | null;
  platform: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: Database) {
    this.id = data.id;
    this.owner_id = data.owner_id;
    this.schema_hash = data.schema_hash;
    this.name = data.name;
    this.label = data.label;
    this.hash = data.hash;
    this.platform = data.platform;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface DefaultPrivilege {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  object_type: string;
  privilege: string;
  grantee_name: string;
  is_grant: boolean;
}
export class DefaultPrivilege implements DefaultPrivilege {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  object_type: string;
  privilege: string;
  grantee_name: string;
  is_grant: boolean;
  constructor(data: DefaultPrivilege) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.schema_id = data.schema_id;
    this.object_type = data.object_type;
    this.privilege = data.privilege;
    this.grantee_name = data.grantee_name;
    this.is_grant = data.is_grant;
  }
}
export interface EmbeddingChunks {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  embedding_field_id: UUID | null;
  chunks_table_id: UUID | null;
  chunks_table_name: string | null;
  content_field_name: string;
  dimensions: number;
  metric: string;
  chunk_size: number;
  chunk_overlap: number;
  chunk_strategy: string;
  metadata_fields: any | null;
  search_indexes: any | null;
  enqueue_chunking_job: boolean;
  chunking_task_name: string;
  embedding_model: string | null;
  embedding_provider: string | null;
  parent_fk_field_id: UUID | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class EmbeddingChunks implements EmbeddingChunks {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  embedding_field_id: UUID | null;
  chunks_table_id: UUID | null;
  chunks_table_name: string | null;
  content_field_name: string;
  dimensions: number;
  metric: string;
  chunk_size: number;
  chunk_overlap: number;
  chunk_strategy: string;
  metadata_fields: any | null;
  search_indexes: any | null;
  enqueue_chunking_job: boolean;
  chunking_task_name: string;
  embedding_model: string | null;
  embedding_provider: string | null;
  parent_fk_field_id: UUID | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: EmbeddingChunks) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.embedding_field_id = data.embedding_field_id;
    this.chunks_table_id = data.chunks_table_id;
    this.chunks_table_name = data.chunks_table_name;
    this.content_field_name = data.content_field_name;
    this.dimensions = data.dimensions;
    this.metric = data.metric;
    this.chunk_size = data.chunk_size;
    this.chunk_overlap = data.chunk_overlap;
    this.chunk_strategy = data.chunk_strategy;
    this.metadata_fields = data.metadata_fields;
    this.search_indexes = data.search_indexes;
    this.enqueue_chunking_job = data.enqueue_chunking_job;
    this.chunking_task_name = data.chunking_task_name;
    this.embedding_model = data.embedding_model;
    this.embedding_provider = data.embedding_provider;
    this.parent_fk_field_id = data.parent_fk_field_id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface Enum {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  name: string;
  label: string | null;
  description: string | null;
  values: any;
  smart_tags: any | null;
  category: any;
  tags: any;
}
export class Enum implements Enum {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  name: string;
  label: string | null;
  description: string | null;
  values: any;
  smart_tags: any | null;
  category: any;
  tags: any;
  constructor(data: Enum) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.schema_id = data.schema_id;
    this.name = data.name;
    this.label = data.label;
    this.description = data.description;
    this.values = data.values;
    this.smart_tags = data.smart_tags;
    this.category = data.category;
    this.tags = data.tags;
  }
}
export interface Field {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string;
  label: string | null;
  description: string | null;
  smart_tags: any | null;
  is_required: boolean;
  api_required: boolean;
  default_value: any | null;
  generation_expression: any | null;
  generation_type: string | null;
  type: any;
  field_order: number;
  regexp: string | null;
  chk: any | null;
  chk_expr: any | null;
  min: any | null;
  max: any | null;
  tags: any;
  category: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class Field implements Field {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string;
  label: string | null;
  description: string | null;
  smart_tags: any | null;
  is_required: boolean;
  api_required: boolean;
  default_value: any | null;
  generation_expression: any | null;
  generation_type: string | null;
  type: any;
  field_order: number;
  regexp: string | null;
  chk: any | null;
  chk_expr: any | null;
  min: any | null;
  max: any | null;
  tags: any;
  category: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: Field) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.name = data.name;
    this.label = data.label;
    this.description = data.description;
    this.smart_tags = data.smart_tags;
    this.is_required = data.is_required;
    this.api_required = data.api_required;
    this.default_value = data.default_value;
    this.generation_expression = data.generation_expression;
    this.generation_type = data.generation_type;
    this.type = data.type;
    this.field_order = data.field_order;
    this.regexp = data.regexp;
    this.chk = data.chk;
    this.chk_expr = data.chk_expr;
    this.min = data.min;
    this.max = data.max;
    this.tags = data.tags;
    this.category = data.category;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface ForeignKeyConstraint {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string | null;
  description: string | null;
  smart_tags: any | null;
  type: string | null;
  field_ids: any;
  ref_table_id: UUID;
  ref_field_ids: any;
  delete_action: any | null;
  update_action: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class ForeignKeyConstraint implements ForeignKeyConstraint {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string | null;
  description: string | null;
  smart_tags: any | null;
  type: string | null;
  field_ids: any;
  ref_table_id: UUID;
  ref_field_ids: any;
  delete_action: any | null;
  update_action: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: ForeignKeyConstraint) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.name = data.name;
    this.description = data.description;
    this.smart_tags = data.smart_tags;
    this.type = data.type;
    this.field_ids = data.field_ids;
    this.ref_table_id = data.ref_table_id;
    this.ref_field_ids = data.ref_field_ids;
    this.delete_action = data.delete_action;
    this.update_action = data.update_action;
    this.category = data.category;
    this.tags = data.tags;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface FullTextSearch {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  field_id: UUID;
  field_ids: any;
  weights: any;
  langs: any;
  lang_column: string | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class FullTextSearch implements FullTextSearch {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  field_id: UUID;
  field_ids: any;
  weights: any;
  langs: any;
  lang_column: string | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: FullTextSearch) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.field_id = data.field_id;
    this.field_ids = data.field_ids;
    this.weights = data.weights;
    this.langs = data.langs;
    this.lang_column = data.lang_column;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface Function {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  name: string;
}
export class Function implements Function {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  name: string;
  constructor(data: Function) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.schema_id = data.schema_id;
    this.name = data.name;
  }
}
export interface Index {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string;
  field_ids: any | null;
  include_field_ids: any | null;
  access_method: string;
  index_params: any | null;
  where_clause: any | null;
  is_unique: boolean;
  options: any | null;
  op_classes: any | null;
  smart_tags: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class Index implements Index {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string;
  field_ids: any | null;
  include_field_ids: any | null;
  access_method: string;
  index_params: any | null;
  where_clause: any | null;
  is_unique: boolean;
  options: any | null;
  op_classes: any | null;
  smart_tags: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: Index) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.name = data.name;
    this.field_ids = data.field_ids;
    this.include_field_ids = data.include_field_ids;
    this.access_method = data.access_method;
    this.index_params = data.index_params;
    this.where_clause = data.where_clause;
    this.is_unique = data.is_unique;
    this.options = data.options;
    this.op_classes = data.op_classes;
    this.smart_tags = data.smart_tags;
    this.category = data.category;
    this.tags = data.tags;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface NodeTypeRegistry {
  name: string;
  slug: string;
  category: string;
  display_name: string | null;
  description: string | null;
  parameter_schema: any;
  tags: any;
}
export class NodeTypeRegistry implements NodeTypeRegistry {
  name: string;
  slug: string;
  category: string;
  display_name: string | null;
  description: string | null;
  parameter_schema: any;
  tags: any;
  constructor(data: NodeTypeRegistry) {
    this.name = data.name;
    this.slug = data.slug;
    this.category = data.category;
    this.display_name = data.display_name;
    this.description = data.description;
    this.parameter_schema = data.parameter_schema;
    this.tags = data.tags;
  }
}
export interface Partition {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  strategy: string;
  partition_key_id: UUID;
  interval: string | null;
  retention: string | null;
  retention_keep_table: boolean;
  premake: number;
  naming_pattern: string;
  is_parented: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class Partition implements Partition {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  strategy: string;
  partition_key_id: UUID;
  interval: string | null;
  retention: string | null;
  retention_keep_table: boolean;
  premake: number;
  naming_pattern: string;
  is_parented: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: Partition) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.strategy = data.strategy;
    this.partition_key_id = data.partition_key_id;
    this.interval = data.interval;
    this.retention = data.retention;
    this.retention_keep_table = data.retention_keep_table;
    this.premake = data.premake;
    this.naming_pattern = data.naming_pattern;
    this.is_parented = data.is_parented;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface Policy {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string | null;
  grantee_name: string | null;
  privilege: string | null;
  permissive: boolean | null;
  disabled: boolean | null;
  policy_type: string | null;
  data: any | null;
  with_check: any | null;
  smart_tags: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class Policy implements Policy {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string | null;
  grantee_name: string | null;
  privilege: string | null;
  permissive: boolean | null;
  disabled: boolean | null;
  policy_type: string | null;
  data: any | null;
  with_check: any | null;
  smart_tags: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: Policy) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.name = data.name;
    this.grantee_name = data.grantee_name;
    this.privilege = data.privilege;
    this.permissive = data.permissive;
    this.disabled = data.disabled;
    this.policy_type = data.policy_type;
    this.data = data.data;
    this.with_check = data.with_check;
    this.smart_tags = data.smart_tags;
    this.category = data.category;
    this.tags = data.tags;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface PrimaryKeyConstraint {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string | null;
  type: string | null;
  field_ids: any;
  smart_tags: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class PrimaryKeyConstraint implements PrimaryKeyConstraint {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string | null;
  type: string | null;
  field_ids: any;
  smart_tags: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: PrimaryKeyConstraint) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.name = data.name;
    this.type = data.type;
    this.field_ids = data.field_ids;
    this.smart_tags = data.smart_tags;
    this.category = data.category;
    this.tags = data.tags;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface Schema {
  id: UUID;
  database_id: UUID;
  name: string;
  schema_name: string;
  label: string | null;
  description: string | null;
  smart_tags: any | null;
  category: any;
  tags: any;
  is_public: boolean;
  api_exposure: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class Schema implements Schema {
  id: UUID;
  database_id: UUID;
  name: string;
  schema_name: string;
  label: string | null;
  description: string | null;
  smart_tags: any | null;
  category: any;
  tags: any;
  is_public: boolean;
  api_exposure: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: Schema) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.name = data.name;
    this.schema_name = data.schema_name;
    this.label = data.label;
    this.description = data.description;
    this.smart_tags = data.smart_tags;
    this.category = data.category;
    this.tags = data.tags;
    this.is_public = data.is_public;
    this.api_exposure = data.api_exposure;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface SchemaGrant {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  grantee_name: string;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class SchemaGrant implements SchemaGrant {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  grantee_name: string;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: SchemaGrant) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.schema_id = data.schema_id;
    this.grantee_name = data.grantee_name;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface SpatialRelation {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  field_id: UUID;
  ref_table_id: UUID;
  ref_field_id: UUID;
  name: string;
  operator: string;
  param_name: string | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class SpatialRelation implements SpatialRelation {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  field_id: UUID;
  ref_table_id: UUID;
  ref_field_id: UUID;
  name: string;
  operator: string;
  param_name: string | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: SpatialRelation) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.field_id = data.field_id;
    this.ref_table_id = data.ref_table_id;
    this.ref_field_id = data.ref_field_id;
    this.name = data.name;
    this.operator = data.operator;
    this.param_name = data.param_name;
    this.category = data.category;
    this.tags = data.tags;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface Table {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  name: string;
  label: string | null;
  description: string | null;
  smart_tags: any | null;
  category: any;
  use_rls: boolean;
  timestamps: boolean;
  peoplestamps: boolean;
  plural_name: string | null;
  singular_name: string | null;
  tags: any;
  step_up: any | null;
  partitioned: boolean;
  partition_strategy: string | null;
  partition_key_names: any | null;
  partition_key_types: any | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  inherits_id: UUID | null;
}
export class Table implements Table {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  name: string;
  label: string | null;
  description: string | null;
  smart_tags: any | null;
  category: any;
  use_rls: boolean;
  timestamps: boolean;
  peoplestamps: boolean;
  plural_name: string | null;
  singular_name: string | null;
  tags: any;
  step_up: any | null;
  partitioned: boolean;
  partition_strategy: string | null;
  partition_key_names: any | null;
  partition_key_types: any | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  inherits_id: UUID | null;
  constructor(data: Table) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.schema_id = data.schema_id;
    this.name = data.name;
    this.label = data.label;
    this.description = data.description;
    this.smart_tags = data.smart_tags;
    this.category = data.category;
    this.use_rls = data.use_rls;
    this.timestamps = data.timestamps;
    this.peoplestamps = data.peoplestamps;
    this.plural_name = data.plural_name;
    this.singular_name = data.singular_name;
    this.tags = data.tags;
    this.step_up = data.step_up;
    this.partitioned = data.partitioned;
    this.partition_strategy = data.partition_strategy;
    this.partition_key_names = data.partition_key_names;
    this.partition_key_types = data.partition_key_types;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.inherits_id = data.inherits_id;
  }
}
export interface TableGrant {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  privilege: string;
  grantee_name: string;
  field_ids: any | null;
  is_grant: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class TableGrant implements TableGrant {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  privilege: string;
  grantee_name: string;
  field_ids: any | null;
  is_grant: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: TableGrant) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.privilege = data.privilege;
    this.grantee_name = data.grantee_name;
    this.field_ids = data.field_ids;
    this.is_grant = data.is_grant;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface Trigger {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string;
  event: string | null;
  function_name: string | null;
  smart_tags: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class Trigger implements Trigger {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string;
  event: string | null;
  function_name: string | null;
  smart_tags: any | null;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: Trigger) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.name = data.name;
    this.event = data.event;
    this.function_name = data.function_name;
    this.smart_tags = data.smart_tags;
    this.category = data.category;
    this.tags = data.tags;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface TriggerFunction {
  id: UUID;
  database_id: UUID;
  name: string;
  code: string | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class TriggerFunction implements TriggerFunction {
  id: UUID;
  database_id: UUID;
  name: string;
  code: string | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: TriggerFunction) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.name = data.name;
    this.code = data.code;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface UniqueConstraint {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string | null;
  description: string | null;
  smart_tags: any | null;
  type: string | null;
  field_ids: any;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class UniqueConstraint implements UniqueConstraint {
  id: UUID;
  database_id: UUID;
  table_id: UUID;
  name: string | null;
  description: string | null;
  smart_tags: any | null;
  type: string | null;
  field_ids: any;
  category: any;
  tags: any;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: UniqueConstraint) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.table_id = data.table_id;
    this.name = data.name;
    this.description = data.description;
    this.smart_tags = data.smart_tags;
    this.type = data.type;
    this.field_ids = data.field_ids;
    this.category = data.category;
    this.tags = data.tags;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface View {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  name: string;
  table_id: UUID | null;
  view_type: string;
  data: any | null;
  filter_type: string | null;
  filter_data: any | null;
  security_invoker: boolean | null;
  is_read_only: boolean | null;
  smart_tags: any | null;
  category: any;
  tags: any;
}
export class View implements View {
  id: UUID;
  database_id: UUID;
  schema_id: UUID;
  name: string;
  table_id: UUID | null;
  view_type: string;
  data: any | null;
  filter_type: string | null;
  filter_data: any | null;
  security_invoker: boolean | null;
  is_read_only: boolean | null;
  smart_tags: any | null;
  category: any;
  tags: any;
  constructor(data: View) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.schema_id = data.schema_id;
    this.name = data.name;
    this.table_id = data.table_id;
    this.view_type = data.view_type;
    this.data = data.data;
    this.filter_type = data.filter_type;
    this.filter_data = data.filter_data;
    this.security_invoker = data.security_invoker;
    this.is_read_only = data.is_read_only;
    this.smart_tags = data.smart_tags;
    this.category = data.category;
    this.tags = data.tags;
  }
}
export interface ViewGrant {
  id: UUID;
  database_id: UUID;
  view_id: UUID;
  grantee_name: string;
  privilege: string;
  with_grant_option: boolean | null;
  is_grant: boolean;
}
export class ViewGrant implements ViewGrant {
  id: UUID;
  database_id: UUID;
  view_id: UUID;
  grantee_name: string;
  privilege: string;
  with_grant_option: boolean | null;
  is_grant: boolean;
  constructor(data: ViewGrant) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.view_id = data.view_id;
    this.grantee_name = data.grantee_name;
    this.privilege = data.privilege;
    this.with_grant_option = data.with_grant_option;
    this.is_grant = data.is_grant;
  }
}
export interface ViewRule {
  id: UUID;
  database_id: UUID;
  view_id: UUID;
  name: string;
  event: string;
  action: string;
}
export class ViewRule implements ViewRule {
  id: UUID;
  database_id: UUID;
  view_id: UUID;
  name: string;
  event: string;
  action: string;
  constructor(data: ViewRule) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.view_id = data.view_id;
    this.name = data.name;
    this.event = data.event;
    this.action = data.action;
  }
}
export interface ViewTable {
  id: UUID;
  database_id: UUID;
  view_id: UUID;
  table_id: UUID;
  join_order: number;
}
export class ViewTable implements ViewTable {
  id: UUID;
  database_id: UUID;
  view_id: UUID;
  table_id: UUID;
  join_order: number;
  constructor(data: ViewTable) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.view_id = data.view_id;
    this.table_id = data.table_id;
    this.join_order = data.join_order;
  }
}