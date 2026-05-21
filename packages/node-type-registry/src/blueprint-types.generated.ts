// GENERATED FILE — DO NOT EDIT
/* eslint-disable @typescript-eslint/no-empty-object-type */
//
// Regenerate with:
//   cd packages/node-type-registry && pnpm generate:types
//
// These types match the JSONB shape expected by construct_blueprint().
// All field names are snake_case to match the SQL convention.

/**
 * ===========================================================================
 * Shared recursive types
 * ===========================================================================
 */
;
/** Recursive condition type for compound trigger WHEN clauses. Leaf conditions specify {field, op, value?, row?, ref?}. Combinators nest via AND, OR, NOT. */
export interface TriggerCondition {
  /** Column name (validated against the table). */
  field?: string;
  /** Comparison operator. */
  op?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'NOT LIKE' | 'IS NULL' | 'IS NOT NULL' | 'IS DISTINCT FROM';
  /** Comparison value. Type is resolved from the column definition. */
  value?: any;
  /** Row reference (default: NEW). */
  row?: 'NEW' | 'OLD';
  /** Column reference for field-to-field comparison (alternative to value). */
  ref?: {
    field?: string;
    row?: 'NEW' | 'OLD';
  };
  /** Array of conditions combined with AND. */
  AND?: TriggerCondition[];
  /** Array of conditions combined with OR. */
  OR?: TriggerCondition[];
  /** Negated condition. */
  NOT?: TriggerCondition;
}
/**
 * ===========================================================================
 * Billing node type parameters
 * ===========================================================================
 */
;
/** Declaratively attaches billing usage-recording triggers to a table. On INSERT the named meter is incremented via record_usage; on DELETE it is decremented (reversal). On UPDATE, if the entity_field changes, the old entity is decremented and the new entity is incremented. Requires a provisioned billing_module for the target database. */
export interface BillingMeterParams {
  /* Slug of the billing meter to record usage against (must match a meters table entry, e.g. "databases", "seats") */
  meter_slug: string;
  /* Column on the target table that holds the entity id for billing */
  entity_field?: string;
  /* Units to record per event (default 1) */
  quantity?: number;
  /* Which DML events to attach triggers for */
  events?: ('INSERT' | 'DELETE' | 'UPDATE')[];
}
/**
 * ===========================================================================
 * Check node type parameters
 * ===========================================================================
 */
;
/** Adds a CHECK constraint that validates a column value is greater than a threshold (single-column: column > value) or that one column is greater than another (cross-column: columns[0] > columns[1]). Compiled via AST helpers. */
export interface CheckGreaterThanParams {
  /* Single column to compare against value (mutually exclusive with columns) */
  column?: string;
  /* Threshold value for single-column comparison (column > value) */
  value?: number;
  /* Two columns for cross-column comparison (columns[0] > columns[1]) */
  columns?: string[];
}
/** Adds a CHECK constraint that validates a column value is less than a threshold (single-column: column < value) or that one column is less than another (cross-column: columns[0] < columns[1]). Compiled via AST helpers. */
export interface CheckLessThanParams {
  /* Single column to compare against value (mutually exclusive with columns) */
  column?: string;
  /* Threshold value for single-column comparison (column < value) */
  value?: number;
  /* Two columns for cross-column comparison (columns[0] < columns[1]) */
  columns?: string[];
}
/** Adds a CHECK constraint that validates two columns are not equal (columns[0] != columns[1]). Useful for preventing self-referencing rows. Compiled via AST helpers. */
export interface CheckNotEqualParams {
  /* Two columns that must not be equal */
  columns: string[];
}
/** Adds a CHECK constraint that validates a column value is one of an allowed set (e.g. tier IN ('free', 'paid', 'custom')). Compiled to column = ANY(ARRAY[...]) via AST helpers. */
export interface CheckOneOfParams {
  /* Column to validate against the allowed values */
  column: string;
  /* Array of allowed values for the column */
  values: string[];
}
/**
 * ===========================================================================
 * Data node type parameters
 * ===========================================================================
 */
;
/** Enables bulk mutation smart tags on a table. When provisioned, adds @behavior tags for the selected bulk operations (insert, upsert, update, delete). Requires the graphile-bulk-mutations plugin. */
export interface DataBulkParams {
  /* Enable bulk insert (+bulkInsert) */
  insert?: boolean;
  /* Enable bulk upsert (+bulkUpsert) */
  upsert?: boolean;
  /* Enable bulk update (+bulkUpdate) */
  update?: boolean;
  /* Enable bulk delete (+bulkDelete) */
  delete?: boolean;
}
/** Creates a derived text field that automatically concatenates multiple source fields via BEFORE INSERT/UPDATE triggers. Used to produce a unified text representation (e.g., embedding_text) from multiple columns on a table. The trigger fires with '_000' prefix to run before Search* triggers alphabetically. */
export interface DataCompositeFieldParams {
  /* Name of the derived text field to create */
  target?: string;
  /* Array of source field names to concatenate into the target field */
  source_fields: string[];
  /* Output format: 'labeled' (field_name: value) or 'plain' (values only) */
  format?: 'labeled' | 'plain';
}
/** Adds ownership column for direct user ownership. Enables AuthzDirectOwner authorization. */
export interface DataDirectOwnerParams {
  /* Column name for owner ID */
  owner_field_name?: string;
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
  /* If true, adds a foreign key constraint from owner_id to the users table */
  include_user_fk?: boolean;
  /* If true, creates a B-tree index on the owner column */
  create_index?: boolean;
}
/** Adds entity reference for organization/group scoping. Enables AuthzEntityMembership, AuthzMembership, AuthzOrgHierarchy authorization. */
export interface DataEntityMembershipParams {
  /* Column name for entity ID */
  entity_field_name?: string;
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
  /* If true, adds a foreign key constraint from entity_id to the users table */
  include_user_fk?: boolean;
  /* If true, creates a B-tree index on the entity column */
  create_index?: boolean;
}
/** BEFORE INSERT trigger that forces a field to the value of jwt_public.current_user_id(). Prevents clients from spoofing the actor/uploader identity. The field value is always overwritten regardless of what the client provides. */
export interface DataForceCurrentUserParams {
  /* Name of the field to force to current_user_id() */
  field_name?: string;
}
/** Adds a UUID primary key column with auto-generation default (uuidv7). This is the standard primary key pattern for all tables. */
export interface DataIdParams {
  /* Column name for the primary key */
  field_name?: string;
}
/** BEFORE UPDATE trigger that prevents changes to a list of specified fields after INSERT. Raises an exception if any of the listed fields have changed. Unlike FieldImmutable (single-field), this handles multiple fields in a single trigger for efficiency. */
export interface DataImmutableFieldsParams {
  /* Field names that cannot be modified after INSERT (e.g. ["key", "bucket_id", "owner_id"]) */
  fields: string[];
}
/** Transforms field values using inflection operations (snake_case, camelCase, slugify, plural, singular, etc). Attaches BEFORE INSERT and BEFORE UPDATE triggers. References fields by name in data jsonb. */
export interface DataInflectionParams {
  /* Name of the field to transform */
  field_name: string;
  /* Inflection operations to apply in order */
  ops: ('plural' | 'singular' | 'camel' | 'pascal' | 'dashed' | 'slugify' | 'underscore' | 'lower' | 'upper')[];
}
/** BEFORE INSERT trigger that copies specified fields from a parent table via a foreign key. The parent row is looked up through RLS (SECURITY INVOKER), so the insert fails if the caller cannot see the parent. Used by the storage module to inherit owner_id and is_public from buckets to files. */
export interface DataInheritFromParentParams {
  /* Name of the FK field on this table that references the parent (e.g. bucket_id) */
  parent_fk_field: string;
  /* Field names to copy from the parent row (e.g. ["owner_id", "is_public"]) */
  fields: string[];
  /* Parent table name (optional fallback if FK not yet registered in metaschema) */
  parent_table?: string;
  /* Parent table schema (optional, defaults to same schema as child table) */
  parent_schema?: string;
}
/** Adds a JSONB column with optional GIN index for containment queries (@>, ?, ?|, ?&). Standard pattern for semi-structured metadata. */
export interface DataJsonbParams {
  /* Column name for the JSONB field */
  field_name?: string;
  /* Default value expression */
  default_value?: string;
  /* Whether the column has a NOT NULL constraint */
  is_required?: boolean;
  /* Whether to create a GIN index */
  create_index?: boolean;
}
/** Restricts which user can modify specific columns in shared objects. Creates an AFTER UPDATE trigger that throws OWNED_PROPS when a non-owner tries to change protected fields. References fields by name in data jsonb. */
export interface DataOwnedFieldsParams {
  /* Name of the field identifying the owner (e.g. sender_id) */
  role_key_field_name: string;
  /* Names of fields only this owner can modify */
  protected_field_names: string[];
}
/** Combines direct ownership with entity scoping. Adds both owner_id and entity_id columns. Enables AuthzDirectOwner, AuthzEntityMembership, and AuthzOrgHierarchy authorization. Particularly useful for OrgHierarchy where a user owns a row (owner_id) within an entity (entity_id), and managers above can see subordinate-owned records via the hierarchy closure table. */
export interface DataOwnershipInEntityParams {
  /* Column name for the owner reference */
  owner_field_name?: string;
  /* Column name for the entity reference */
  entity_field_name?: string;
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
  /* If true, adds foreign key constraints from owner_id and entity_id to the users table */
  include_user_fk?: boolean;
  /* If true, creates B-tree indexes on the owner and entity columns */
  create_index?: boolean;
}
/** Adds user tracking for creates/updates with created_by and updated_by columns. */
export interface DataPeoplestampsParams {
  /* Column name for the creating user reference */
  created_by_field?: string;
  /* Column name for the last-updating user reference */
  updated_by_field?: string;
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
  /* If true, adds foreign key constraints from created_by and updated_by to the users table */
  include_user_fk?: boolean;
  /* If true, creates B-tree indexes on the peoplestamp columns */
  create_index?: boolean;
}
/** Adds publish state columns (is_published, published_at) for content visibility. Enables AuthzPublishable and AuthzTemporal authorization. */
export interface DataPublishableParams {
  /* Column name for the published boolean flag */
  is_published_field?: string;
  /* Column name for the publish timestamp */
  published_at_field?: string;
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
}
/** Creates per-table subscriber tables in subscriptions_public with RLS policies derived from source table SELECT policies. Attaches statement-level triggers to emit changes to subscribers. */
export interface DataRealtimeParams {
  /* Which DML operations to track with emit_change triggers */
  operations?: ('INSERT' | 'UPDATE' | 'DELETE')[];
  /* Custom name for the subscriber table (defaults to {source_table}_subscriber) */
  subscriber_table_name?: string;
}
/** Auto-generates URL-friendly slugs from field values on insert/update. Attaches BEFORE INSERT and BEFORE UPDATE triggers that call inflection.slugify() on the target field. References fields by name in data jsonb. */
export interface DataSlugParams {
  /* Name of the field to slugify */
  field_name?: string;
  /* Optional source field name (defaults to field_name) */
  source_field_name?: string;
}
/** Adds soft delete support with deleted_at and is_deleted columns. */
export interface DataSoftDeleteParams {
  /* Column name for the soft-delete timestamp */
  deleted_at_field?: string;
  /* Column name for the soft-delete boolean flag */
  is_deleted_field?: string;
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
}
/** Adds a status column with B-tree index for efficient equality filtering and sorting. Optionally constrains values via CHECK constraint when allowed_values is provided. */
export interface DataStatusFieldParams {
  /* Column name for the status field */
  field_name?: string;
  /* Column type (text or citext) */
  type?: string;
  /* Default value expression (e.g., active) */
  default_value?: string;
  /* Whether the column has a NOT NULL constraint */
  is_required?: boolean;
  /* If provided, creates a CHECK constraint restricting the column to these values */
  allowed_values?: string[];
}
/** Adds a citext[] tags column with GIN index for efficient array containment queries (@>, &&). Standard tagging pattern for categorization and filtering. */
export interface DataTagsParams {
  /* Column name for the tags array */
  field_name?: string;
  /* Default value expression for the tags column */
  default_value?: string;
  /* Whether the column has a NOT NULL constraint */
  is_required?: boolean;
}
/** Adds automatic timestamp tracking with created_at and updated_at columns. */
export interface DataTimestampsParams {
  /* Column name for the creation timestamp */
  created_at_field?: string;
  /* Column name for the last-updated timestamp */
  updated_at_field?: string;
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
}
/** Creates an organization settings table with standard business fields (legal_name, address fields). Uses AuthzEntityMembership for access control. */
export type TableOrganizationSettingsParams = {};
/** Creates a user profiles table with standard profile fields (profile_picture, bio, first_name, last_name, tags, desired). Uses AuthzDirectOwner for edit access and AuthzAllowAll for select. */
export type TableUserProfilesParams = {};
/** Creates a user settings table for user-specific configuration. Uses AuthzDirectOwner for access control. */
export type TableUserSettingsParams = {};
/**
 * ===========================================================================
 * Limit node type parameters
 * ===========================================================================
 */
