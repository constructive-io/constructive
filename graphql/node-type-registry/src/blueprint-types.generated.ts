// GENERATED FILE — DO NOT EDIT
//
// Regenerate with:
//   cd graphql/node-type-registry && pnpm generate:types
//
// These types match the JSONB shape expected by construct_blueprint().
// All field names are snake_case to match the SQL convention.

/**
 * ===========================================================================
 * Data node type parameters
 * ===========================================================================
 */
;
/** Adds a UUID primary key column with auto-generation default (uuidv7). This is the standard primary key pattern for all tables. */
export interface DataIdParams {
  /* Column name for the primary key */
  field_name?: string;
}
/** Adds ownership column for direct user ownership. Enables AuthzDirectOwner authorization. */
export interface DataDirectOwnerParams {
  /* Column name for owner ID */
  owner_field_name?: string;
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
  /* If true, adds a foreign key constraint from owner_id to the users table */
  include_user_fk?: boolean;
}
/** Adds entity reference for organization/group scoping. Enables AuthzEntityMembership, AuthzMembership, AuthzOrgHierarchy authorization. */
export interface DataEntityMembershipParams {
  /* Column name for entity ID */
  entity_field_name?: string;
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
  /* If true, adds a foreign key constraint from entity_id to the users table */
  include_user_fk?: boolean;
}
/** Combines direct ownership with entity scoping. Adds both owner_id and entity_id columns. Enables AuthzDirectOwner, AuthzEntityMembership, and AuthzOrgHierarchy authorization. Particularly useful for OrgHierarchy where a user owns a row (owner_id) within an entity (entity_id), and managers above can see subordinate-owned records via the hierarchy closure table. */
export interface DataOwnershipInEntityParams {
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
  /* If true, adds foreign key constraints from owner_id and entity_id to the users table */
  include_user_fk?: boolean;
}
/** Adds automatic timestamp tracking with created_at and updated_at columns. */
export interface DataTimestampsParams {
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
}
/** Adds user tracking for creates/updates with created_by and updated_by columns. */
export interface DataPeoplestampsParams {
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
  /* If true, adds foreign key constraints from created_by and updated_by to the users table */
  include_user_fk?: boolean;
}
/** Adds publish state columns (is_published, published_at) for content visibility. Enables AuthzPublishable and AuthzTemporal authorization. */
export interface DataPublishableParams {
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
}
/** Adds soft delete support with deleted_at and is_deleted columns. */
export interface DataSoftDeleteParams {
  /* If true, also adds a UUID primary key column with auto-generation */
  include_id?: boolean;
}
/** Dynamically creates PostgreSQL triggers that enqueue jobs via app_jobs.add_job() when table rows are inserted, updated, or deleted. Supports configurable payload strategies (full row, row ID, selected fields, or custom mapping), conditional firing via WHEN clauses, watched field changes, and extended job options (queue, priority, delay, max attempts). */
export interface DataJobTriggerParams {
  /* Job task identifier passed to add_job (e.g., process_invoice, sync_to_stripe) */
  task_identifier: string;
  /* How to build the job payload: row (full NEW/OLD), row_id (just id), fields (selected columns), custom (mapped columns) */
  payload_strategy?: "row" | "row_id" | "fields" | "custom";
  /* Column names to include in payload (only for fields strategy) */
  payload_fields?: string[];
  /* Key-to-column mapping for custom payload (e.g., {"invoice_id": "id", "total": "amount"}) */
  payload_custom?: {
    [key: string]: unknown;
  };
  /* Trigger events to create */
  events?: ("INSERT" | "UPDATE" | "DELETE")[];
  /* Include OLD row in payload (for UPDATE triggers) */
  include_old?: boolean;
  /* Include table/schema metadata in payload */
  include_meta?: boolean;
  /* Column name for conditional WHEN clause (fires only when field equals condition_value) */
  condition_field?: string;
  /* Value to compare against condition_field in WHEN clause */
  condition_value?: string;
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
/** Adds a citext[] tags column with GIN index for efficient array containment queries (@>, &&). Standard tagging pattern for categorization and filtering. */
export interface DataTagsParams {
  /* Column name for the tags array */
  field_name?: string;
  /* Default value expression for the tags column */
  default_value?: string;
  /* Whether the column has a NOT NULL constraint */
  is_required?: boolean;
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
/** Auto-generates URL-friendly slugs from field values on insert/update. Attaches BEFORE INSERT and BEFORE UPDATE triggers that call inflection.slugify() on the target field. References fields by name in data jsonb. */
export interface DataSlugParams {
  /* Name of the field to slugify */
  field_name: string;
  /* Optional source field name (defaults to field_name) */
  source_field_name?: string;
}
/** Transforms field values using inflection operations (snake_case, camelCase, slugify, plural, singular, etc). Attaches BEFORE INSERT and BEFORE UPDATE triggers. References fields by name in data jsonb. */
export interface DataInflectionParams {
  /* Name of the field to transform */
  field_name: string;
  /* Inflection operations to apply in order */
  ops: ("plural" | "singular" | "camel" | "pascal" | "dashed" | "slugify" | "underscore" | "lower" | "upper")[];
}
/** Restricts which user can modify specific columns in shared objects. Creates an AFTER UPDATE trigger that throws OWNED_PROPS when a non-owner tries to change protected fields. References fields by name in data jsonb. */
export interface DataOwnedFieldsParams {
  /* Name of the field identifying the owner (e.g. sender_id) */
  role_key_field_name: string;
  /* Names of fields only this owner can modify */
  protected_field_names: string[];
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
/** BEFORE INSERT trigger that forces a field to the value of jwt_public.current_user_id(). Prevents clients from spoofing the actor/uploader identity. The field value is always overwritten regardless of what the client provides. */
export interface DataForceCurrentUserParams {
  /* Name of the field to force to current_user_id() */
  field_name?: string;
}
/** BEFORE UPDATE trigger that prevents changes to a list of specified fields after INSERT. Raises an exception if any of the listed fields have changed. Unlike FieldImmutable (single-field), this handles multiple fields in a single trigger for efficiency. */
export interface DataImmutableFieldsParams {
  /* Field names that cannot be modified after INSERT (e.g. ["key", "bucket_id", "owner_id"]) */
  fields: string[];
}
/** Creates a derived text field that automatically concatenates multiple source fields via BEFORE INSERT/UPDATE triggers. Used to produce a unified text representation (e.g., embedding_text) from multiple columns on a table. The trigger fires with '_000' prefix to run before Search* triggers alphabetically. */
export interface DataCompositeFieldParams {
  /* Name of the derived text field to create (default: 'embedding_text') */
  target?: string;
  /* Array of source field names to concatenate into the target field */
  source_fields: string[];
  /* Output format: 'labeled' (field_name: value) or 'plain' (values only). Default: 'labeled' */
  format?: "labeled" | "plain";
}
/** Creates a user profiles table with standard profile fields (profile_picture, bio, first_name, last_name, tags, desired). Uses AuthzDirectOwner for edit access and AuthzAllowAll for select. */
export type TableUserProfilesParams = {};
/** Creates an organization settings table with standard business fields (legal_name, address fields). Uses AuthzEntityMembership for access control. */
export type TableOrganizationSettingsParams = {};
/** Creates a user settings table for user-specific configuration. Uses AuthzDirectOwner for access control. */
export type TableUserSettingsParams = {};
/**
 * ===========================================================================
 * Search node type parameters
 * ===========================================================================
 */
;
/** Adds a vector embedding column with HNSW or IVFFlat index for similarity search. Supports configurable dimensions, distance metrics (cosine, l2, ip), stale tracking strategies (column, null, hash), and automatic job enqueue triggers for embedding generation. */
export interface SearchVectorParams {
  /* Name of the vector column */
  field_name?: string;
  /* Vector dimensions (e.g. 384, 768, 1536, 3072) */
  dimensions?: number;
  /* Index type for similarity search */
  index_method?: "hnsw" | "ivfflat";
  /* Distance metric (cosine, l2, ip) */
  metric?: "cosine" | "l2" | "ip";
  /* Index-specific options. HNSW: {m, ef_construction}. IVFFlat: {lists}. */
  index_options?: {
    [key: string]: unknown;
  };
  /* When stale_strategy is column, adds an embedding_stale boolean field */
  include_stale_field?: boolean;
  /* Column names that feed the embedding. Used by stale trigger to detect content changes. */
  source_fields?: string[];
  /* Auto-create trigger that enqueues embedding generation jobs */
  enqueue_job?: boolean;
  /* Task identifier for the job queue */
  job_task_name?: string;
  /* Strategy for tracking embedding staleness. column: embedding_stale boolean. null: set embedding to NULL. hash: md5 hash of source fields. */
  stale_strategy?: "column" | "null" | "hash";
  /* Chunking configuration for long-text embedding. Creates an embedding_chunks record that drives automatic text splitting and per-chunk embedding. Omit to skip chunking. */
  chunks?: {
    /* Name of the text content column in the chunks table */content_field_name?: string;
    /* Maximum number of characters per chunk */chunk_size?: number;
    /* Number of overlapping characters between consecutive chunks */chunk_overlap?: number;
    /* Strategy for splitting text into chunks */chunk_strategy?: "fixed" | "sentence" | "paragraph" | "semantic";
    /* Metadata fields from parent to copy into chunks */metadata_fields?: {
      [key: string]: unknown;
    };
    /* Whether to auto-enqueue a chunking job on insert/update */enqueue_chunking_job?: boolean;
    /* Task identifier for the chunking job queue */chunking_task_name?: string;
  };
}
/** Adds a tsvector column with GIN index and automatic trigger population from source fields. Enables PostgreSQL full-text search with configurable weights and language support. Leverages the existing metaschema full_text_search infrastructure. */
export interface SearchFullTextParams {
  /* Name of the tsvector column */
  field_name?: string;
  /* Source columns that feed the tsvector. Each has a field name, weight (A-D), and language config. */
  source_fields: {
    /* Name of the source column */field: string;
    /* tsvector weight class (A=highest, D=lowest) */weight?: "A" | "B" | "C" | "D";
    /* PostgreSQL text search configuration */lang?: string;
  }[];
  /* Weight for this algorithm in composite searchScore */
  search_score_weight?: number;
}
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
/** Composite node type that orchestrates multiple search modalities (full-text search, BM25, embeddings, trigram) on a single table. Configures per-table search score weights, normalization strategy, and recency boost via the @searchConfig smart tag. */
export interface SearchUnifiedParams {
  /* SearchFullText parameters. Omit to skip FTS setup. */
  full_text_search?: {
    field_name?: string;
    source_fields?: {
      field: string;
      weight?: "A" | "B" | "C" | "D";
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
    index_method?: "hnsw" | "ivfflat";
    metric?: "cosine" | "l2" | "ip";
    source_fields?: string[];
    search_score_weight?: number;
    /* Chunking configuration for long-text embedding. Creates an embedding_chunks record that drives automatic text splitting and per-chunk embedding. Omit to skip chunking. */chunks?: {
      /* Name of the text content column in the chunks table */content_field_name?: string;
      /* Maximum number of characters per chunk */chunk_size?: number;
      /* Number of overlapping characters between consecutive chunks */chunk_overlap?: number;
      /* Strategy for splitting text into chunks */chunk_strategy?: "fixed" | "sentence" | "paragraph" | "semantic";
      /* Metadata fields from parent to copy into chunks */metadata_fields?: {
        [key: string]: unknown;
      };
      /* Whether to auto-enqueue a chunking job on insert/update */enqueue_chunking_job?: boolean;
      /* Task identifier for the chunking job queue */chunking_task_name?: string;
    };
  };
  /* Field names to tag with @trgmSearch for fuzzy/typo-tolerant matching */
  trgm_fields?: string[];
  /* Unified search score configuration written to @searchConfig smart tag */
  search_config?: {
    /* Per-algorithm weights: {tsv: 1.5, bm25: 1.0, pgvector: 0.8, trgm: 0.3} */weights?: {
      [key: string]: unknown;
    };
    /* Score normalization strategy */normalization?: "linear" | "sigmoid";
    /* Enable recency boost for search results */boost_recent?: boolean;
    /* Timestamp field for recency boost (e.g. created_at, updated_at) */boost_recency_field?: string;
    /* Decay rate for recency boost (0-1, lower = faster decay) */boost_recency_decay?: number;
  };
}
/** Adds a PostGIS geometry or geography column with a spatial index (GiST or SP-GiST). Supports configurable geometry types (Point, Polygon, etc.), SRID, and dimensionality. The graphile-postgis plugin auto-detects geometry/geography columns by codec type for spatial filtering (ST_Contains, ST_DWithin, bbox operators). */
export interface SearchSpatialParams {
  /* Name of the geometry/geography column */
  field_name?: string;
  /* PostGIS geometry type constraint */
  geometry_type?: "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon" | "GeometryCollection" | "Geometry";
  /* Spatial Reference System Identifier (e.g. 4326 for WGS84) */
  srid?: number;
  /* Coordinate dimension (2=XY, 3=XYZ, 4=XYZM) */
  dimension?: 2 | 3 | 4;
  /* Use geography type instead of geometry (for geodetic calculations on the sphere) */
  use_geography?: boolean;
  /* Spatial index method */
  index_method?: "gist" | "spgist";
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
  aggregate_function?: "union" | "collect" | "convex_hull" | "concave_hull";
  /* Output geometry type constraint for the aggregate field */
  geometry_type?: "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon" | "GeometryCollection" | "Geometry";
  /* Spatial Reference System Identifier (e.g. 4326 for WGS84) */
  srid?: number;
  /* Coordinate dimension (2=XY, 3=XYZ, 4=XYZM) */
  dimension?: 2 | 3 | 4;
  /* Use geography type instead of geometry */
  use_geography?: boolean;
  /* Spatial index method for the aggregate field */
  index_method?: "gist" | "spgist";
}
/** Creates GIN trigram indexes (gin_trgm_ops) on specified text/citext fields for fuzzy LIKE/ILIKE/similarity search. Adds @trgmSearch smart tag for PostGraphile integration. Fields must already exist on the table. */
export interface SearchTrgmParams {
  /* Field names to create trigram indexes on (fields must already exist on the table) */
  fields: string[];
}
/**
 * ===========================================================================
 * Authz node type parameters
 * ===========================================================================
 */
;
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
/** Membership check that verifies the user has membership (optionally with specific permission) without binding to any entity from the row. Uses EXISTS subquery against SPRT table. */
export interface AuthzMembershipParams {
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
/** Membership check scoped by a field on the row through the SPRT table. Verifies user has membership in the entity referenced by the row. */
export interface AuthzEntityMembershipParams {
  /* Column name referencing the entity (e.g., entity_id, org_id) */
  entity_field: string;
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
/** JOIN-based membership verification through related tables. Joins SPRT table with another table to verify membership. */
export interface AuthzRelatedEntityMembershipParams {
  /* Column name on protected table referencing the join table */
  entity_field: string;
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
/** Organizational hierarchy visibility using closure table. Managers can see subordinate data or subordinates can see manager data. */
export interface AuthzOrgHierarchyParams {
  /* down=manager sees subordinates, up=subordinate sees managers */
  direction: "up" | "down";
  /* Field referencing the org entity */
  entity_field?: string;
  /* Field referencing the user (e.g., owner_id) */
  anchor_field: string;
  /* Optional max depth to limit visibility */
  max_depth?: number;
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
/** Published state access control. Restricts access to records that are published. */
export interface AuthzPublishableParams {
  /* Boolean field indicating published state */
  is_published_field?: string;
  /* Timestamp field for publish time */
  published_at_field?: string;
  /* Require published_at to be non-null and <= now() */
  require_published_at?: boolean;
}
/** Check if current user is in an array column on the same row. */
export interface AuthzMemberListParams {
  /* Column name containing the array of user IDs */
  array_field: string;
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
/** Allows all access. Generates TRUE expression. */
export type AuthzAllowAllParams = {};
/** Denies all access. Generates FALSE expression. */
export type AuthzDenyAllParams = {};
/** Composite authorization policy that combines multiple authorization nodes using boolean logic (AND/OR). The data field contains a JSONB AST with nested authorization nodes. */
export interface AuthzCompositeParams {
  /* Boolean expression combining multiple authorization nodes */
  BoolExpr?: {
    /* Boolean operator: AND_EXPR, OR_EXPR, or NOT_EXPR */boolop?: "AND_EXPR" | "OR_EXPR" | "NOT_EXPR";
    /* Array of authorization nodes to combine */args?: {
      [key: string]: unknown;
    }[];
  };
}
/** Restrictive policy that blocks read-only members from mutations. Checks actor_id + is_read_only IS NOT TRUE on the SPRT. Designed to run as a restrictive counterpart after a permissive AuthzEntityMembership policy has already verified membership. */
export interface AuthzNotReadOnlyParams {
  /* Column name referencing the entity (e.g., entity_id, org_id) */
  entity_field: string;
  /* Scope: 2=org, 3+=dynamic entity types. Must be >= 2 (entity-scoped). */
  membership_type?: number | string;
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
  /* Field on related table to select for matching entity_field (defaults to id) */
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
  delete_action: "c" | "r" | "n" | "d" | "a";
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
  delete_action: "c" | "r" | "n" | "d" | "a";
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
  delete_action: "c" | "r" | "n" | "d" | "a";
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
  /* Database roles to grant privileges to. Forwarded to secure_table_provision as-is. Default: [authenticated] */
  grant_roles?: string[];
  /* Privilege grants for the junction table as [verb, columns] tuples (e.g. [['select','*'],['insert','*']]). Forwarded to secure_table_provision as-is. Default: select/insert/delete for all columns */
  grant_privileges?: string[][];
  /* RLS policy type for the junction table. Forwarded to secure_table_provision as-is. NULL means no policy. */
  policy_type?: string;
  /* Privileges the policy applies to. Forwarded to secure_table_provision as-is. NULL means derived from grant_privileges verbs. */
  policy_privileges?: string[];
  /* Database role the policy targets. Forwarded to secure_table_provision as-is. NULL means falls back to first grant_role. */
  policy_role?: string;
  /* Whether the policy is PERMISSIVE (true) or RESTRICTIVE (false). Forwarded to secure_table_provision as-is. */
  policy_permissive?: boolean;
  /* Policy configuration forwarded to secure_table_provision as-is. Structure varies by policy_type. */
  policy_data?: {
    [key: string]: unknown;
  };
}
/**
 * ===========================================================================
 * View node type parameters
 * ===========================================================================
 */
;
/** Simple column selection from a single source table. Projects all or specific fields. */
export interface ViewTableProjectionParams {
  /* UUID of the source table to project from */
  source_table_id: string;
  /* Optional array of field UUIDs to include (all fields if omitted) */
  field_ids?: string[];
  /* Optional array of field names to include (alternative to field_ids) */
  field_names?: string[];
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
    join_type?: "INNER" | "LEFT" | "RIGHT" | "FULL";
    /* Field on primary table */primary_field: string;
    /* Field on joined table */join_field: string;
    /* Optional column names to include from this joined table */columns?: string[];
  }[];
  /* Optional array of field UUIDs to include (alternative to per-table columns) */
  field_ids?: string[];
}
/** View with GROUP BY and aggregate functions. Useful for summary/reporting views. */
export interface ViewAggregatedParams {
  /* UUID of the source table */
  source_table_id: string;
  /* Field names to group by */
  group_by_fields: string[];
  /* Array of aggregate specifications */
  aggregates: {
    function: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
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
  $type: "AuthzDirectOwner" | "AuthzDirectOwnerAny" | "AuthzMembership" | "AuthzEntityMembership" | "AuthzRelatedEntityMembership" | "AuthzOrgHierarchy" | "AuthzTemporal" | "AuthzPublishable" | "AuthzMemberList" | "AuthzRelatedMemberList" | "AuthzAllowAll" | "AuthzDenyAll" | "AuthzComposite" | "AuthzNotReadOnly" | "AuthzPeerOwnership" | "AuthzRelatedPeerOwnership";
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
/** A membership type entry for Phase 0 of construct_blueprint(). Provisions a full entity type with its own entity table, membership modules, and security policies via entity_type_provision. */
export interface BlueprintMembershipType {
  /** Entity type name (e.g., "data_room", "channel", "department"). Must be unique per database. */
  name: string;
  /** Short prefix for generated objects (e.g., "dr", "ch", "dept"). Used in table/trigger naming. */
  prefix: string;
  /** Human-readable description of this entity type. */
  description?: string;
  /** Parent entity type name. Defaults to "org". */
  parent_entity?: string;
  /** Custom table name for the entity table. Defaults to name-derived convention. */
  table_name?: string;
  /** Whether this entity type is visible in the API. Defaults to true. */
  is_visible?: boolean;
  /** Whether to provision a limits module for this entity type. Defaults to false. */
  has_limits?: boolean;
  /** Whether to provision a profiles module for this entity type. Defaults to false. */
  has_profiles?: boolean;
  /** Whether to provision a levels module for this entity type. Defaults to false. */
  has_levels?: boolean;
  /** Whether to skip creating default RLS policies on the entity table. Defaults to false. */
  skip_entity_policies?: boolean;
}
/**
 * ===========================================================================
 * Node types -- discriminated union for nodes[] entries
 * ===========================================================================
 */
;
/** String shorthand -- just the node type name. */
export type BlueprintNodeShorthand = "AuthzDirectOwner" | "AuthzDirectOwnerAny" | "AuthzMembership" | "AuthzEntityMembership" | "AuthzRelatedEntityMembership" | "AuthzOrgHierarchy" | "AuthzTemporal" | "AuthzPublishable" | "AuthzMemberList" | "AuthzRelatedMemberList" | "AuthzAllowAll" | "AuthzDenyAll" | "AuthzComposite" | "AuthzNotReadOnly" | "AuthzPeerOwnership" | "AuthzRelatedPeerOwnership" | "DataId" | "DataDirectOwner" | "DataEntityMembership" | "DataOwnershipInEntity" | "DataTimestamps" | "DataPeoplestamps" | "DataPublishable" | "DataSoftDelete" | "SearchVector" | "SearchFullText" | "SearchBm25" | "SearchUnified" | "SearchSpatial" | "SearchSpatialAggregate" | "DataJobTrigger" | "DataTags" | "DataStatusField" | "DataJsonb" | "SearchTrgm" | "DataSlug" | "DataInflection" | "DataOwnedFields" | "DataInheritFromParent" | "DataForceCurrentUser" | "DataImmutableFields" | "DataCompositeField" | "TableUserProfiles" | "TableOrganizationSettings" | "TableUserSettings";
/** Object form -- { $type, data } with typed parameters. */
export type BlueprintNodeObject = {
  $type: "AuthzDirectOwner";
  data: AuthzDirectOwnerParams;
} | {
  $type: "AuthzDirectOwnerAny";
  data: AuthzDirectOwnerAnyParams;
} | {
  $type: "AuthzMembership";
  data: AuthzMembershipParams;
} | {
  $type: "AuthzEntityMembership";
  data: AuthzEntityMembershipParams;
} | {
  $type: "AuthzRelatedEntityMembership";
  data: AuthzRelatedEntityMembershipParams;
} | {
  $type: "AuthzOrgHierarchy";
  data: AuthzOrgHierarchyParams;
} | {
  $type: "AuthzTemporal";
  data: AuthzTemporalParams;
} | {
  $type: "AuthzPublishable";
  data: AuthzPublishableParams;
} | {
  $type: "AuthzMemberList";
  data: AuthzMemberListParams;
} | {
  $type: "AuthzRelatedMemberList";
  data: AuthzRelatedMemberListParams;
} | {
  $type: "AuthzAllowAll";
  data?: Record<string, never>;
} | {
  $type: "AuthzDenyAll";
  data?: Record<string, never>;
} | {
  $type: "AuthzComposite";
  data: AuthzCompositeParams;
} | {
  $type: "AuthzNotReadOnly";
  data: AuthzNotReadOnlyParams;
} | {
  $type: "AuthzPeerOwnership";
  data: AuthzPeerOwnershipParams;
} | {
  $type: "AuthzRelatedPeerOwnership";
  data: AuthzRelatedPeerOwnershipParams;
} | {
  $type: "DataId";
  data: DataIdParams;
} | {
  $type: "DataDirectOwner";
  data: DataDirectOwnerParams;
} | {
  $type: "DataEntityMembership";
  data: DataEntityMembershipParams;
} | {
  $type: "DataOwnershipInEntity";
  data: DataOwnershipInEntityParams;
} | {
  $type: "DataTimestamps";
  data: DataTimestampsParams;
} | {
  $type: "DataPeoplestamps";
  data: DataPeoplestampsParams;
} | {
  $type: "DataPublishable";
  data: DataPublishableParams;
} | {
  $type: "DataSoftDelete";
  data: DataSoftDeleteParams;
} | {
  $type: "SearchVector";
  data: SearchVectorParams;
} | {
  $type: "SearchFullText";
  data: SearchFullTextParams;
} | {
  $type: "SearchBm25";
  data: SearchBm25Params;
} | {
  $type: "SearchUnified";
  data: SearchUnifiedParams;
} | {
  $type: "SearchSpatial";
  data: SearchSpatialParams;
} | {
  $type: "SearchSpatialAggregate";
  data: SearchSpatialAggregateParams;
} | {
  $type: "DataJobTrigger";
  data: DataJobTriggerParams;
} | {
  $type: "DataTags";
  data: DataTagsParams;
} | {
  $type: "DataStatusField";
  data: DataStatusFieldParams;
} | {
  $type: "DataJsonb";
  data: DataJsonbParams;
} | {
  $type: "SearchTrgm";
  data: SearchTrgmParams;
} | {
  $type: "DataSlug";
  data: DataSlugParams;
} | {
  $type: "DataInflection";
  data: DataInflectionParams;
} | {
  $type: "DataOwnedFields";
  data: DataOwnedFieldsParams;
} | {
  $type: "DataInheritFromParent";
  data: DataInheritFromParentParams;
} | {
  $type: "DataForceCurrentUser";
  data: DataForceCurrentUserParams;
} | {
  $type: "DataImmutableFields";
  data: DataImmutableFieldsParams;
} | {
  $type: "DataCompositeField";
  data: DataCompositeFieldParams;
} | {
  $type: "TableUserProfiles";
  data?: Record<string, never>;
} | {
  $type: "TableOrganizationSettings";
  data?: Record<string, never>;
} | {
  $type: "TableUserSettings";
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
  $type: "RelationBelongsTo";
  source_table: string;
  target_table: string;
  source_schema_name?: string;
  target_schema_name?: string;
} & Partial<RelationBelongsToParams> | {
  $type: "RelationHasOne";
  source_table: string;
  target_table: string;
  source_schema_name?: string;
  target_schema_name?: string;
} & Partial<RelationHasOneParams> | {
  $type: "RelationHasMany";
  source_table: string;
  target_table: string;
  source_schema_name?: string;
  target_schema_name?: string;
} & Partial<RelationHasManyParams> | {
  $type: "RelationManyToMany";
  source_table: string;
  target_table: string;
  source_schema_name?: string;
  target_schema_name?: string;
} & Partial<RelationManyToManyParams>;
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
  /** Database roles to grant privileges to. Defaults to ["authenticated"]. */
  grant_roles?: string[];
  /** Privilege grants as [verb, column] tuples or objects. Defaults to empty (no grants — callers must explicitly specify). */
  grants?: unknown[];
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
  membership_types?: BlueprintMembershipType[];
}
