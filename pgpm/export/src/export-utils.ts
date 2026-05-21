import { mkdirSync, rmSync } from 'fs';
import { sync as glob } from 'glob';
import { Inquirerer } from 'inquirerer';
import { toSnakeCase } from 'inflekt';
import path from 'path';

import { PgpmPackage, getMissingInstallableModules, parseAuthor } from '@pgpmjs/core';

// =============================================================================
// Shared constants
// =============================================================================

/**
 * Required extensions for database schema exports.
 * Includes native PostgreSQL extensions and pgpm modules.
 */
export const DB_REQUIRED_EXTENSIONS = [
  'plpgsql',
  'uuid-ossp',
  'citext',
  'pgcrypto',
  'btree_gin',
  'btree_gist',
  'pg_textsearch',
  'pg_trgm',
  'postgis',
  'hstore',
  'vector',
  'ltree',
  'metaschema-schema',
  'pgpm-inflection',
  'pgpm-utils',
  'pgpm-database-jobs',
  'pgpm-jwt-claims',
  'pgpm-stamps',
  'pgpm-base32',
  'pgpm-totp',
  'pgpm-types',
  'pgpm-ltree-helpers',
  'pgpm-partman'
] as const;

/**
 * Map PostgreSQL data types to FieldType values.
 * Uses udt_name from information_schema which gives the base type name.
 */
const mapPgTypeToFieldType = (udtName: string): FieldType => {
  switch (udtName) {
    case 'uuid':
      return 'uuid';
    case '_uuid':
      return 'uuid[]';
    case 'text':
    case 'varchar':
    case 'bpchar':
    case 'name':
      return 'text';
    case '_text':
    case '_varchar':
      return 'text[]';
    case 'bool':
      return 'boolean';
    case 'jsonb':
    case 'json':
      return 'jsonb';
    case '_jsonb':
      return 'jsonb[]';
    case 'int4':
    case 'int8':
    case 'int2':
    case 'numeric':
      return 'int';
    case 'interval':
      return 'interval';
    case 'timestamptz':
    case 'timestamp':
      return 'timestamptz';
    default:
      return 'text';
  }
};

/**
 * Required extensions for service/meta exports.
 * Includes native PostgreSQL extensions and pgpm modules for metadata management.
 */
export const SERVICE_REQUIRED_EXTENSIONS = [
  'plpgsql',
  'metaschema-schema',
  'metaschema-modules',
  'services'
] as const;

/**
 * Common SQL header for meta export files.
 * Sets session_replication_role and grants necessary permissions.
 */
export const META_COMMON_HEADER = `SET session_replication_role TO replica;
-- using replica in case we are deploying triggers to metaschema_public

-- unaccent, postgis affected and require grants
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public to public;

DO $LQLMIGRATION$
  DECLARE
  BEGIN

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');

  END;
$LQLMIGRATION$;`;

/**
 * Common SQL footer for meta export files.
 */
export const META_COMMON_FOOTER = `
SET session_replication_role TO DEFAULT;`;

/**
 * Ordered list of meta tables for export.
 * Tables are processed in this order to satisfy foreign key dependencies.
 */
export const META_TABLE_ORDER = [
  'database',
  'schema',
  'function',
  'table',
  'field',
  'spatial_relation',
  'policy',
  'index',
  'trigger',
  'trigger_function',
  'rls_function',
  'foreign_key_constraint',
  'primary_key_constraint',
  'unique_constraint',
  'check_constraint',
  'full_text_search',
  'schema_grant',
  'table_grant',
  'default_privilege',
  'domains',
  'sites',
  'apis',
  'apps',
  'site_modules',
  'site_themes',
  'site_metadata',
  'api_modules',
  'api_extensions',
  'api_schemas',
  'database_settings',
  'api_settings',
  'rls_settings',
  'cors_settings',
  'pubkey_settings',
  'webauthn_settings',
  'rls_module',
  'user_auth_module',
  'memberships_module',
  'permissions_module',
  'limits_module',
  'events_module',
  'users_module',
  'hierarchy_module',
  'membership_types_module',
  'invites_module',
  'emails_module',
  'sessions_module',
  'user_state_module',
  'profiles_module',
  'config_secrets_user_module',
  'connected_accounts_module',
  'phone_numbers_module',
  'crypto_addresses_module',
  'crypto_auth_module',
  'field_module',
  'table_module',
  'secure_table_provision',
  'uuid_module',
  'default_ids_module',
  'denormalized_table_field',
  // NOTE: blueprint_template, blueprint, and blueprint_construction are intentionally
  // excluded from the export flow — they are runtime-only tables not exported as metadata.
  'relation_provision',
  'entity_type_provision',
  'rate_limits_module',
  'storage_module',
  'billing_module',
  'billing_provider_module',
  'devices_module',
  'identity_providers_module',
  'notifications_module',
  'plans_module',
  'realtime_module',
  'session_secrets_module',
  'config_secrets_org_module',
  'webauthn_auth_module',
  'webauthn_credentials_module',
  'inference_log_module',
  'rate_limit_meters_module'
] as const;