;
/** Declaratively attaches aggregate limit-tracking triggers to a table. On INSERT the named limit is incremented per entity; on DELETE it is decremented. Uses org_limit_aggregates_inc/dec for per-entity (org-level) aggregate limits rather than per-user limits. Requires a provisioned limits_module for the target database. */
export interface LimitAggregateParams {
  /* Name of the aggregate limit to track (must match a default_limits entry, e.g. "databases", "members") */
  limit_name: string;
  /* Column on the target table that holds the entity id for aggregate limit lookup */
  entity_field?: string;
  /* Which DML events to attach triggers for */
  events?: ('INSERT' | 'DELETE' | 'UPDATE')[];
}
/** Gates a table behind a feature flag backed by the cap tables. Attaches a BEFORE INSERT trigger that checks whether the named feature cap value is > 0. Features are modeled as caps with max=0 (disabled) or max=1 (enabled) in limit_caps / limit_caps_defaults tables. Resolution: COALESCE(per-entity cap, scope default, 0). */
export interface LimitFeatureFlagParams {
  /* Cap name representing this feature (must match a limit_caps_defaults entry with max=0 or max=1) */
  feature_name: string;
  /* Feature scope: "app" (membership_type=1, app-level caps) or "org" (membership_type=2, per-entity caps) */
  scope?: 'app' | 'org';
  /* Column on the target table that holds the entity id for per-entity cap lookups (only used for org scope) */
  entity_field?: string;
}
/** Declaratively attaches limit-tracking triggers to a table. On INSERT the named limit is incremented; on DELETE it is decremented. Requires a provisioned limits_module for the target scope. */
export interface LimitCounterParams {
  /* Name of the limit to track (must match a default_limits entry, e.g. "projects", "members") */
  limit_name: string;
  /* Limit scope: "app" (membership_type=1, user-level) or "org" (membership_type=2, entity-level) */
  scope?: 'app' | 'org';
  /* Column on the target table that holds the actor or entity id used for limit lookup */
  actor_field?: string;
  /* Which DML events to attach triggers for */
  events?: ('INSERT' | 'DELETE' | 'UPDATE')[];
}
/**
 * ===========================================================================
 * Search node type parameters
 * ===========================================================================
 */
;
/** Creates a BM25 index on an existing text column using pg_textsearch. Enables statistical relevance ranking with configurable k1 and b parameters. The BM25 index is auto-detected by graphile-search. */
export interface SearchBm25Params {
  /* Name of existing text column to index with BM25 */
  field_name: string;
  /* PostgreSQL text search configuration for BM25 */
  text_config?: string;
  /* BM25 k1 parameter: term frequency saturation (typical: 1.2-2.0) */
  k1?: number;
  /* BM25 b parameter: document length normalization (0=none, 1=full, typical: 0.75) */
  b?: number;
  /* Weight for this algorithm in composite searchScore */
  search_score_weight?: number;
}
/** Adds a tsvector column with GIN index and automatic trigger population from source fields. Enables PostgreSQL full-text search with configurable weights and language support. Leverages the existing metaschema full_text_search infrastructure. */
export interface SearchFullTextParams {
  /* Name of the tsvector column */
  field_name?: string;
  /* Source columns that feed the tsvector. Each has a field name, weight (A-D), and language config. */
  source_fields: {
    /* Name of the source column */field: string;
    /* tsvector weight class (A=highest, D=lowest) */weight?: 'A' | 'B' | 'C' | 'D';
    /* PostgreSQL text search configuration */lang?: string;
  }[];
  /* Weight for this algorithm in composite searchScore */
  search_score_weight?: number;
}
/** Adds a PostGIS geometry or geography column with a spatial index (GiST or SP-GiST). Supports configurable geometry types (Point, Polygon, etc.), SRID, and dimensionality. The graphile-postgis plugin auto-detects geometry/geography columns by codec type for spatial filtering (ST_Contains, ST_DWithin, bbox operators). */
export interface SearchSpatialParams {
  /* Name of the geometry/geography column */
  field_name?: string;
  /* PostGIS geometry type constraint */
  geometry_type?: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon' | 'GeometryCollection' | 'Geometry';
  /* Spatial Reference System Identifier (e.g. 4326 for WGS84) */
  srid?: number;
  /* Coordinate dimension (2=XY, 3=XYZ, 4=XYZM) */
  dimension?: 2 | 3 | 4;
  /* Use geography type instead of geometry (for geodetic calculations on the sphere) */
  use_geography?: boolean;
  /* Spatial index method */
  index_method?: 'gist' | 'spgist';
}
/** Creates a derived/materialized geometry field on the parent table that automatically aggregates geometries from a source (child) table via triggers. When child rows are inserted/updated/deleted, the parent aggregate field is recalculated using the specified PostGIS aggregation function (ST_Union, ST_Collect, ST_ConvexHull, ST_ConcaveHull). Useful for materializing spatial boundaries from collections of points or polygons. */
export interface SearchSpatialAggregateParams {
  /* Name of the aggregate geometry column on the parent table */
  field_name?: string;
  /* UUID of the source (child) table containing individual geometries */
  source_table_id: string;
  /* Name of the geometry column on the source table */
  source_geom_field?: string;
  /* Name of the foreign key column on the source table pointing to the parent */
  source_fk_field: string;
  /* PostGIS aggregation function: union (ST_Union, merges overlapping), collect (ST_Collect, groups without merging), convex_hull (smallest convex polygon), concave_hull (tighter boundary) */
  aggregate_function?: 'union' | 'collect' | 'convex_hull' | 'concave_hull';
  /* Output geometry type constraint for the aggregate field */
  geometry_type?: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon' | 'GeometryCollection' | 'Geometry';
  /* Spatial Reference System Identifier (e.g. 4326 for WGS84) */
  srid?: number;
  /* Coordinate dimension (2=XY, 3=XYZ, 4=XYZM) */
  dimension?: 2 | 3 | 4;
  /* Use geography type instead of geometry */
  use_geography?: boolean;
  /* Spatial index method for the aggregate field */
  index_method?: 'gist' | 'spgist';
}
/** Creates GIN trigram indexes (gin_trgm_ops) on specified text/citext fields for fuzzy LIKE/ILIKE/similarity search. Adds @trgmSearch smart tag for PostGraphile integration. Fields must already exist on the table. */
export interface SearchTrgmParams {
  /* Field names to create trigram indexes on (fields must already exist on the table) */
  fields: string[];
}
/** Composite node type that orchestrates multiple search modalities (full-text search, BM25, embeddings, trigram) on a single table. Configures per-table search score weights, normalization strategy, and recency boost via the @searchConfig smart tag. */
export interface SearchUnifiedParams {
  /* SearchFullText parameters. Omit to skip FTS setup. */
  full_text_search?: {
    field_name?: string;
    source_fields?: {
      field: string;
      weight?: 'A' | 'B' | 'C' | 'D';
      lang?: string;
    }[];
    search_score_weight?: number;
  };
  /* SearchBm25 parameters. Omit to skip BM25 setup. */
  bm25?: {
    field_name?: string;
    text_config?: string;
    k1?: number;
    b?: number;
    search_score_weight?: number;
  };
  /* SearchVector parameters. Omit to skip embedding setup. */
  embedding?: {
    field_name?: string;
    dimensions?: number;
    index_method?: 'hnsw' | 'ivfflat';
    metric?: 'cosine' | 'l2' | 'ip';
    source_fields?: string[];
    search_score_weight?: number;
    /* Chunking configuration for long-text embedding. Creates an embedding_chunks record that drives automatic text splitting and per-chunk embedding. Omit to skip chunking. */chunks?: {
      /* Name of the text content column in the chunks table */content_field_name?: string;
      /* Maximum number of characters per chunk */chunk_size?: number;
      /* Number of overlapping characters between consecutive chunks */chunk_overlap?: number;
      /* Strategy for splitting text into chunks */chunk_strategy?: 'fixed' | 'sentence' | 'paragraph' | 'semantic';
      /* Metadata fields from parent to copy into chunks */metadata_fields?: {
        [key: string]: unknown;
      };
      /* Whether to auto-enqueue a chunking job on insert/update */enqueue_chunking_job?: boolean;
      /* Task identifier for the chunking job queue */chunking_task_name?: string;
    };
  };
  /* Name of the composite text field created for embedding input */
  embedding_text_field?: string;
  /* Output format for the composite text field */
  composite_format?: 'labeled' | 'plain';
  /* Field names to tag with @trgmSearch for fuzzy/typo-tolerant matching */
  trgm_fields?: string[];
  /* Unified search score configuration written to @searchConfig smart tag */
  search_config?: {
    /* Per-algorithm weights: {tsv: 1.5, bm25: 1.0, pgvector: 0.8, trgm: 0.3} */weights?: {
      [key: string]: unknown;
    };
    /* Score normalization strategy */normalization?: 'linear' | 'sigmoid';
    /* Enable recency boost for search results */boost_recent?: boolean;
    /* Timestamp field for recency boost (e.g. created_at, updated_at) */boost_recency_field?: string;
    /* Decay rate for recency boost (0-1, lower = faster decay) */boost_recency_decay?: number;
  };
}
/** Adds a vector embedding column with HNSW or IVFFlat index for similarity search. Supports configurable dimensions, distance metrics (cosine, l2, ip), per-field {field_name}_updated_at timestamp tracking (read-only in GraphQL), and automatic job enqueue triggers for embedding generation. */
export interface SearchVectorParams {
  /* Name of the vector column */
  field_name?: string;
  /* Vector dimensions (e.g. 384, 768, 1536, 3072) */
  dimensions?: number;
  /* Index type for similarity search */
  index_method?: 'hnsw' | 'ivfflat';
  /* Distance metric (cosine, l2, ip) */
  metric?: 'cosine' | 'l2' | 'ip';
  /* Index-specific options. HNSW: {m, ef_construction}. IVFFlat: {lists}. */
  index_options?: {
    [key: string]: unknown;
  };
  /* Column names that feed the embedding. Used by stale trigger to detect content changes. */
  source_fields?: string[];
  /* Auto-create trigger that enqueues embedding generation jobs */
  enqueue_job?: boolean;
  /* Task identifier for the job queue */
  job_task_name?: string;
  /* Chunking configuration for long-text embedding. Creates an embedding_chunks record that drives automatic text splitting and per-chunk embedding. Omit to skip chunking. */
  chunks?: {
    /* Name of the text content column in the chunks table */content_field_name?: string;
    /* Maximum number of characters per chunk */chunk_size?: number;
    /* Number of overlapping characters between consecutive chunks */chunk_overlap?: number;
    /* Strategy for splitting text into chunks */chunk_strategy?: 'fixed' | 'sentence' | 'paragraph' | 'semantic';
    /* Metadata fields from parent to copy into chunks */metadata_fields?: {
      [key: string]: unknown;
    };
    /* Whether to auto-enqueue a chunking job on insert/update */enqueue_chunking_job?: boolean;
    /* Task identifier for the chunking job queue */chunking_task_name?: string;
  };
}
/**
 * ===========================================================================
 * Job node type parameters
 * ===========================================================================
 */
