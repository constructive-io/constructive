import { mkdirSync, rmSync } from 'fs';
import { sync as glob } from 'glob';
import { Inquirerer } from 'inquirerer';
import { toSnakeCase } from 'komoji';
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
  'metaschema-schema',
  'pgpm-inflection',
  'pgpm-uuid',
  'pgpm-utils',
  'pgpm-database-jobs',
  'pgpm-jwt-claims',
  'pgpm-stamps',
  'pgpm-base32',
  'pgpm-totp',
  'pgpm-types'
] as const;

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
 * GraphQL fields to request when fetching sql_actions from the db_migrate endpoint.
 * Mirrors the columns available in db_migrate.sql_actions so the GraphQL flow
 * fetches the same data as `SELECT * FROM db_migrate.sql_actions` in the SQL flow.
 */
export const SQL_ACTION_FIELDS = [
  'id',
  'databaseId',
  'name',
  'deploy',
  'revert',
  'verify',
  'content',
  'deps',
  'action',
  'actionId',
  'actorId',
  'payload'
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
  'table',
  'field',
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
  'rls_module',
  'user_auth_module',
  'memberships_module',
  'permissions_module',
  'limits_module',
  'levels_module',
  'users_module',
  'hierarchy_module',
  'membership_types_module',
  'invites_module',
  'emails_module',
  'sessions_module',
  'secrets_module',
  'profiles_module',
  'encrypted_secrets_module',
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
  'table_template_module'
] as const;

// =============================================================================
// Shared types for table config
// =============================================================================

export type FieldType = 'uuid' | 'uuid[]' | 'text' | 'text[]' | 'boolean' | 'image' | 'upload' | 'url' | 'jsonb' | 'int' | 'interval' | 'timestamptz';

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
  database_extension: {
    schema: 'metaschema_public',
    table: 'database_extension',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      name: 'text',
      schema_id: 'uuid'
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
      sign_in_one_time_token_function: 'text',
      one_time_token_function: 'text',
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
  levels_module: {
    schema: 'metaschema_modules_public',
    table: 'levels_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      steps_table_id: 'uuid',
      steps_table_name: 'text',
      achievements_table_id: 'uuid',
      achievements_table_name: 'text',
      levels_table_id: 'uuid',
      levels_table_name: 'text',
      level_requirements_table_id: 'uuid',
      level_requirements_table_name: 'text',
      completed_step: 'text',
      incompleted_step: 'text',
      tg_achievement: 'text',
      tg_achievement_toggle: 'text',
      tg_achievement_toggle_boolean: 'text',
      tg_achievement_boolean: 'text',
      upsert_achievement: 'text',
      tg_update_achievements: 'text',
      steps_required: 'text',
      level_achieved: 'text',
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
  secrets_module: {
    schema: 'metaschema_modules_public',
    table: 'secrets_module',
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
  encrypted_secrets_module: {
    schema: 'metaschema_modules_public',
    table: 'encrypted_secrets_module',
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
  table_template_module: {
    schema: 'metaschema_modules_public',
    table: 'table_template_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      table_id: 'uuid',
      owner_table_id: 'uuid',
      table_name: 'text',
      node_type: 'text',
      data: 'jsonb'
    }
  },
  secure_table_provision: {
    schema: 'metaschema_modules_public',
    table: 'secure_table_provision',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      table_id: 'uuid',
      table_name: 'text',
      node_type: 'text',
      use_rls: 'boolean',
      node_data: 'jsonb',
      grant_roles: 'text[]',
      grant_privileges: 'jsonb',
      policy_type: 'text',
      policy_privileges: 'text[]',
      policy_role: 'text',
      policy_permissive: 'boolean',
      policy_data: 'jsonb',
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