// =============================================================================
// Shared types for table config
// =============================================================================

export type FieldType = 'uuid' | 'uuid[]' | 'text' | 'text[]' | 'boolean' | 'image' | 'upload' | 'url' | 'jsonb' | 'jsonb[]' | 'int' | 'interval' | 'timestamptz';

export interface TableConfig {
  schema: string;
  table: string;
  conflictDoNothing?: boolean;
  fields: Record<string, FieldType>;
}

/**
 * Shared metadata table configuration.
 * 
 * This is the **superset** of fields needed by both the SQL export flow
 * (export-meta.ts) and the GraphQL export flow (export-graphql-meta.ts).
 * Each flow dynamically filters to only the fields that actually exist:
 * - SQL flow: uses buildDynamicFields() to intersect with information_schema
 * - GraphQL flow: filters to fields present in the returned data
 * 
 * Adding a field here that doesn't exist in a particular environment is safe.
 */
export const META_TABLE_CONFIG: Record<string, TableConfig> = {
  // =============================================================================
  // metaschema_public tables
  // =============================================================================
  database: {
    schema: 'metaschema_public',
    table: 'database',
    fields: {
      id: 'uuid',
      owner_id: 'uuid',
      name: 'text',
      hash: 'uuid'
    }
  },
  schema: {
    schema: 'metaschema_public',
    table: 'schema',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      name: 'text',
      schema_name: 'text',
      description: 'text',
      is_public: 'boolean'
    }
  },
  function: {
    schema: 'metaschema_public',
    table: 'function',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      name: 'text'
    }
  },
  table: {
    schema: 'metaschema_public',
    table: 'table',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      name: 'text',
      description: 'text'
    }
  },
  field: {
    schema: 'metaschema_public',
    table: 'field',
    // Use ON CONFLICT DO NOTHING to handle the unique constraint (databases_field_uniq_names_idx)
    // which normalizes UUID field names by stripping suffixes like _id, _uuid, etc.
    // This causes collisions when tables have both 'foo' (text) and 'foo_id' (uuid) columns.
    conflictDoNothing: true,
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      name: 'text',
      type: 'text',
      description: 'text'
    }
  },
  policy: {
    schema: 'metaschema_public',
    table: 'policy',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      name: 'text',
      grantee_name: 'text',
      privilege: 'text',
      permissive: 'boolean',
      disabled: 'boolean',
      policy_type: 'text',
      data: 'jsonb'
    }
  },
  index: {
    schema: 'metaschema_public',
    table: 'index',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      name: 'text',
      field_ids: 'uuid[]',
      include_field_ids: 'uuid[]',
      access_method: 'text',
      index_params: 'jsonb',
      where_clause: 'jsonb',
      is_unique: 'boolean'
    }
  },
  trigger: {
    schema: 'metaschema_public',
    table: 'trigger',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      name: 'text',
      event: 'text',
      function_name: 'text'
    }
  },
  trigger_function: {
    schema: 'metaschema_public',
    table: 'trigger_function',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      name: 'text',
      code: 'text'
    }
  },
  rls_function: {
    schema: 'metaschema_public',
    table: 'rls_function',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      name: 'text',
      label: 'text',
      description: 'text',
      data: 'jsonb',
      inline: 'boolean',
      security: 'int'
    }
  },
  foreign_key_constraint: {
    schema: 'metaschema_public',
    table: 'foreign_key_constraint',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      name: 'text',
      description: 'text',
      smart_tags: 'jsonb',
      type: 'text',
      field_ids: 'uuid[]',
      ref_table_id: 'uuid',
      ref_field_ids: 'uuid[]',
      delete_action: 'text',
      update_action: 'text'
    }
  },
  primary_key_constraint: {
    schema: 'metaschema_public',
    table: 'primary_key_constraint',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      name: 'text',
      type: 'text',
      field_ids: 'uuid[]'
    }
  },
  unique_constraint: {
    schema: 'metaschema_public',
    table: 'unique_constraint',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      name: 'text',
      description: 'text',
      smart_tags: 'jsonb',
      type: 'text',
      field_ids: 'uuid[]'
    }
  },
  check_constraint: {
    schema: 'metaschema_public',
    table: 'check_constraint',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      name: 'text',
      type: 'text',
      field_ids: 'uuid[]',
      expr: 'jsonb'
    }
  },
  full_text_search: {
    schema: 'metaschema_public',
    table: 'full_text_search',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      field_id: 'uuid',
      field_ids: 'uuid[]',
      weights: 'text[]',
      langs: 'text[]'
    }
  },
  schema_grant: {
    schema: 'metaschema_public',
    table: 'schema_grant',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      grantee_name: 'text'
    }
  },
  table_grant: {
    schema: 'metaschema_public',
    table: 'table_grant',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      privilege: 'text',
      grantee_name: 'text',
      field_ids: 'uuid[]',
      is_grant: 'boolean'
    }
  },
  default_privilege: {
    schema: 'metaschema_public',
    table: 'default_privilege',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      object_type: 'text',
      privilege: 'text',
      grantee_name: 'text',
      is_grant: 'boolean'
    }
  },
  // =============================================================================
  // services_public tables
  // =============================================================================
  domains: {
    schema: 'services_public',
    table: 'domains',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      site_id: 'uuid',
      api_id: 'uuid',
      domain: 'text',
      subdomain: 'text'
    }
  },
  sites: {
    schema: 'services_public',
    table: 'sites',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      title: 'text',
      description: 'text',
      og_image: 'image',
      favicon: 'upload',
      apple_touch_icon: 'image',
      logo: 'image'
    }
  },
  apis: {
    schema: 'services_public',
    table: 'apis',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      name: 'text',
      is_public: 'boolean',
      role_name: 'text',
      anon_role: 'text'
    }
  },
  apps: {
    schema: 'services_public',
    table: 'apps',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      site_id: 'uuid',
      name: 'text',
      app_image: 'image',
      app_store_link: 'url',
      app_store_id: 'text',
      app_id_prefix: 'text',
      play_store_link: 'url'
    }
  },
  site_modules: {
    schema: 'services_public',
    table: 'site_modules',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      site_id: 'uuid',
      name: 'text',
      data: 'jsonb'
    }
  },
  site_themes: {
    schema: 'services_public',
    table: 'site_themes',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      site_id: 'uuid',
      theme: 'jsonb'
    }
  },
  site_metadata: {
    schema: 'services_public',
    table: 'site_metadata',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      site_id: 'uuid',
      title: 'text',
      description: 'text',
      og_image: 'image'
    }
  },
  api_modules: {
    schema: 'services_public',
    table: 'api_modules',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      api_id: 'uuid',
      name: 'text',
      data: 'jsonb'
    }
  },
  api_extensions: {
    schema: 'services_public',
    table: 'api_extensions',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      api_id: 'uuid',
      name: 'text'
    }
  },
  api_schemas: {
    schema: 'services_public',
    table: 'api_schemas',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      api_id: 'uuid'
    }
  },
  database_settings: {
    schema: 'services_public',
    table: 'database_settings',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      enable_aggregates: 'boolean',
      enable_postgis: 'boolean',
      enable_search: 'boolean',
      enable_direct_uploads: 'boolean',
      enable_presigned_uploads: 'boolean',
      enable_many_to_many: 'boolean',
      enable_connection_filter: 'boolean',
      enable_ltree: 'boolean',
      enable_llm: 'boolean',
      enable_bulk: 'boolean',
      options: 'jsonb'
    }
  },
  api_settings: {
    schema: 'services_public',
    table: 'api_settings',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      api_id: 'uuid',
      enable_aggregates: 'boolean',
      enable_postgis: 'boolean',
      enable_search: 'boolean',
      enable_direct_uploads: 'boolean',
      enable_presigned_uploads: 'boolean',
      enable_many_to_many: 'boolean',
      enable_connection_filter: 'boolean',
      enable_ltree: 'boolean',
      enable_llm: 'boolean',
      enable_bulk: 'boolean',
      options: 'jsonb'
    }
  },
  rls_settings: {
    schema: 'services_public',
    table: 'rls_settings',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      authenticate_schema_id: 'uuid',
      role_schema_id: 'uuid',
      authenticate_function_id: 'uuid',
      authenticate_strict_function_id: 'uuid',
      current_role_function_id: 'uuid',
      current_role_id_function_id: 'uuid',
      current_user_agent_function_id: 'uuid',
      current_ip_address_function_id: 'uuid'
    }
  },
  cors_settings: {
    schema: 'services_public',
    table: 'cors_settings',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      api_id: 'uuid',
      allowed_origins: 'text[]'
    }
  },
  pubkey_settings: {
    schema: 'services_public',
    table: 'pubkey_settings',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      crypto_network: 'text',
      user_field: 'text',
      sign_up_with_key_function_id: 'uuid',
      sign_in_request_challenge_function_id: 'uuid',
      sign_in_record_failure_function_id: 'uuid',
      sign_in_with_challenge_function_id: 'uuid'
    }
  },
  webauthn_settings: {
    schema: 'services_public',
    table: 'webauthn_settings',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      credentials_schema_id: 'uuid',
      sessions_schema_id: 'uuid',
      session_secrets_schema_id: 'uuid',
      credentials_table_id: 'uuid',
      sessions_table_id: 'uuid',
      session_credentials_table_id: 'uuid',
      session_secrets_table_id: 'uuid',
      user_field_id: 'uuid',
      rp_id: 'text',
      rp_name: 'text',
      origin_allowlist: 'text[]',
      attestation_type: 'text',
      require_user_verification: 'boolean',
      resident_key: 'text',
      challenge_expiry_seconds: 'int'
    }
  },
  // =============================================================================
  // metaschema_modules_public tables
  // =============================================================================
  rls_module: {
    schema: 'metaschema_modules_public',
    table: 'rls_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      session_credentials_table_id: 'uuid',
      sessions_table_id: 'uuid',
      users_table_id: 'uuid',
      authenticate: 'text',
      authenticate_strict: 'text',
      current_role: 'text',
      current_role_id: 'text'
    }
  },
  user_auth_module: {
    schema: 'metaschema_modules_public',
    table: 'user_auth_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      emails_table_id: 'uuid',
      users_table_id: 'uuid',
      secrets_table_id: 'uuid',
      encrypted_table_id: 'uuid',
      sessions_table_id: 'uuid',
      session_credentials_table_id: 'uuid',
      audits_table_id: 'uuid',
      audits_table_name: 'text',
      sign_in_function: 'text',
      sign_up_function: 'text',
      sign_out_function: 'text',
      sign_in_cross_origin_function: 'text',
      request_cross_origin_token_function: 'text',
      extend_token_expires: 'text',
      send_account_deletion_email_function: 'text',
      delete_account_function: 'text',
      set_password_function: 'text',
      reset_password_function: 'text',
      forgot_password_function: 'text',
      send_verification_email_function: 'text',
      verify_email_function: 'text',
      verify_password_function: 'text',
      check_password_function: 'text'
    }
  },
  memberships_module: {
    schema: 'metaschema_modules_public',
    table: 'memberships_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      memberships_table_id: 'uuid',
      memberships_table_name: 'text',
      members_table_id: 'uuid',
      members_table_name: 'text',
      membership_defaults_table_id: 'uuid',
      membership_defaults_table_name: 'text',
      grants_table_id: 'uuid',
      grants_table_name: 'text',
      actor_table_id: 'uuid',
      limits_table_id: 'uuid',
      default_limits_table_id: 'uuid',
      permissions_table_id: 'uuid',
      default_permissions_table_id: 'uuid',
      sprt_table_id: 'uuid',
      admin_grants_table_id: 'uuid',
      admin_grants_table_name: 'text',
      owner_grants_table_id: 'uuid',
      owner_grants_table_name: 'text',
      membership_type: 'int',
      entity_table_id: 'uuid',
      entity_table_owner_id: 'uuid',
      prefix: 'text',
      actor_mask_check: 'text',
      actor_perm_check: 'text',
      entity_ids_by_mask: 'text',
      entity_ids_by_perm: 'text',
      entity_ids_function: 'text'
    }
  },
  permissions_module: {
    schema: 'metaschema_modules_public',
    table: 'permissions_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text',
      default_table_id: 'uuid',
      default_table_name: 'text',
      bitlen: 'int',
      membership_type: 'int',
      entity_table_id: 'uuid',
      actor_table_id: 'uuid',
      prefix: 'text',
      get_padded_mask: 'text',
      get_mask: 'text',
      get_by_mask: 'text',
      get_mask_by_name: 'text'
    }
  },
  limits_module: {
    schema: 'metaschema_modules_public',
    table: 'limits_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text',
      default_table_id: 'uuid',
      default_table_name: 'text',
      limit_increment_function: 'text',
      limit_decrement_function: 'text',
      limit_increment_trigger: 'text',
      limit_decrement_trigger: 'text',
      limit_update_trigger: 'text',
      limit_check_function: 'text',
      prefix: 'text',
      membership_type: 'int',
      entity_table_id: 'uuid',
      actor_table_id: 'uuid'
    }
  },
  events_module: {
    schema: 'metaschema_modules_public',
    table: 'events_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      events_table_id: 'uuid',
      events_table_name: 'text',
      event_aggregates_table_id: 'uuid',
      event_aggregates_table_name: 'text',
      event_types_table_id: 'uuid',
      event_types_table_name: 'text',
      levels_table_id: 'uuid',
      levels_table_name: 'text',
      level_requirements_table_id: 'uuid',
      level_requirements_table_name: 'text',
      level_grants_table_id: 'uuid',
      level_grants_table_name: 'text',
      achievement_rewards_table_id: 'uuid',
      achievement_rewards_table_name: 'text',
      record_event: 'text',
      remove_event: 'text',
      tg_event: 'text',
      tg_event_toggle: 'text',
      tg_event_toggle_bool: 'text',
      tg_event_bool: 'text',
      upsert_aggregate: 'text',
      tg_update_aggregates: 'text',
      prune_events: 'text',
      steps_required: 'text',
      level_achieved: 'text',
      tg_check_achievements: 'text',
      grant_achievement: 'text',
      tg_achievement_reward: 'text',
      interval: 'text',
      retention: 'text',
      premake: 'int',
      prefix: 'text',
      membership_type: 'int',
      entity_table_id: 'uuid',
      actor_table_id: 'uuid'
    }
  },
  users_module: {
    schema: 'metaschema_modules_public',
    table: 'users_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text',
      type_table_id: 'uuid',
      type_table_name: 'text'
    }
  },
  hierarchy_module: {
    schema: 'metaschema_modules_public',
    table: 'hierarchy_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      chart_edges_table_id: 'uuid',
      chart_edges_table_name: 'text',
      hierarchy_sprt_table_id: 'uuid',
      hierarchy_sprt_table_name: 'text',
      chart_edge_grants_table_id: 'uuid',
      chart_edge_grants_table_name: 'text',
      entity_table_id: 'uuid',
      users_table_id: 'uuid',
      prefix: 'text',
      private_schema_name: 'text',
      sprt_table_name: 'text',
      rebuild_hierarchy_function: 'text',
      get_subordinates_function: 'text',
      get_managers_function: 'text',
      is_manager_of_function: 'text'
    }
  },
  membership_types_module: {
    schema: 'metaschema_modules_public',
    table: 'membership_types_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text'
    }
  },
  invites_module: {
    schema: 'metaschema_modules_public',
    table: 'invites_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      emails_table_id: 'uuid',
      users_table_id: 'uuid',
      invites_table_id: 'uuid',
      claimed_invites_table_id: 'uuid',
      invites_table_name: 'text',
      claimed_invites_table_name: 'text',
      submit_invite_code_function: 'text',
      prefix: 'text',
      membership_type: 'int',
      entity_table_id: 'uuid'
    }
  },
  emails_module: {
    schema: 'metaschema_modules_public',
    table: 'emails_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      owner_table_id: 'uuid',
      table_name: 'text'
    }
  },
  sessions_module: {
    schema: 'metaschema_modules_public',
    table: 'sessions_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      sessions_table_id: 'uuid',
      session_credentials_table_id: 'uuid',
      auth_settings_table_id: 'uuid',
      users_table_id: 'uuid',
      sessions_default_expiration: 'interval',
      sessions_table: 'text',
      session_credentials_table: 'text',
      auth_settings_table: 'text'
    }
  },
  user_state_module: {
    schema: 'metaschema_modules_public',
    table: 'user_state_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text'
    }
  },
  profiles_module: {
    schema: 'metaschema_modules_public',
    table: 'profiles_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text',
      profile_permissions_table_id: 'uuid',
      profile_permissions_table_name: 'text',
      profile_grants_table_id: 'uuid',
      profile_grants_table_name: 'text',
      profile_definition_grants_table_id: 'uuid',
      profile_definition_grants_table_name: 'text',
      membership_type: 'int',
      entity_table_id: 'uuid',
      actor_table_id: 'uuid',
      permissions_table_id: 'uuid',
      memberships_table_id: 'uuid',
      prefix: 'text'
    }
  },
  config_secrets_user_module: {
    schema: 'metaschema_modules_public',
    table: 'config_secrets_user_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text'
    }
  },
  connected_accounts_module: {
    schema: 'metaschema_modules_public',
    table: 'connected_accounts_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      owner_table_id: 'uuid',
      table_name: 'text'
    }
  },
  phone_numbers_module: {
    schema: 'metaschema_modules_public',
    table: 'phone_numbers_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      owner_table_id: 'uuid',
      table_name: 'text'
    }
  },
  crypto_addresses_module: {
    schema: 'metaschema_modules_public',
    table: 'crypto_addresses_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      owner_table_id: 'uuid',
      table_name: 'text',
      crypto_network: 'text'
    }
  },
  crypto_auth_module: {
    schema: 'metaschema_modules_public',
    table: 'crypto_auth_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      users_table_id: 'uuid',
      sessions_table_id: 'uuid',
      session_credentials_table_id: 'uuid',
      secrets_table_id: 'uuid',
      addresses_table_id: 'uuid',
      user_field: 'text',
      crypto_network: 'text',
      sign_in_request_challenge: 'text',
      sign_in_record_failure: 'text',
      sign_up_with_key: 'text',
      sign_in_with_challenge: 'text'
    }
  },
  field_module: {
    schema: 'metaschema_modules_public',
    table: 'field_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      field_id: 'uuid',
      node_type: 'text',
      data: 'jsonb',
      triggers: 'text[]',
      functions: 'text[]'
    }
  },
  table_module: {
    schema: 'metaschema_modules_public',
    table: 'table_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      node_type: 'text',
      data: 'jsonb',
      fields: 'uuid[]'
    }
  },
  // NOTE: table_template_module has been removed from pgpm-modules (superseded by blueprints)
  secure_table_provision: {
    schema: 'metaschema_modules_public',
    table: 'secure_table_provision',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text',
      nodes: 'jsonb',
      use_rls: 'boolean',
      fields: 'jsonb[]',
      grants: 'jsonb',
      policies: 'jsonb',
      out_fields: 'uuid[]'
    }
  },
  uuid_module: {
    schema: 'metaschema_modules_public',
    table: 'uuid_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      uuid_function: 'text',
      uuid_seed: 'text'
    }
  },
  default_ids_module: {
    schema: 'metaschema_modules_public',
    table: 'default_ids_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid'
    }
  },
  denormalized_table_field: {
    schema: 'metaschema_modules_public',
    table: 'denormalized_table_field',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      field_id: 'uuid',
      set_ids: 'uuid[]',
      ref_table_id: 'uuid',
      ref_field_id: 'uuid',
      ref_ids: 'uuid[]',
      use_updates: 'boolean',
      update_defaults: 'boolean',
      func_name: 'text',
      func_order: 'int'
    }
  },
  relation_provision: {
    schema: 'metaschema_modules_public',
    table: 'relation_provision',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      relation_type: 'text',
      source_table_id: 'uuid',
      target_table_id: 'uuid',
      field_name: 'text',
      delete_action: 'text',
      is_required: 'boolean',
      api_required: 'boolean',
      junction_table_id: 'uuid',
      junction_table_name: 'text',
      junction_schema_id: 'uuid',
      source_field_name: 'text',
      target_field_name: 'text',
      use_composite_key: 'boolean',
      create_index: 'boolean',
      expose_in_api: 'boolean',
      nodes: 'jsonb',
      grants: 'jsonb',
      policies: 'jsonb',
      out_field_id: 'uuid',
      out_junction_table_id: 'uuid',
      out_source_field_id: 'uuid',
      out_target_field_id: 'uuid'
    }
  },
  rate_limits_module: {
    schema: 'metaschema_modules_public',
    table: 'rate_limits_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      rate_limit_settings_table_id: 'uuid',
      ip_rate_limits_table_id: 'uuid',
      rate_limits_table_id: 'uuid',
      rate_limit_settings_table: 'text',
      ip_rate_limits_table: 'text',
      rate_limits_table: 'text'
    }
  },
  storage_module: {
    schema: 'metaschema_modules_public',
    table: 'storage_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      buckets_table_id: 'uuid',
      files_table_id: 'uuid',
      buckets_table_name: 'text',
      files_table_name: 'text',
      membership_type: 'int',
      policies: 'jsonb',
      skip_default_policy_tables: 'text[]',
      entity_table_id: 'uuid',
      endpoint: 'text',
      public_url_prefix: 'text',
      provider: 'text',
      allowed_origins: 'text[]',
      restrict_reads: 'boolean',
      has_path_shares: 'boolean',
      path_shares_table_id: 'uuid',
      upload_url_expiry_seconds: 'int',
      download_url_expiry_seconds: 'int',
      max_filename_length: 'int',
      cache_ttl_seconds: 'int',
      max_bulk_files: 'int',
      has_versioning: 'boolean',
      has_content_hash: 'boolean',
      has_custom_keys: 'boolean',
      has_audit_log: 'boolean',
      file_events_table_id: 'uuid'
    }
  },
  entity_type_provision: {
    schema: 'metaschema_modules_public',
    table: 'entity_type_provision',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      name: 'text',
      prefix: 'text',
      description: 'text',
      parent_entity: 'text',
      table_name: 'text',
      is_visible: 'boolean',
      has_limits: 'boolean',
      has_profiles: 'boolean',
      has_levels: 'boolean',
      has_storage: 'boolean',
      has_invites: 'boolean',
      storage_config: 'jsonb',
      skip_entity_policies: 'boolean',
      table_provision: 'jsonb',
      out_membership_type: 'int',
      out_entity_table_id: 'uuid',
      out_entity_table_name: 'text',
      out_installed_modules: 'text[]',
      out_storage_module_id: 'uuid',
      out_buckets_table_id: 'uuid',
      out_files_table_id: 'uuid',
      out_path_shares_table_id: 'uuid',
      out_invites_module_id: 'uuid'
    }
  },
  billing_module: {
    schema: 'metaschema_modules_public',
    table: 'billing_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      meters_table_id: 'uuid',
      meters_table_name: 'text',
      plan_subscriptions_table_id: 'uuid',
      plan_subscriptions_table_name: 'text',
      ledger_table_id: 'uuid',
      ledger_table_name: 'text',
      balances_table_id: 'uuid',
      balances_table_name: 'text',
      record_usage_function: 'text',
      prefix: 'text'
    }
  },
  billing_provider_module: {
    schema: 'metaschema_modules_public',
    table: 'billing_provider_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      provider: 'text',
      products_table_id: 'uuid',
      prices_table_id: 'uuid',
      subscriptions_table_id: 'uuid',
      billing_customers_table_id: 'uuid',
      billing_customers_table_name: 'text',
      billing_products_table_id: 'uuid',
      billing_products_table_name: 'text',
      billing_prices_table_id: 'uuid',
      billing_prices_table_name: 'text',
      billing_subscriptions_table_id: 'uuid',
      billing_subscriptions_table_name: 'text',
      billing_webhook_events_table_id: 'uuid',
      billing_webhook_events_table_name: 'text',
      process_billing_event_function: 'text',
      prefix: 'text'
    }
  },
  devices_module: {
    schema: 'metaschema_modules_public',
    table: 'devices_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      user_devices_table_id: 'uuid',
      device_settings_table_id: 'uuid',
      user_devices_table: 'text',
      device_settings_table: 'text'
    }
  },
  identity_providers_module: {
    schema: 'metaschema_modules_public',
    table: 'identity_providers_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text'
    }
  },
  notifications_module: {
    schema: 'metaschema_modules_public',
    table: 'notifications_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      notifications_table_id: 'uuid',
      read_state_table_id: 'uuid',
      preferences_table_id: 'uuid',
      channels_table_id: 'uuid',
      delivery_log_table_id: 'uuid',
      owner_table_id: 'uuid',
      user_settings_table_id: 'uuid',
      organization_settings_table_id: 'uuid',
      has_channels: 'boolean',
      has_preferences: 'boolean',
      has_settings_extension: 'boolean',
      has_digest_metadata: 'boolean',
      has_subscriptions: 'boolean'
    }
  },
  plans_module: {
    schema: 'metaschema_modules_public',
    table: 'plans_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      plans_table_id: 'uuid',
      plans_table_name: 'text',
      plan_limits_table_id: 'uuid',
      plan_limits_table_name: 'text',
      plan_pricing_table_id: 'uuid',
      plan_overrides_table_id: 'uuid',
      apply_plan_function: 'text',
      apply_plan_aggregate_function: 'text',
      prefix: 'text'
    }
  },
  realtime_module: {
    schema: 'metaschema_modules_public',
    table: 'realtime_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      subscriptions_schema_id: 'uuid',
      change_log_table_id: 'uuid',
      listener_node_table_id: 'uuid',
      source_registry_table_id: 'uuid',
      retention_hours: 'int',
      lookahead_hours: 'int',
      partition_interval: 'text',
      notify_channel: 'text'
    }
  },
  session_secrets_module: {
    schema: 'metaschema_modules_public',
    table: 'session_secrets_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text',
      sessions_table_id: 'uuid'
    }
  },
  config_secrets_org_module: {
    schema: 'metaschema_modules_public',
    table: 'config_secrets_org_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text'
    }
  },
  webauthn_auth_module: {
    schema: 'metaschema_modules_public',
    table: 'webauthn_auth_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      users_table_id: 'uuid',
      credentials_table_id: 'uuid',
      sessions_table_id: 'uuid',
      session_credentials_table_id: 'uuid',
      session_secrets_table_id: 'uuid',
      auth_settings_table_id: 'uuid',
      rp_id: 'text',
      rp_name: 'text',
      origin_allowlist: 'text[]',
      attestation_type: 'text',
      require_user_verification: 'boolean',
      resident_key: 'text',
      challenge_expiry: 'interval'
    }
  },
  webauthn_credentials_module: {
    schema: 'metaschema_modules_public',
    table: 'webauthn_credentials_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      owner_table_id: 'uuid',
      table_name: 'text'
    }
  },
  inference_log_module: {
    schema: 'metaschema_modules_public',
    table: 'inference_log_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      inference_log_table_id: 'uuid',
      inference_log_table_name: 'text',
      usage_daily_table_id: 'uuid',
      usage_daily_table_name: 'text',
      interval: 'text',
      retention: 'text',
      premake: 'int',
      prefix: 'text'
    }
  },
  rate_limit_meters_module: {
    schema: 'metaschema_modules_public',
    table: 'rate_limit_meters_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      rate_limit_state_table_id: 'uuid',
      rate_limit_state_table_name: 'text',
      rate_limit_overrides_table_id: 'uuid',
      rate_limit_overrides_table_name: 'text',
      rate_window_limits_table_id: 'uuid',
      rate_window_limits_table_name: 'text',
      check_rate_limit_function: 'text',
      prefix: 'text'
    }
  },
  spatial_relation: {
    schema: 'metaschema_public',
    table: 'spatial_relation',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      field_id: 'uuid',
      ref_table_id: 'uuid',
      ref_field_id: 'uuid',
      name: 'text',
      operator: 'text',
      param_name: 'text',
      category: 'text',
      module: 'text',
      scope: 'int',
      tags: 'text[]'
    }
  }
};