;
/** Dynamically creates PostgreSQL triggers that enqueue jobs via app_jobs.add_job() when table rows are inserted, updated, or deleted. Supports configurable payload strategies (full row, row ID, selected fields, or custom mapping), conditional firing via WHEN clauses, watched field changes, and extended job options (queue, priority, delay, max attempts). */
export interface JobTriggerParams {
  /* Job task identifier passed to add_job (e.g., process_invoice, sync_to_stripe) */
  task_identifier: string;
  /* How to build the job payload: row (full NEW/OLD), row_id (just id), fields (selected columns), custom (mapped columns) */
  payload_strategy?: 'row' | 'row_id' | 'fields' | 'custom';
  /* Column names to include in payload (only for fields strategy) */
  payload_fields?: string[];
  /* Key-to-column mapping for custom payload (e.g., {"invoice_id": "id", "total": "amount"}) */
  payload_custom?: {
    [key: string]: unknown;
  };
  /* Trigger events to create */
  events?: ('INSERT' | 'UPDATE' | 'DELETE')[];
  /* Include OLD row in payload (for UPDATE triggers) */
  include_old?: boolean;
  /* Include table/schema metadata in payload */
  include_meta?: boolean;
  /* Column name for conditional WHEN clause (fires only when field equals condition_value) */
  condition_field?: string;
  /* Value to compare against condition_field in WHEN clause */
  condition_value?: string;
  /* Compound conditions for the trigger WHEN clause. Accepts a single leaf condition, an array of conditions (implicitly AND), or a nested combinator tree ({AND: [...], OR: [...], NOT: {...}}). Each leaf is {field, op, value?, row?, ref?}. Column types are resolved automatically from the table schema. Cannot be combined with condition_field or watch_fields. */
  conditions?: TriggerCondition | TriggerCondition[];
  /* For UPDATE triggers, only fire when these fields change (uses DISTINCT FROM) */
  watch_fields?: string[];
  /* Static job key for upsert semantics (prevents duplicate jobs) */
  job_key?: string;
  /* Job queue name for routing to specific workers */
  queue_name?: string;
  /* Job priority (lower = higher priority) */
  priority?: number;
  /* Delay before job runs as PostgreSQL interval (e.g., 30 seconds, 5 minutes) */
  run_at_delay?: string;
  /* Maximum retry attempts for the job */
  max_attempts?: number;
}
/**
 * ===========================================================================
 * Process node type parameters
 * ===========================================================================
 */
;
/** Creates a chunked-embedding child table for any parent table. Provisions the chunks table with content, chunk_index, embedding vector, metadata, HNSW index, inherited RLS, and optional job trigger for automatic text splitting. Composed internally by ProcessFileEmbedding (enabled by default in extract mode) but can also be used standalone. */
export interface ProcessChunksParams {
  /* Name of the text content column in the chunks table */
  content_field_name?: string;
  /* Maximum number of characters per chunk */
  chunk_size?: number;
  /* Number of overlapping characters between consecutive chunks */
  chunk_overlap?: number;
  /* Strategy for splitting text into chunks */
  chunk_strategy?: 'fixed' | 'sentence' | 'paragraph' | 'semantic';
  /* Vector dimensions for per-chunk embeddings */
  dimensions?: number;
  /* Distance metric for the HNSW index on chunk embeddings */
  metric?: 'cosine' | 'l2' | 'ip';
  /* Override the chunks table name. Defaults to {parent_table}_chunks. */
  chunks_table_name?: string;
  /* Field names from the parent table to copy into chunk metadata */
  metadata_fields?: string[];
  /* Whether to create a job trigger that auto-enqueues chunking on parent INSERT/UPDATE */
  enqueue_chunking_job?: boolean;
  /* Task identifier for the chunking job queue */
  chunking_task_name?: string;
}
/** Generic, MIME-scoped embedding node for file tables. Supports two modes: direct (whole-file to single vector, e.g. CLIP for images) when extraction is omitted, or extract (file to text to chunks to per-chunk vectors) when extraction config is provided. Composes SearchVector + JobTrigger + ProcessChunks (enabled by default in extract mode) internally. Multiple instances can coexist on the same table with different MIME scopes, field names, and embedding strategies. */
export interface ProcessFileEmbeddingParams {
  /* Name of the vector embedding column */
  field_name?: string;
  /* Vector dimensions (e.g. 512 for CLIP, 768 for nomic, 1536 for ada-002) */
  dimensions?: number;
  /* Index type for similarity search */
  index_method?: 'hnsw' | 'ivfflat';
  /* Distance metric */
  metric?: 'cosine' | 'l2' | 'ip';
  /* Index-specific options. HNSW: {m, ef_construction}. IVFFlat: {lists}. */
  index_options?: {
    [key: string]: unknown;
  };
  /* MIME type LIKE patterns to match. Multiple patterns are OR'd together. Examples: ['image/%'], ['application/pdf', 'text/%'], ['audio/%']. */
  mime_patterns?: string[];
  /* Job task identifier for the worker. In direct mode this is the embedding worker; in extract mode this is the extraction worker. */
  task_identifier?: string;
  /* Trigger events that fire the job */
  events?: ('INSERT' | 'UPDATE')[];
  /* Custom payload key-to-column mapping for the job trigger */
  payload_custom?: {
    [key: string]: unknown;
  };
  /* Additional compound conditions beyond MIME filtering. Merged with the auto-generated MIME conditions via AND. Use this to add status checks, field guards, etc. */
  trigger_conditions?: TriggerCondition | TriggerCondition[];
  /* Text extraction configuration. When present, the generator creates extraction output fields on the table and configures SearchVector with source_fields + stale tracking. When absent, the node operates in direct mode (single vector per file, no text extraction). */
  extraction?: {
    /* Field to store extracted text/markdown */text_field?: string;
    /* JSONB field for extraction metadata (page count, language, etc.) */metadata_field?: string;
  };
  /* Whether to create a chunks table via ProcessChunks. Defaults to true when extraction is provided, false in direct mode. Set explicitly to override. */
  include_chunks?: boolean;
  /* Chunking configuration passed through to ProcessChunks. When include_chunks is true (or defaults to true in extract mode), these params configure the chunks table, embedding dimensions, strategy, etc. */
  chunks?: {
    /* Name of the text content column in the chunks table */content_field_name?: string;
    /* Maximum number of characters per chunk */chunk_size?: number;
    /* Number of overlapping characters between consecutive chunks */chunk_overlap?: number;
    /* Strategy for splitting text into chunks */chunk_strategy?: 'fixed' | 'sentence' | 'paragraph' | 'semantic';
    /* Field names from parent to copy into chunk metadata */metadata_fields?: string[];
    /* Whether to auto-enqueue a chunking job on insert/update */enqueue_chunking_job?: boolean;
    /* Task identifier for the chunking job queue */chunking_task_name?: string;
  };
}
/** Image-specific preset of ProcessFileEmbedding. Delegates to ProcessFileEmbedding with image-oriented defaults: dimensions=512 (CLIP), mime_patterns=['image/%'], task_identifier='process_image_embedding', direct mode (no extraction). Accepts all ProcessFileEmbedding parameters — any overrides are forwarded through. */
export interface ProcessImageEmbeddingParams {
  /* Name of the vector embedding column */
  field_name?: string;
  /* Vector dimensions (default 512 for CLIP-style image embeddings) */
  dimensions?: number;
  /* Index type for similarity search */
  index_method?: 'hnsw' | 'ivfflat';
  /* Distance metric */
  metric?: 'cosine' | 'l2' | 'ip';
  /* Index-specific options. HNSW: {m, ef_construction}. IVFFlat: {lists}. */
  index_options?: {
    [key: string]: unknown;
  };
  /* MIME type LIKE patterns to match. Multiple patterns are OR'd together. */
  mime_patterns?: string[];
  /* Job task identifier for the image embedding worker */
  task_identifier?: string;
  /* Trigger events that fire the job */
  events?: ('INSERT' | 'UPDATE')[];
  /* Custom payload key-to-column mapping for the job trigger */
  payload_custom?: {
    [key: string]: unknown;
  };
  /* Additional compound conditions beyond MIME filtering. Merged with the auto-generated MIME conditions via AND. */
  trigger_conditions?: TriggerCondition | TriggerCondition[];
  /* Text extraction configuration. Forwarded to ProcessFileEmbedding. When present, enables extract mode (e.g., OCR for images). */
  extraction?: {
    /* Field to store extracted text */text_field?: string;
    /* JSONB field for extraction metadata */metadata_field?: string;
  };
  /* Chunking configuration. Forwarded to ProcessFileEmbedding. Only meaningful when extraction is also provided. */
  chunks?: {
    content_field_name?: string;
    chunk_size?: number;
    chunk_overlap?: number;
    chunk_strategy?: 'fixed' | 'sentence' | 'paragraph' | 'semantic';
    metadata_fields?: {
      [key: string]: unknown;
    };
    enqueue_chunking_job?: boolean;
    chunking_task_name?: string;
  };
}
/** Creates extraction output fields and a job trigger for file text extraction. Fires when a file is uploaded (status = 'uploaded') or on INSERT. The external worker extracts text/metadata from the file (PDF, DOCX, HTML, etc.) and writes the result back to the configured output fields. Typically used upstream of ProcessFileEmbedding or ProcessChunks. */
export interface ProcessExtractionParams {
  /* Field to store extracted text/markdown */
  text_field?: string;
  /* JSONB field for extraction metadata (page count, language, etc.) */
  metadata_field?: string;
  /* MIME type LIKE patterns to match. Multiple patterns are OR'd together. Examples: ['application/pdf', 'text/%'], ['application/vnd.openxmlformats%']. */
  mime_patterns?: string[];
  /* Job task identifier for the extraction worker */
  task_identifier?: string;
  /* Trigger events that fire the job */
  events?: ('INSERT' | 'UPDATE')[];
  /* Custom payload key-to-column mapping for the job trigger */
  payload_custom?: {
    [key: string]: unknown;
  };
  /* Additional compound conditions beyond MIME filtering. Merged with the auto-generated MIME conditions via AND. Use this to add status checks (e.g., status = 'uploaded'). */
  trigger_conditions?: TriggerCondition | TriggerCondition[];
  /* Job queue name for extraction tasks */
  queue_name?: string;
  /* Maximum number of retry attempts */
  max_attempts?: number;
  /* Job priority (lower = higher priority) */
  priority?: number;
}
/** Creates a job trigger for image variant generation. Fires when an image file is uploaded (status = 'uploaded') or on INSERT. The external worker generates resized, cropped, or reformatted versions (thumbnails, previews, WebP conversions, etc.) and stores them as new file records linked to the source image. */
export interface ProcessImageVersionsParams {
  /* Array of version definitions. Each version specifies dimensions, format, and quality for a generated image variant. Required — the blueprint must explicitly define what variants to generate. */
  versions: {
    /* Version identifier (e.g., "thumb", "preview", "hero") */name: string;
    /* Target width in pixels */width?: number;
    /* Target height in pixels */height?: number;
    /* Resize fitting strategy */fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    /* Output image format */format?: 'jpeg' | 'png' | 'webp' | 'avif';
    /* Output quality (1-100) */quality?: number;
  }[];
  /* MIME type LIKE patterns to match. Defaults to all image types. */
  mime_patterns?: string[];
  /* Job task identifier for the image processing worker */
  task_identifier?: string;
  /* Trigger events that fire the job */
  events?: ('INSERT' | 'UPDATE')[];
  /* Custom payload key-to-column mapping for the job trigger */
  payload_custom?: {
    [key: string]: unknown;
  };
  /* Additional compound conditions beyond MIME filtering. Merged with the auto-generated MIME conditions via AND. */
  trigger_conditions?: TriggerCondition | TriggerCondition[];
  /* Job queue name for image processing tasks */
  queue_name?: string;
  /* Maximum number of retry attempts */
  max_attempts?: number;
  /* Job priority (lower = higher priority) */
  priority?: number;
}
/**
 * ===========================================================================
 * Authz node type parameters
 * ===========================================================================
 */