// =============================================================================
// Shared interfaces
// =============================================================================

export interface Schema {
  name: string;
  schema_name: string;
}

export interface MakeReplacerOptions {
  schemas: Schema[];
  name: string;
  /**
   * Optional prefix for schema name replacement.
   * When provided, schema names are replaced using this prefix instead of `name`.
   * This is needed for the services/meta package where `name` is the services
   * extension name (e.g. "agent-db-services") but schemas should use the
   * application extension prefix (e.g. "agent-db" → "agent_db_auth_public").
   */
  schemaPrefix?: string;
}

export interface ReplacerResult {
  replacer: (str: string, n?: number) => string;
  replace: [RegExp, string][];
}

export interface PreparePackageOptions {
  project: PgpmPackage;
  author: string;
  outdir: string;
  name: string;
  description: string;
  extensions: string[];
  prompter?: Inquirerer;
  /** Repository name for module scaffolding. Defaults to module name if not provided. */
  repoName?: string;
  /** GitHub username/org for module scaffolding. Required for non-interactive use. */
  username?: string;
}

/**
 * Result of checking for missing modules at workspace level.
 */
export interface MissingModulesResult {
  missingModules: { controlName: string; npmName: string }[];
  shouldInstall: boolean;
}

// =============================================================================
// Shared functions
// =============================================================================