;
/** Allows all access. Generates TRUE expression. */
export type AuthzAllowAllParams = {};
/** App-level membership check (hardcoded membership_type=1). Verifies the user has app membership (optionally with specific permission) without binding to any entity from the row. Uses EXISTS subquery against SPRT table. For entity-scoped checks (org, channel, etc.), use AuthzEntityMembership instead. */
export interface AuthzAppMembershipParams {
  /* Single permission name to check (resolved to bitstring mask) */
  permission?: string;
  /* Multiple permission names to check (ORed together into mask) */
  permissions?: string[];
  /* If true, require is_admin flag */
  is_admin?: boolean;
  /* If true, require is_owner flag */
  is_owner?: boolean;
}
/** Composite authorization policy that combines multiple authorization nodes using boolean logic (AND/OR). The data field contains a JSONB AST with nested authorization nodes. */
export interface AuthzCompositeParams {
  /* Boolean expression combining multiple authorization nodes */
  BoolExpr?: {
    /* Boolean operator: AND_EXPR, OR_EXPR, or NOT_EXPR */boolop?: 'AND_EXPR' | 'OR_EXPR' | 'NOT_EXPR';
    /* Array of authorization nodes to combine */args?: {
      [key: string]: unknown;
    }[];
  };
}
/** Denies all access. Generates FALSE expression. */
export type AuthzDenyAllParams = {};
/** Path-scoped file sharing via ltree containment. Grants access when a path_shares row matches the current user, bucket, and an ancestor path with the required permission. */
export interface AuthzFilePathParams {
  /* Schema of the path_shares table */
  shares_schema: string;
  /* Name of the path_shares table */
  shares_table: string;
  /* Schema of the files table (used to qualify column references inside the EXISTS subquery) */
  files_schema?: string;
  /* Name of the files table (used to qualify column references inside the EXISTS subquery) */
  files_table: string;
  /* Boolean column on the path_shares table that grants the required permission (e.g. can_read, can_write) */
  permission_field: string;
  /* Column on the files table referencing the bucket */
  bucket_field?: string;
  /* Ltree column on the files table representing the file path */
  path_field?: string;
}
/** Direct equality comparison between a table column and the current user ID. Simplest authorization pattern with no subqueries. */
export interface AuthzDirectOwnerParams {
  /* Column name containing the owner user ID (e.g., owner_id) */
  entity_field: string;
}
/** OR logic for multiple ownership fields. Checks if current user matches any of the specified fields. */
export interface AuthzDirectOwnerAnyParams {
  /* Array of column names to check for ownership */
  entity_fields: string[];
}
/** Membership check scoped by a field on the row through the SPRT table. Verifies user has membership in the entity referenced by the row. */
export interface AuthzEntityMembershipParams {
  /* Column name referencing the entity (e.g., entity_id, org_id) */
  entity_field: string;
  /* SPRT column to select for the entity match */
  sel_field?: string;
  /* Scope: 1=app, 2=org, 3+=dynamic entity types (or string name resolved via membership_types_module) */
  membership_type?: number | string;
  /* Entity type prefix (e.g. 'channel', 'department'). Resolved to membership_type integer via memberships_module lookup. Use instead of membership_type for readability. */
  entity_type?: string;
  /* Single permission name to check (resolved to bitstring mask) */
  permission?: string;
  /* Multiple permission names to check (ORed together into mask) */
  permissions?: string[];
  /* If true, require is_admin flag */
  is_admin?: boolean;
  /* If true, require is_owner flag */
  is_owner?: boolean;
}
/** Check if current user is in an array column on the same row. */
export interface AuthzMemberListParams {
  /* Column name containing the array of user IDs */
  array_field: string;
}
/** Restrictive policy that blocks read-only members from mutations. Checks actor_id + is_read_only IS NOT TRUE on the SPRT. Designed to run as a restrictive counterpart after a permissive AuthzEntityMembership policy has already verified membership. */
export interface AuthzNotReadOnlyParams {
  /* Column name referencing the entity (e.g., entity_id, org_id) */
  entity_field: string;
  /* Scope: 2=org, 3+=dynamic entity types. Must be >= 2 (entity-scoped). */
  membership_type?: number | string;
}
/** Organizational hierarchy visibility using closure table. Managers can see subordinate data or subordinates can see manager data. */
export interface AuthzOrgHierarchyParams {
  /* down=manager sees subordinates, up=subordinate sees managers */
  direction: 'up' | 'down';
  /* Field referencing the org entity */
  entity_field?: string;
  /* Field referencing the user (e.g., owner_id) */
  anchor_field: string;
  /* Optional max depth to limit visibility */
  max_depth?: number;
}
/** Peer visibility through shared entity membership. Authorizes access to user-owned rows when the owner and current user are both members of the same entity. Self-joins the SPRT table to find peers. */
export interface AuthzPeerOwnershipParams {
  /* Column name on protected table referencing the owning user (e.g., owner_id) */
  owner_field: string;
  /* Scope: 1=app, 2=org, 3+=dynamic entity types (or string name resolved via membership_types_module) */
  membership_type?: number | string;
  /* Entity type prefix (e.g. 'channel', 'department'). Resolved to membership_type integer via memberships_module lookup. Use instead of membership_type for readability. */
  entity_type?: string;
  /* Single permission name to check on the current user membership (resolved to bitstring mask) */
  permission?: string;
  /* Multiple permission names to check on the current user membership (ORed together into mask) */
  permissions?: string[];
  /* If true, require is_admin flag on current user membership */
  is_admin?: boolean;
  /* If true, require is_owner flag on current user membership */
  is_owner?: boolean;
}
/** Published state access control. Restricts access to records that are published. */
export interface AuthzPublishableParams {
  /* Boolean field indicating published state */
  is_published_field?: string;
  /* Timestamp field for publish time */
  published_at_field?: string;
  /* Require published_at to be non-null and <= now() */
  require_published_at?: boolean;
}
/** JOIN-based membership verification through related tables. Joins SPRT table with another table to verify membership. */
export interface AuthzRelatedEntityMembershipParams {
  /* Column name on protected table referencing the join table */
  entity_field: string;
  /* SPRT column to select for the entity match */
  sel_field?: string;
  /* SPRT column to join on with the related table */
  sprt_join_field?: string;
  /* Scope: 1=app, 2=org, 3+=dynamic entity types (or string name resolved via membership_types_module) */
  membership_type?: number | string;
  /* Entity type prefix (e.g. 'channel', 'department'). Resolved to membership_type integer via memberships_module lookup. Use instead of membership_type for readability. */
  entity_type?: string;
  /* UUID of the join table (alternative to obj_schema/obj_table) */
  obj_table_id?: string;
  /* Schema of the join table (or use obj_table_id) */
  obj_schema?: string;
  /* Name of the join table (or use obj_table_id) */
  obj_table?: string;
  /* UUID of field on join table (alternative to obj_field) */
  obj_field_id?: string;
  /* Field name on join table to match against SPRT entity_id */
  obj_field?: string;
  /* Single permission name to check (resolved to bitstring mask) */
  permission?: string;
  /* Multiple permission names to check (ORed together into mask) */
  permissions?: string[];
  /* If true, require is_admin flag */
  is_admin?: boolean;
  /* If true, require is_owner flag */
  is_owner?: boolean;
}
/** Array membership check in a related table. */
export interface AuthzRelatedMemberListParams {
  /* Schema of the related table */
  owned_schema: string;
  /* Name of the related table */
  owned_table: string;
  /* Array column in related table */
  owned_table_key: string;
  /* FK column in related table */
  owned_table_ref_key: string;
  /* PK column in protected table */
  this_object_key: string;
}
/** Peer visibility through shared entity membership via a related table. Like AuthzPeerOwnership but the owning user is resolved through a FK JOIN to a related table. Combines SPRT self-join with object table JOIN. */
export interface AuthzRelatedPeerOwnershipParams {
  /* Column name on protected table referencing the related table (e.g., message_id) */
  entity_field: string;
  /* Scope: 1=app, 2=org, 3+=dynamic entity types (or string name resolved via membership_types_module) */
  membership_type?: number | string;
  /* Entity type prefix (e.g. 'channel', 'department'). Resolved to membership_type integer via memberships_module lookup. Use instead of membership_type for readability. */
  entity_type?: string;
  /* UUID of the related table (alternative to obj_schema/obj_table) */
  obj_table_id?: string;
  /* Schema of the related table (or use obj_table_id) */
  obj_schema?: string;
  /* Name of the related table (or use obj_table_id) */
  obj_table?: string;
  /* UUID of field on related table containing the owner user ID (alternative to obj_field) */
  obj_field_id?: string;
  /* Field name on related table containing the owner user ID (e.g., sender_id) */
  obj_field?: string;
  /* Field on related table to select for matching entity_field */
  obj_ref_field?: string;
  /* Single permission name to check on the current user membership (resolved to bitstring mask) */
  permission?: string;
  /* Multiple permission names to check on the current user membership (ORed together into mask) */
  permissions?: string[];
  /* If true, require is_admin flag on current user membership */
  is_admin?: boolean;
  /* If true, require is_owner flag on current user membership */
  is_owner?: boolean;
}
/** Time-window based access control. Restricts access based on valid_from and/or valid_until timestamps. At least one of valid_from_field or valid_until_field must be provided. */
export interface AuthzTemporalParams {
  /* Column for start time (at least one of valid_from_field or valid_until_field required) */
  valid_from_field?: string;
  /* Column for end time (at least one of valid_from_field or valid_until_field required) */
  valid_until_field?: string;
  /* Include start boundary */
  valid_from_inclusive?: boolean;
  /* Include end boundary */
  valid_until_inclusive?: boolean;
}
/**
 * ===========================================================================
 * Relation node type parameters
 * ===========================================================================
 */
;
/** Creates a foreign key field on the source table referencing the target table. Auto-derives the FK field name from the target table name using inflection (e.g., projects derives project_id). delete_action is required and must be explicitly provided by the caller. */
export interface RelationBelongsToParams {
  /* Table that will have the FK field added */
  source_table_id: string;
  /* Table being referenced by the FK */
  target_table_id: string;
  /* FK field name on the source table. Auto-derived from target table name if omitted (e.g., projects → project_id) */
  field_name?: string;
  /* FK delete action: c=CASCADE, r=RESTRICT, n=SET NULL, d=SET DEFAULT, a=NO ACTION. Required. */
  delete_action: 'c' | 'r' | 'n' | 'd' | 'a';
  /* Whether the FK field is NOT NULL */
  is_required?: boolean;
}
/** Creates a foreign key field on the target table referencing the source table. Inverse of RelationBelongsTo — same FK, different perspective. "projects has many tasks" creates tasks.project_id. Auto-derives the FK field name from the source table name using inflection. delete_action is required and must be explicitly provided by the caller. */
export interface RelationHasManyParams {
  /* Parent table being referenced by the FK (e.g., projects in projects has many tasks) */
  source_table_id: string;
  /* Child table that receives the FK field (e.g., tasks in projects has many tasks) */
  target_table_id: string;
  /* FK field name on the target table. Auto-derived from source table name if omitted (e.g., projects derives project_id) */
  field_name?: string;
  /* FK delete action: c=CASCADE, r=RESTRICT, n=SET NULL, d=SET DEFAULT, a=NO ACTION. Required. */
  delete_action: 'c' | 'r' | 'n' | 'd' | 'a';
  /* Whether the FK field is NOT NULL */
  is_required?: boolean;
}
/** Creates a foreign key field with a unique constraint on the source table referencing the target table. Enforces 1:1 cardinality. Auto-derives the FK field name from the target table name using inflection. delete_action is required and must be explicitly provided by the caller. */
export interface RelationHasOneParams {
  /* Table that will have the FK field and unique constraint */
  source_table_id: string;
  /* Table being referenced by the FK */
  target_table_id: string;
  /* FK field name on the source table. Auto-derived from target table name if omitted (e.g., users → user_id) */
  field_name?: string;
  /* FK delete action: c=CASCADE, r=RESTRICT, n=SET NULL, d=SET DEFAULT, a=NO ACTION. Required. */
  delete_action: 'c' | 'r' | 'n' | 'd' | 'a';
  /* Whether the FK field is NOT NULL */
  is_required?: boolean;
}
/** Creates a junction table between source and target tables with auto-derived naming and FK fields. The trigger creates a bare table (no implicit DataId), adds FK fields to both tables, optionally creates a composite PK (use_composite_key), then forwards all security config to secure_table_provision as-is. The trigger never injects values the caller did not provide. Junction table FKs always CASCADE on delete. */
export interface RelationManyToManyParams {
  /* First table in the M:N relationship */
  source_table_id: string;
  /* Second table in the M:N relationship */
  target_table_id: string;
  /* Existing junction table to use. If uuid_nil(), a new bare table is created */
  junction_table_id?: string;
  /* Junction table name. Auto-derived from both table names if omitted (e.g., projects + tags derives project_tags) */
  junction_table_name?: string;
  /* FK field name on junction for source table. Auto-derived if omitted (e.g., projects derives project_id) */
  source_field_name?: string;
  /* FK field name on junction for target table. Auto-derived if omitted (e.g., tags derives tag_id) */
  target_field_name?: string;
  /* When true, creates a composite PK from the two FK fields. When false, no PK is created by the trigger (use nodes with DataId for UUID PK). Mutually exclusive with nodes containing DataId. */
  use_composite_key?: boolean;
  /* Array of node objects for field creation on junction table. Each object has a $type key (e.g. DataId, DataEntityMembership) and optional data keys. Forwarded to secure_table_provision as-is. Empty array means no additional fields. */
  nodes?: {
    [key: string]: unknown;
  }[];
  /* Unified grant objects for the junction table. Each entry is { roles: string[], privileges: string[][] }. Forwarded to secure_table_provision as-is. Default: [] */
  grants?: {
    roles: string[];
    privileges: string[][];
  }[];
  /* RLS policy objects for the junction table. Each entry has $type (Authz* generator), optional data, privileges, policy_role, permissive, policy_name. Forwarded to secure_table_provision as-is. Default: [] */
  policies?: {
    $type: string;
    data?: {
      [key: string]: unknown;
    };
    privileges?: string[];
    policy_role?: string;
    permissive?: boolean;
    policy_name?: string;
  }[];
}
/** Declares a spatial predicate between two existing geometry/geography columns. Inserts a metaschema_public.spatial_relation row; the sync_spatial_relation_tags trigger then projects a @spatialRelation smart tag onto the owner column so graphile-postgis' PostgisSpatialRelationsPlugin can expose it as a cross-table filter in GraphQL. Metadata-only: both source_field and target_field must already exist on their tables. Idempotent on (source_table_id, name). One direction per tag — author two RelationSpatial entries if symmetry is desired. */
export interface RelationSpatialParams {
  /* Table that owns the relation (the @spatialRelation tag is emitted on the owner column of this table) */
  source_table_id: string;
  /* Geometry/geography column on source_table that carries the @spatialRelation smart tag */
  source_field_id: string;
  /* Table being referenced by the spatial predicate */
  target_table_id: string;
  /* Geometry/geography column on target_table that the predicate is evaluated against */
  target_field_id: string;
  /* Relation name (stable, snake_case). Becomes the generated filter field name in GraphQL (e.g. nearby_clinic). Unique per (source_table_id, name) — idempotency key. */
  name: string;
  /* PostGIS spatial predicate. One of the 8 whitelisted operators. st_dwithin requires param_name. */
  operator: 'st_contains' | 'st_within' | 'st_intersects' | 'st_covers' | 'st_coveredby' | 'st_overlaps' | 'st_touches' | 'st_dwithin';
  /* Parameter name for parametric operators (currently only st_dwithin, which needs a distance argument). Must be NULL for all other operators. Enforced by table CHECK. */
  param_name?: string;
}
/**
 * ===========================================================================
 * View node type parameters
 * ===========================================================================
 */
;
/** View with GROUP BY and aggregate functions. Useful for summary/reporting views. */
export interface ViewAggregatedParams {
  /* UUID of the source table */
  source_table_id: string;
  /* Field names to group by */
  group_by_fields: string[];
  /* Array of aggregate specifications */
  aggregates: {
    function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
    /* Field to aggregate (or * for COUNT) */field?: string;
    /* Output column name */alias: string;
  }[];
}
/** Advanced view using composite AST for the query. Use when other node types are insufficient (CTEs, UNIONs, complex subqueries, etc.). */
export interface ViewCompositeParams {
  /* Composite SELECT query AST (JSONB) */
  query_ast: {
    [key: string]: unknown;
  };
}
/** Table projection with an Authz* filter baked into the view definition. The view only returns records matching the filter. */
export interface ViewFilteredTableParams {
  /* UUID of the source table */
  source_table_id: string;
  /* Authz* node type name (e.g., AuthzDirectOwner, AuthzPublishable) */
  filter_type: string;
  /* Parameters for the Authz* filter type */
  filter_data?: {
    [key: string]: unknown;
  };
  /* Optional array of field UUIDs to include (alternative to field_names) */
  field_ids?: string[];
  /* Optional array of field names to include (alternative to field_ids) */
  field_names?: string[];
}
/** View that joins multiple tables together. Supports INNER, LEFT, RIGHT, and FULL joins. */
export interface ViewJoinedTablesParams {
  /* UUID of the primary (left-most) table */
  primary_table_id: string;
  /* Optional array of column names to include from the primary table */
  primary_columns?: string[];
  /* Array of join specifications */
  joins: {
    /* UUID of the joined table */table_id: string;
    join_type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
    /* Field on primary table */primary_field: string;
    /* Field on joined table */join_field: string;
    /* Optional column names to include from this joined table */columns?: string[];
  }[];
  /* Optional array of field UUIDs to include (alternative to per-table columns) */
  field_ids?: string[];
}
/** Simple column selection from a single source table. Projects all or specific fields. */
export interface ViewTableProjectionParams {
  /* UUID of the source table to project from */
  source_table_id: string;
  /* Optional array of field UUIDs to include (all fields if omitted) */
  field_ids?: string[];
  /* Optional array of field names to include (alternative to field_ids) */
  field_names?: string[];
}
/**
 * ===========================================================================
 * Structural types — Static fallback (no _meta provided)
 * ===========================================================================
 */