/**
 * Checks which pgpm modules from the extensions list are missing from the workspace
 * and prompts the user if they want to install them.
 *
 * This function only does detection and prompting - it does NOT install.
 * Use installMissingModules() after the module is created to do the actual installation.
 *
 * @param project - The PgpmPackage instance (only needs workspace context)
 * @param extensions - List of extension names (control file names)
 * @param prompter - Optional prompter for interactive confirmation
 * @returns Object with missing modules and whether user wants to install them
 */
export const detectMissingModules = async (
  project: PgpmPackage,
  extensions: string[],
  prompter?: Inquirerer,
  argv?: Record<string, any>
): Promise<MissingModulesResult> => {
  // Use workspace-level check - doesn't require being inside a module
  const installed = project.getWorkspaceInstalledModules();
  const missingModules = getMissingInstallableModules(extensions, installed);

  if (missingModules.length === 0) {
    return { missingModules: [], shouldInstall: false };
  }

  const missingNames = missingModules.map(m => m.npmName);
  console.log(`\nMissing pgpm modules detected: ${missingNames.join(', ')}`);

  if (prompter) {
    const { install } = await prompter.prompt(argv || {}, [
      {
        type: 'confirm',
        name: 'install',
        message: `Install missing modules (${missingNames.join(', ')})?`,
        default: true
      }
    ]);

    return { missingModules, shouldInstall: install };
  }

  return { missingModules, shouldInstall: false };
};

/**
 * Installs missing modules into a specific module directory.
 * Must be called after the module has been created.
 *
 * @param moduleDir - The directory of the module to install into
 * @param missingModules - Array of missing modules to install
 */
export const installMissingModules = async (
  moduleDir: string,
  missingModules: { controlName: string; npmName: string }[]
): Promise<void> => {
  if (missingModules.length === 0) {
    return;
  }

  const missingNames = missingModules.map(m => m.npmName);
  console.log('Installing missing modules...');

  // Create a new PgpmPackage instance pointing to the module directory
  const moduleProject = new PgpmPackage(moduleDir);
  await moduleProject.installModules(...missingNames);

  console.log('Modules installed successfully.');
};

/**
 * Generates a function for replacing schema names and extension names in strings.
 */
export const makeReplacer = ({ schemas, name, schemaPrefix }: MakeReplacerOptions): ReplacerResult => {
  const replacements: [string, string] = ['constructive-extension-name', name];
  const prefix = schemaPrefix || name;
  const schemaReplacers: [string, string][] = schemas.map((schema) => [
    schema.schema_name,
    toSnakeCase(`${prefix}_${schema.name}`)
  ]);

  const replace: [RegExp, string][] = [...schemaReplacers, replacements].map(
    ([from, to]) => [new RegExp(from, 'g'), to]
  );

  const replacer = (str: string, n = 0): string => {
    if (!str) return '';
    if (replace[n] && replace[n].length === 2) {
      return replacer(str.replace(replace[n][0], replace[n][1]), n + 1);
    }
    return str;
  };

  return { replacer, replace };
};