;
/** A custom field (column) to add to a blueprint table. */
export interface BlueprintField {
  /** The column name. */
  name: string;
  /** The PostgreSQL type (e.g., "text", "integer", "boolean", "uuid"). */
  type: string;
  /** Whether the column has a NOT NULL constraint. */
  is_required?: boolean;
  /** SQL default value expression (e.g., "true", "now()"). */
  default_value?: string;
  /** Comment/description for this field. */
  description?: string;
}
/** An RLS policy entry for a blueprint table. Uses $type to match the blueprint JSON convention. */
export interface BlueprintPolicy {
  /** Authz* policy type name (e.g., "AuthzDirectOwner", "AuthzAllowAll"). */
  $type: 'AuthzAllowAll' | 'AuthzAppMembership' | 'AuthzComposite' | 'AuthzDenyAll' | 'AuthzFilePath' | 'AuthzDirectOwner' | 'AuthzDirectOwnerAny' | 'AuthzEntityMembership' | 'AuthzMemberList' | 'AuthzNotReadOnly' | 'AuthzOrgHierarchy' | 'AuthzPeerOwnership' | 'AuthzPublishable' | 'AuthzRelatedEntityMembership' | 'AuthzRelatedMemberList' | 'AuthzRelatedPeerOwnership' | 'AuthzTemporal';
  /** Privileges this policy applies to (e.g., ["select"], ["insert", "update", "delete"]). */
  privileges?: string[];
  /** Whether this policy is permissive (true) or restrictive (false). Defaults to true. */
  permissive?: boolean;
  /** Role for this policy. Defaults to "authenticated". */
  policy_role?: string;
  /** Optional custom name for this policy. */
  policy_name?: string;
  /** Policy-specific data (structure varies by policy type). */
  data?: Record<string, unknown>;
}
/** A source field contributing to a full-text search tsvector column. */
export interface BlueprintFtsSource {
  /** Column name of the source field. */
  field: string;
  /** TSVector weight: "A", "B", "C", or "D". */
  weight: string;
  /** Language for text search. Defaults to "english". */
  lang?: string;
}
/** A full-text search configuration for a blueprint table (top-level, requires table_name). */
export interface BlueprintFullTextSearch {
  /** Table name this full-text search belongs to. */
  table_name: string;
  /** Optional schema name for disambiguation (falls back to top-level default). */
  schema_name?: string;
  /** Name of the tsvector field on the table. */
  field: string;
  /** Source fields that feed into this tsvector. */
  sources: BlueprintFtsSource[];
}
/** A full-text search configuration nested inside a table definition (table_name not required). */
export interface BlueprintTableFullTextSearch {
  /** Name of the tsvector field on the table. */
  field: string;
  /** Source fields that feed into this tsvector. */
  sources: BlueprintFtsSource[];
  /** Optional schema name override. */
  schema_name?: string;
}
/** An index definition within a blueprint (top-level, requires table_name). */
export interface BlueprintIndex {
  /** Table name this index belongs to. */
  table_name: string;
  /** Optional schema name for disambiguation (falls back to top-level default). */
  schema_name?: string;
  /** Single column name for the index. */
  column?: string;
  /** Array of column names for a multi-column index. */
  columns?: string[];
  /** Index access method (e.g., "BTREE", "GIN", "GIST", "HNSW", "BM25"). */
  access_method: string;
  /** Whether this is a unique index. */
  is_unique?: boolean;
  /** Optional custom name for the index. */
  name?: string;
  /** Operator classes for the index columns. */
  op_classes?: string[];
  /** Additional index-specific options. */
  options?: Record<string, unknown>;
}
/** An index definition nested inside a table definition (table_name not required). */
export interface BlueprintTableIndex {
  /** Single column name for the index. */
  column?: string;
  /** Array of column names for a multi-column index. */
  columns?: string[];
  /** Index access method (e.g., "BTREE", "GIN", "GIST", "HNSW", "BM25"). */
  access_method: string;
  /** Whether this is a unique index. */
  is_unique?: boolean;
  /** Optional custom name for the index. */
  name?: string;
  /** Operator classes for the index columns. */
  op_classes?: string[];
  /** Additional index-specific options. */
  options?: Record<string, unknown>;
  /** Optional schema name override. */
  schema_name?: string;
}
/** A unique constraint definition within a blueprint (top-level, requires table_name). */
export interface BlueprintUniqueConstraint {
  /** Table name this unique constraint belongs to. */
  table_name: string;
  /** Optional schema name for disambiguation (falls back to top-level default). */
  schema_name?: string;
  /** Column names that form the unique constraint. */
  columns: string[];
}
/** A unique constraint nested inside a table definition (table_name not required). */
export interface BlueprintTableUniqueConstraint {
  /** Column names that form the unique constraint. */
  columns: string[];
  /** Optional schema name override. */
  schema_name?: string;
}
/** A bucket seed entry for storage_config.buckets[]. Creates an initial bucket row in the {prefix}_buckets table during entity type provisioning. Only used for app-level storage (not entity-scoped). */
export interface BlueprintBucketSeed {
  /** Bucket key name (e.g., "avatars", "documents"). Becomes the key column value. */
  name: string;
  /** Human-readable description of this bucket. */
  description?: string;
  /** Whether the bucket is publicly readable. Defaults to false. */
  is_public?: boolean;
  /** MIME type allowlist (e.g., ["image/png", "image/jpeg"]). NULL means all types allowed. */
  allowed_mime_types?: string[];
  /** Maximum file size in bytes for this bucket. NULL means no limit. */
  max_file_size?: number;
  /** CORS allowed origins for this bucket. */
  allowed_origins?: string[];
}
/** Storage configuration with optional scope. When used at the top level of a blueprint, the scope field controls whether storage is app-level ("app", default) or org-level ("org"). Seeds initial buckets, overrides module-level settings (expiry times, file size limits, CORS), and provides per-table provisioning overrides via provisions. */
export interface BlueprintStorageConfig {
  /** Storage scope. "app" (default) creates app-level storage (no owner_id). "org" creates per-org/user storage (owner_id = org entity id, buckets seeded per-entity via AFTER INSERT trigger). Only "app" and "org" are allowed — child entity types get storage via entity_types[].storage. */
  scope?: 'app' | 'org';
  /** Discriminator for multi-module storage. Defaults to "default" (omitted from table names). Non-default keys appear as an infix: {prefix}_{storage_key}_buckets. Max 16 chars, lowercase snake_case. */
  storage_key?: string;
  /** Initial bucket seed entries. Each creates a row in {prefix}_buckets during provisioning. */
  buckets?: BlueprintBucketSeed[];
  /** Override for presigned upload URL expiry time in seconds. */
  upload_url_expiry_seconds?: number;
  /** Override for presigned download URL expiry time in seconds. */
  download_url_expiry_seconds?: number;
  /** Default maximum file size in bytes for the storage module. */
  default_max_file_size?: number;
  /** CORS allowed origins for the storage module. */
  allowed_origins?: string[];
  /** Enable deferred upload confirmation via HeadObject. When true, creates SECURITY DEFINER status transition functions (confirm_uploaded, mark_processed) and an AFTER INSERT trigger that enqueues a storage:confirm_upload job. The job verifies the file exists in S3 before transitioning status from requested to uploaded. Defaults to false. */
  has_confirm_upload?: boolean;
  /** Delay before the first upload confirmation attempt (PostgreSQL interval string, e.g. "30 seconds"). Only used when has_confirm_upload is true. Defaults to "30 seconds". */
  confirm_upload_delay?: string;
  /** Per-table overrides for storage tables. Each key targets a specific storage table (files, buckets) and uses the same shape as table_provision: { nodes, fields, grants, use_rls, policies }. Fanned out to secure_table_provision targeting the corresponding table. When a key includes policies[], those REPLACE the default storage policies for that table; tables without a key still get defaults. */
  provisions?: {
    files?: BlueprintEntityTableProvision;
    buckets?: BlueprintEntityTableProvision;
  };
}
/** A requirement entry within a blueprint achievement. Defines what events must occur to earn the achievement. */
export interface BlueprintAchievementRequirement {
  /** Name identifier matching an event_type or step name. */
  event_name: string;
  /** Number of events needed to satisfy this requirement. */
  count: number;
  /** Human-readable description of what this requirement entails. */
  description?: string;
}
/** A reward entry within a blueprint achievement. Defines credits granted when the achievement is earned. */
export interface BlueprintAchievementReward {
  /** Type of reward: limit_credit (grants limit credits) or meter_credit (grants meter credits). */
  reward_type: 'limit_credit' | 'meter_credit';
  /** Target limit name or meter slug for the credit grant. */
  target_name: string;
  /** Number of credits to grant. */
  amount: number;
  /** Credit type: permanent, expiring, etc. Defaults to "permanent". */
  credit_type?: string;
}
/** An achievement entry for the blueprint achievements[] section. Creates a level with requirements and optional rewards in the events_module. Requires events_module to be provisioned (e.g., via entity_types[].has_levels = true or modules includes events_module). */
export interface BlueprintAchievement {
  /** Unique name for the achievement level. */
  name: string;
  /** Human-readable description of this achievement. */
  description?: string;
  /** Display ordering priority; lower values appear first. Defaults to 100. */
  priority?: number;
  /** Requirements that must be met to earn this achievement. */
  requirements: BlueprintAchievementRequirement[];
  /** Rewards granted when the achievement is earned. */
  rewards?: BlueprintAchievementReward[];
  /** Entity prefix to scope this achievement to (e.g., "org", "app"). Used to resolve the correct events_module. Defaults to "app". */
  entity_prefix?: string;
}
/** Override object for the entity table created by a BlueprintEntityType. Shape mirrors BlueprintTable / secure_table_provision vocabulary. When supplied, policies[] replaces the default entity-table policies entirely. */
export interface BlueprintEntityTableProvision {
  /** Whether to enable RLS on the entity table. Forwarded to secure_table_provision. Defaults to true. */
  use_rls?: boolean;
  /** Node objects applied to the entity table for field creation (e.g., DataTimestamps, DataPeoplestamps). Forwarded to secure_table_provision as-is. */
  nodes?: BlueprintNode[];
  /** Custom fields (columns) to add to the entity table. Forwarded to secure_table_provision as-is. */
  fields?: BlueprintField[];
  /** Unified grant objects for the entity table. Each entry is { roles: string[], privileges: unknown[] } where privileges are [verb, columns] tuples. Forwarded to secure_table_provision as-is. Defaults to []. */
  grants?: {
    roles: string[];
    privileges: unknown[];
  }[];
  /** RLS policies for the entity table. When present, these policies fully replace the five default entity-table policies (is_visible becomes a no-op). */
  policies?: BlueprintPolicy[];
}
/** An entity type entry for Phase 0 of construct_blueprint(). When name is provided, provisions a new entity type with its own entity table, membership modules, and security policies via entity_type_provision. When name is omitted and only prefix is given, extends an existing entity type (e.g., the built-in "org") with additional capabilities like storage — without creating a new entity type. */
export interface BlueprintEntityType {
  /** Entity type name (e.g., "data_room", "channel", "department"). Required when creating a new entity type. Omit when extending an existing entity type (e.g., prefix: "org") — the entry will add storage/config to the existing type without creating a new one. */
  name?: string;
  /** Short prefix for generated objects (e.g., "dr", "ch", "dept"). Used in table/trigger naming. */
  prefix: string;
  /** Human-readable description of this entity type. */
  description?: string;
  /** Parent entity type name. Defaults to "org". */
  parent_entity?: string;
  /** Custom table name for the entity table. Defaults to name-derived convention. */
  table_name?: string;
  /** Whether parent-entity members can see child entities via the default parent_member SELECT policy. Gates one of the five default policies. No-op when table_provision is supplied. Defaults to true. */
  is_visible?: boolean;
  /** Whether to provision a limits module for this entity type. Defaults to false. */
  has_limits?: boolean;
  /** Whether to provision a profiles module for this entity type. Defaults to false. */
  has_profiles?: boolean;
  /** Whether to provision a levels module for this entity type. Defaults to false. */
  has_levels?: boolean;

  /** Whether to provision entity-scoped invite tables ({prefix}_invites, {prefix}_claimed_invites) and a submit_{prefix}_invite_code() function. Defaults to false. */
  has_invites?: boolean;
  /** Whether to auto-attach an EventTracker to the claimed_invites table for invite-based achievements. Requires has_invites=true AND has_levels=true. When true, records 'invite_claimed' events credited to the sender (inviter) on each claimed invite. Defaults to false. */
  has_invite_achievements?: boolean;
  /** Escape hatch: when true AND table_provision is NULL, zero policies are provisioned on the entity table. Defaults to false. */
  skip_entity_policies?: boolean;
  /** Override for the entity table. Shape mirrors BlueprintTable / secure_table_provision vocabulary. When supplied, its policies[] replaces the five default entity-table policies; is_visible becomes a no-op. When NULL (default), the five default policies are applied (gated by is_visible). */
  table_provision?: BlueprintEntityTableProvision;
  /** Storage configuration (array-only). A non-empty array enables storage provisioning. Each entry creates a separate storage module with its own tables ({prefix}_{storage_key}_buckets/files). Controls RLS policies, bucket seeding, and module-level settings. */
  storage?: BlueprintStorageConfig[];
}
/**
 * ===========================================================================
 * Node types -- discriminated union for nodes[] entries
 * ===========================================================================
 */
;
/** String shorthand -- just the node type name. */
export type BlueprintNodeShorthand = 'AuthzAllowAll' | 'AuthzAppMembership' | 'AuthzComposite' | 'AuthzDenyAll' | 'AuthzFilePath' | 'AuthzDirectOwner' | 'AuthzDirectOwnerAny' | 'AuthzEntityMembership' | 'AuthzMemberList' | 'AuthzNotReadOnly' | 'AuthzOrgHierarchy' | 'AuthzPeerOwnership' | 'AuthzPublishable' | 'AuthzRelatedEntityMembership' | 'AuthzRelatedMemberList' | 'AuthzRelatedPeerOwnership' | 'AuthzTemporal' | 'CheckGreaterThan' | 'CheckLessThan' | 'CheckNotEqual' | 'CheckOneOf' | 'LimitAggregate' | 'BillingMeter' | 'DataBulk' | 'ProcessChunks' | 'DataCompositeField' | 'DataDirectOwner' | 'DataEntityMembership' | 'ProcessFileEmbedding' | 'LimitFeatureFlag' | 'DataForceCurrentUser' | 'DataId' | 'ProcessImageEmbedding' | 'DataImmutableFields' | 'DataInflection' | 'DataInheritFromParent' | 'JobTrigger' | 'LimitCounter' | 'DataJsonb' | 'DataOwnedFields' | 'ProcessExtraction' | 'ProcessImageVersions' | 'DataOwnershipInEntity' | 'DataPeoplestamps' | 'DataPublishable' | 'DataRealtime' | 'DataSlug' | 'DataSoftDelete' | 'DataStatusField' | 'DataTags' | 'DataTimestamps' | 'SearchBm25' | 'SearchFullText' | 'SearchSpatial' | 'SearchSpatialAggregate' | 'SearchTrgm' | 'SearchUnified' | 'SearchVector' | 'TableOrganizationSettings' | 'TableUserProfiles' | 'TableUserSettings';
/** Object form -- { $type, data } with typed parameters. */
export type BlueprintNodeObject = {
  $type: 'AuthzAllowAll';
  data?: Record<string, never>;
} | {
  $type: 'AuthzAppMembership';
  data: AuthzAppMembershipParams;
} | {
  $type: 'AuthzComposite';
  data: AuthzCompositeParams;
} | {
  $type: 'AuthzDenyAll';
  data?: Record<string, never>;
} | {
  $type: 'AuthzFilePath';
  data: AuthzFilePathParams;
} | {
  $type: 'AuthzDirectOwner';
  data: AuthzDirectOwnerParams;
} | {
  $type: 'AuthzDirectOwnerAny';
  data: AuthzDirectOwnerAnyParams;
} | {
  $type: 'AuthzEntityMembership';
  data: AuthzEntityMembershipParams;
} | {
  $type: 'AuthzMemberList';
  data: AuthzMemberListParams;
} | {
  $type: 'AuthzNotReadOnly';
  data: AuthzNotReadOnlyParams;
} | {
  $type: 'AuthzOrgHierarchy';
  data: AuthzOrgHierarchyParams;
} | {
  $type: 'AuthzPeerOwnership';
  data: AuthzPeerOwnershipParams;
} | {
  $type: 'AuthzPublishable';
  data: AuthzPublishableParams;
} | {
  $type: 'AuthzRelatedEntityMembership';
  data: AuthzRelatedEntityMembershipParams;
} | {
  $type: 'AuthzRelatedMemberList';
  data: AuthzRelatedMemberListParams;
} | {
  $type: 'AuthzRelatedPeerOwnership';
  data: AuthzRelatedPeerOwnershipParams;
} | {
  $type: 'AuthzTemporal';
  data: AuthzTemporalParams;
} | {
  $type: 'CheckGreaterThan';
  data: CheckGreaterThanParams;
} | {
  $type: 'CheckLessThan';
  data: CheckLessThanParams;
} | {
  $type: 'CheckNotEqual';
  data: CheckNotEqualParams;
} | {
  $type: 'CheckOneOf';
  data: CheckOneOfParams;
} | {
  $type: 'LimitAggregate';
  data: LimitAggregateParams;
} | {
  $type: 'BillingMeter';
  data: BillingMeterParams;
} | {
  $type: 'DataBulk';
  data: DataBulkParams;
} | {
  $type: 'ProcessChunks';
  data: ProcessChunksParams;
} | {
  $type: 'DataCompositeField';
  data: DataCompositeFieldParams;
} | {
  $type: 'DataDirectOwner';
  data: DataDirectOwnerParams;
} | {
  $type: 'DataEntityMembership';
  data: DataEntityMembershipParams;
} | {
  $type: 'ProcessFileEmbedding';
  data: ProcessFileEmbeddingParams;
} | {
  $type: 'LimitFeatureFlag';
  data: LimitFeatureFlagParams;
} | {
  $type: 'DataForceCurrentUser';
  data: DataForceCurrentUserParams;
} | {
  $type: 'DataId';
  data: DataIdParams;
} | {
  $type: 'ProcessImageEmbedding';
  data: ProcessImageEmbeddingParams;
} | {
  $type: 'DataImmutableFields';
  data: DataImmutableFieldsParams;
} | {
  $type: 'DataInflection';
  data: DataInflectionParams;
} | {
  $type: 'DataInheritFromParent';
  data: DataInheritFromParentParams;
} | {
  $type: 'JobTrigger';
  data: JobTriggerParams;
} | {
  $type: 'LimitCounter';
  data: LimitCounterParams;
} | {
  $type: 'DataJsonb';
  data: DataJsonbParams;
} | {
  $type: 'DataOwnedFields';
  data: DataOwnedFieldsParams;
} | {
  $type: 'ProcessExtraction';
  data: ProcessExtractionParams;
} | {
  $type: 'ProcessImageVersions';
  data: ProcessImageVersionsParams;
} | {
  $type: 'DataOwnershipInEntity';
  data: DataOwnershipInEntityParams;
} | {
  $type: 'DataPeoplestamps';
  data: DataPeoplestampsParams;
} | {
  $type: 'DataPublishable';
  data: DataPublishableParams;
} | {
  $type: 'DataRealtime';
  data: DataRealtimeParams;
} | {
  $type: 'DataSlug';
  data: DataSlugParams;
} | {
  $type: 'DataSoftDelete';
  data: DataSoftDeleteParams;
} | {
  $type: 'DataStatusField';
  data: DataStatusFieldParams;
} | {
  $type: 'DataTags';
  data: DataTagsParams;
} | {
  $type: 'DataTimestamps';
  data: DataTimestampsParams;
} | {
  $type: 'SearchBm25';
  data: SearchBm25Params;
} | {
  $type: 'SearchFullText';
  data: SearchFullTextParams;
} | {
  $type: 'SearchSpatial';
  data: SearchSpatialParams;
} | {
  $type: 'SearchSpatialAggregate';
  data: SearchSpatialAggregateParams;
} | {
  $type: 'SearchTrgm';
  data: SearchTrgmParams;
} | {
  $type: 'SearchUnified';
  data: SearchUnifiedParams;
} | {
  $type: 'SearchVector';
  data: SearchVectorParams;
} | {
  $type: 'TableOrganizationSettings';
  data?: Record<string, never>;
} | {
  $type: 'TableUserProfiles';
  data?: Record<string, never>;
} | {
  $type: 'TableUserSettings';
  data?: Record<string, never>;
};
/** A node entry in a blueprint table. Either a string shorthand or a typed object. */
export type BlueprintNode = BlueprintNodeShorthand | BlueprintNodeObject;
/**
 * ===========================================================================
 * Relation types
 * ===========================================================================
 */
;
/** A relation entry in a blueprint definition. */
export type BlueprintRelation = {
  $type: 'RelationBelongsTo';
  source_table: string;
  target_table: string;
  source_schema_name?: string;
  target_schema_name?: string;
} & Partial<RelationBelongsToParams> | {
  $type: 'RelationHasMany';
  source_table: string;
  target_table: string;
  source_schema_name?: string;
  target_schema_name?: string;
} & Partial<RelationHasManyParams> | {
  $type: 'RelationHasOne';
  source_table: string;
  target_table: string;
  source_schema_name?: string;
  target_schema_name?: string;
} & Partial<RelationHasOneParams> | {
  $type: 'RelationManyToMany';
  source_table: string;
  target_table: string;
  source_schema_name?: string;
  target_schema_name?: string;
} & Partial<RelationManyToManyParams> | {
  $type: 'RelationSpatial';
  source_table: string;
  target_table: string;
  source_schema_name?: string;
  target_schema_name?: string;
  /** Name of the geometry/geography column on source_table that carries the @spatialRelation smart tag. */source_field: string;
  /** Name of the geometry/geography column on target_table that the predicate is evaluated against. */target_field: string;
} & Partial<RelationSpatialParams>;
/**
 * ===========================================================================
 * Blueprint table and definition
 * ===========================================================================
 */
;
/** A table definition within a blueprint. */
export interface BlueprintTable {
  /** The PostgreSQL table name to create. */
  table_name: string;
  /** Optional schema name (falls back to top-level default). */
  schema_name?: string;
  /** Array of node type entries that define the table's behavior. */
  nodes: BlueprintNode[];
  /** Custom fields (columns) to add to the table. */
  fields?: BlueprintField[];
  /** RLS policies for this table. */
  policies?: BlueprintPolicy[];
  /** Unified grant objects. Each entry is { roles: string[], privileges: unknown[] } where privileges are [verb, columns] tuples (e.g. [["select","*"]]). Enables per-role targeting. Defaults to []. */
  grants?: {
    roles: string[];
    privileges: unknown[];
  }[];
  /** Whether to enable RLS on this table. Defaults to true. */
  use_rls?: boolean;
  /** Table-level indexes (table_name inherited from parent). */
  indexes?: BlueprintTableIndex[];
  /** Table-level full-text search configurations (table_name inherited from parent). */
  full_text_searches?: BlueprintTableFullTextSearch[];
  /** Table-level unique constraints (table_name inherited from parent). */
  unique_constraints?: BlueprintTableUniqueConstraint[];
}
/** The complete blueprint definition -- the JSONB shape accepted by construct_blueprint(). */
export interface BlueprintDefinition {
  /** Tables to create. */
  tables: BlueprintTable[];
  /** Relations between tables. */
  relations?: BlueprintRelation[];
  /** Indexes on table columns. */
  indexes?: BlueprintIndex[];
  /** Full-text search configurations. */
  full_text_searches?: BlueprintFullTextSearch[];
  /** Unique constraints on table columns. */
  unique_constraints?: BlueprintUniqueConstraint[];
  /** Entity types to provision in Phase 0 (before tables). Each entry creates an entity table with membership modules and security. */
  entity_types?: BlueprintEntityType[];
  /** Top-level storage configuration array. Each entry has an optional scope ("app" or "org"). App-scoped (default) creates storage_module with membership_type = NULL. Org-scoped creates per-org/user storage with owner_id and AFTER INSERT bucket seeding. When infra is installed, a private "functions" bucket is auto-injected into org-scoped entries. For child entity type storage, use entity_types[].storage instead. */
  storage?: BlueprintStorageConfig[];
  /** Achievement definitions. Each entry creates a level with requirements and optional rewards in the events_module. Requires events_module to be provisioned (e.g., via entity_types[].has_levels = true or modules includes events_module). */
  achievements?: BlueprintAchievement[];
}