/**
 * Creates a PGPM package directory or resets the deploy/revert/verify directories if it exists.
 * If the module already exists and a prompter is provided, prompts the user for confirmation.
 *
 * @returns The absolute path to the created/prepared module directory
 */
export const preparePackage = async ({
  project,
  author,
  outdir,
  name,
  description,
  extensions,
  prompter,
  repoName,
  username
}: PreparePackageOptions): Promise<string> => {
  const curDir = process.cwd();
  const pgpmDir = path.resolve(path.join(outdir, name));
  mkdirSync(pgpmDir, { recursive: true });
  process.chdir(pgpmDir);

  try {
    const plan = glob(path.join(pgpmDir, 'pgpm.plan'));
    if (!plan.length) {
      const { fullName, email } = parseAuthor(author);

      // Always run non-interactively — all answers are pre-filled
      const effectiveUsername = username || fullName || 'export';

      await project.initModule({
        name,
        description,
        author,
        extensions,
        // Use outputDir to create module directly in the specified location
        outputDir: outdir,
        noTty: true,
        prompter,
        answers: {
          moduleName: name,
          moduleDesc: description,
          access: 'restricted',
          license: 'CLOSED',
          fullName,
          ...(email && { email }),
          // Use provided values or sensible defaults
          repoName: repoName || name,
          username: effectiveUsername
        }
      });
    } else {
      if (prompter) {
        const { overwrite } = await prompter.prompt({} as Record<string, any>, [
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Module "${name}" already exists at ${pgpmDir}. Overwrite deploy/revert/verify directories?`,
            default: true,
            useDefault: true
          }
        ]);
        if (!overwrite) {
          throw new Error(`Export cancelled: Module "${name}" already exists.`);
        }
      }
      rmSync(path.resolve(pgpmDir, 'deploy'), { recursive: true, force: true });
      rmSync(path.resolve(pgpmDir, 'revert'), { recursive: true, force: true });
      rmSync(path.resolve(pgpmDir, 'verify'), { recursive: true, force: true });
    }
  } finally {
    process.chdir(curDir);
  }

  return pgpmDir;
};

/**
 * Normalizes an output directory path to ensure it ends with a path separator.
 */
export const normalizeOutdir = (outdir: string): string => {
  return outdir.endsWith(path.sep) ? outdir : outdir + path.sep;
};
