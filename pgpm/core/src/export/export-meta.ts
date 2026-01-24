import { PgpmOptions } from '@pgpmjs/types';
import { Parser } from 'csv-to-pg';
import { getPgPool } from 'pg-cache';
import type { Pool } from 'pg';

type FieldType = 'uuid' | 'uuid[]' | 'text' | 'text[]' | 'boolean' | 'image' | 'upload' | 'url' | 'jsonb' | 'int' | 'interval' | 'timestamptz';

interface TableConfig {
  schema: string;
  table: string;
  conflictDoNothing?: boolean;
  fields: Record<string, FieldType>;
}

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
 * Query actual columns from information_schema for a given table.
 * Returns a map of column_name -> udt_name (PostgreSQL type).
 */
const getTableColumns = async (pool: Pool, schemaName: string, tableName: string): Promise<Map<string, string>> => {
  const result = await pool.query(`
    SELECT column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `, [schemaName, tableName]);
  
  const columns = new Map<string, string>();
  for (const row of result.rows) {
    columns.set(row.column_name, row.udt_name);
  }
  return columns;
};

/**
 * Build dynamic fields config by intersecting the hardcoded config with actual database columns.
 * - Only includes columns that exist in the database
 * - Preserves special type hints from config (image, upload, url) for columns that exist
 * - Infers types from PostgreSQL for columns not in config
 */
const buildDynamicFields = async (
  pool: Pool,
  tableConfig: TableConfig
): Promise<Record<string, FieldType>> => {
  const actualColumns = await getTableColumns(pool, tableConfig.schema, tableConfig.table);
  
  if (actualColumns.size === 0) {
    // Table doesn't exist, return empty fields
    return {};
  }
  
  const dynamicFields: Record<string, FieldType> = {};
  
  // For each column in the hardcoded config, check if it exists in the database
  for (const [fieldName, fieldType] of Object.entries(tableConfig.fields)) {
    if (actualColumns.has(fieldName)) {
      // Column exists - use the config's type hint (preserves special types like 'image', 'upload', 'url')
      dynamicFields[fieldName] = fieldType;
    }
    // If column doesn't exist in database, skip it (this fixes the bug)
  }
  
  return dynamicFields;
};

const config: Record<string, TableConfig> = {
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
      role_name: 'text',
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
  limit_function: {
    schema: 'metaschema_public',
    table: 'limit_function',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      name: 'text',
      label: 'text',
      description: 'text',
      data: 'jsonb',
      security: 'int'
    }
  },
  procedure: {
    schema: 'metaschema_public',
    table: 'procedure',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      name: 'text',
      argnames: 'text[]',
      argtypes: 'text[]',
      argdefaults: 'text[]',
      lang_name: 'text',
      definition: 'text'
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
      role_name: 'text',
      field_ids: 'uuid[]'
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
      logo: 'image',
      dbname: 'text'
    }
  },
  apis: {
    schema: 'services_public',
    table: 'apis',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      name: 'text',
      dbname: 'text',
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
      api_id: 'uuid',
      schema_id: 'uuid',
      private_schema_id: 'uuid',
      tokens_table_id: 'uuid',
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
      tokens_table_id: 'uuid',
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
      verify_email_function: 'text'
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
  permissions_module:{
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
      is_manager_of_function: 'text',
      created_at: 'timestamptz'
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
  tokens_module: {
    schema: 'metaschema_modules_public',
    table: 'tokens_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      schema_id: 'uuid',
      table_id: 'uuid',
      owned_table_id: 'uuid',
      tokens_default_expiration: 'interval',
      tokens_table: 'text'
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
      bitlen: 'int',
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
      tokens_table_id: 'uuid',
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

interface ExportMetaParams {
  opts: PgpmOptions,
  dbname: string;
  database_id: string;
}

export type ExportMetaResult = Record<string, string>;

export const exportMeta = async ({ opts, dbname, database_id }: ExportMetaParams): Promise<ExportMetaResult> => {
  const pool = getPgPool({
    ...opts.pg,
    database: dbname
  });
  const sql: Record<string, string> = {};
  
  // Cache for dynamically built parsers
  const parsers: Record<string, Parser> = {};
  
  // Build parser dynamically by querying actual columns from the database
  const getParser = async (key: string): Promise<Parser | null> => {
    if (parsers[key]) {
      return parsers[key];
    }
    
    const tableConfig = config[key];
    if (!tableConfig) {
      return null;
    }
    
    // Build fields dynamically based on actual database columns
    const dynamicFields = await buildDynamicFields(pool, tableConfig);
    
    if (Object.keys(dynamicFields).length === 0) {
      // No columns found (table doesn't exist or no matching columns)
      return null;
    }
    
    const parser = new Parser({
      schema: tableConfig.schema,
      table: tableConfig.table,
      conflictDoNothing: tableConfig.conflictDoNothing,
      fields: dynamicFields
    });
    
    parsers[key] = parser;
    return parser;
  };

  const queryAndParse = async (key: string, query: string) => {
    try {
      const parser = await getParser(key);
      if (!parser) {
        return;
      }
      
      const result = await pool.query(query, [database_id]);
      if (result.rows.length) {
        const parsed = await parser.parse(result.rows);
        if (parsed) {
          sql[key] = parsed;
        }
      }
    } catch (err: unknown) {
      const pgError = err as { code?: string };
      if (pgError.code === '42P01') {
        return;
      }
      throw err;
    }
  };

  // =============================================================================
  // metaschema_public tables
  // =============================================================================
  await queryAndParse('database', `SELECT * FROM metaschema_public.database WHERE id = $1`);
  await queryAndParse('database_extension', `SELECT * FROM metaschema_public.database_extension WHERE database_id = $1`);
  await queryAndParse('schema', `SELECT * FROM metaschema_public.schema WHERE database_id = $1`);
  await queryAndParse('table', `SELECT * FROM metaschema_public.table WHERE database_id = $1`);
  await queryAndParse('field', `SELECT * FROM metaschema_public.field WHERE database_id = $1`);
  await queryAndParse('policy', `SELECT * FROM metaschema_public.policy WHERE database_id = $1`);
  await queryAndParse('index', `SELECT * FROM metaschema_public.index WHERE database_id = $1`);
  await queryAndParse('trigger', `SELECT * FROM metaschema_public.trigger WHERE database_id = $1`);
  await queryAndParse('trigger_function', `SELECT * FROM metaschema_public.trigger_function WHERE database_id = $1`);
  await queryAndParse('rls_function', `SELECT * FROM metaschema_public.rls_function WHERE database_id = $1`);
  await queryAndParse('limit_function', `SELECT * FROM metaschema_public.limit_function WHERE database_id = $1`);
  await queryAndParse('procedure', `SELECT * FROM metaschema_public.procedure WHERE database_id = $1`);
  await queryAndParse('foreign_key_constraint', `SELECT * FROM metaschema_public.foreign_key_constraint WHERE database_id = $1`);
  await queryAndParse('primary_key_constraint', `SELECT * FROM metaschema_public.primary_key_constraint WHERE database_id = $1`);
  await queryAndParse('unique_constraint', `SELECT * FROM metaschema_public.unique_constraint WHERE database_id = $1`);
  await queryAndParse('check_constraint', `SELECT * FROM metaschema_public.check_constraint WHERE database_id = $1`);
  await queryAndParse('full_text_search', `SELECT * FROM metaschema_public.full_text_search WHERE database_id = $1`);
  await queryAndParse('schema_grant', `SELECT * FROM metaschema_public.schema_grant WHERE database_id = $1`);
  await queryAndParse('table_grant', `SELECT * FROM metaschema_public.table_grant WHERE database_id = $1`);

  // =============================================================================
  // services_public tables
  // =============================================================================
  await queryAndParse('domains', `SELECT * FROM services_public.domains WHERE database_id = $1`);
  await queryAndParse('sites', `SELECT * FROM services_public.sites WHERE database_id = $1`);
  await queryAndParse('apis', `SELECT * FROM services_public.apis WHERE database_id = $1`);
  await queryAndParse('apps', `SELECT * FROM services_public.apps WHERE database_id = $1`);
  await queryAndParse('site_modules', `SELECT * FROM services_public.site_modules WHERE database_id = $1`);
  await queryAndParse('site_themes', `SELECT * FROM services_public.site_themes WHERE database_id = $1`);
  await queryAndParse('site_metadata', `SELECT * FROM services_public.site_metadata WHERE database_id = $1`);
  await queryAndParse('api_modules', `SELECT * FROM services_public.api_modules WHERE database_id = $1`);
  await queryAndParse('api_extensions', `SELECT * FROM services_public.api_extensions WHERE database_id = $1`);
  await queryAndParse('api_schemas', `SELECT * FROM services_public.api_schemas WHERE database_id = $1`);

  // =============================================================================
  // metaschema_modules_public tables
  // =============================================================================
  await queryAndParse('rls_module', `SELECT * FROM metaschema_modules_public.rls_module WHERE database_id = $1`);
  await queryAndParse('user_auth_module', `SELECT * FROM metaschema_modules_public.user_auth_module WHERE database_id = $1`);
  await queryAndParse('memberships_module', `SELECT * FROM metaschema_modules_public.memberships_module WHERE database_id = $1`);
  await queryAndParse('permissions_module', `SELECT * FROM metaschema_modules_public.permissions_module WHERE database_id = $1`);
  await queryAndParse('limits_module', `SELECT * FROM metaschema_modules_public.limits_module WHERE database_id = $1`);
  await queryAndParse('levels_module', `SELECT * FROM metaschema_modules_public.levels_module WHERE database_id = $1`);
  await queryAndParse('users_module', `SELECT * FROM metaschema_modules_public.users_module WHERE database_id = $1`);
  await queryAndParse('hierarchy_module', `SELECT * FROM metaschema_modules_public.hierarchy_module WHERE database_id = $1`);
  await queryAndParse('membership_types_module', `SELECT * FROM metaschema_modules_public.membership_types_module WHERE database_id = $1`);
  await queryAndParse('invites_module', `SELECT * FROM metaschema_modules_public.invites_module WHERE database_id = $1`);
  await queryAndParse('emails_module', `SELECT * FROM metaschema_modules_public.emails_module WHERE database_id = $1`);
  await queryAndParse('tokens_module', `SELECT * FROM metaschema_modules_public.tokens_module WHERE database_id = $1`);
  await queryAndParse('secrets_module', `SELECT * FROM metaschema_modules_public.secrets_module WHERE database_id = $1`);
  await queryAndParse('profiles_module', `SELECT * FROM metaschema_modules_public.profiles_module WHERE database_id = $1`);
  await queryAndParse('encrypted_secrets_module', `SELECT * FROM metaschema_modules_public.encrypted_secrets_module WHERE database_id = $1`);
  await queryAndParse('connected_accounts_module', `SELECT * FROM metaschema_modules_public.connected_accounts_module WHERE database_id = $1`);
  await queryAndParse('phone_numbers_module', `SELECT * FROM metaschema_modules_public.phone_numbers_module WHERE database_id = $1`);
  await queryAndParse('crypto_addresses_module', `SELECT * FROM metaschema_modules_public.crypto_addresses_module WHERE database_id = $1`);
  await queryAndParse('crypto_auth_module', `SELECT * FROM metaschema_modules_public.crypto_auth_module WHERE database_id = $1`);
  await queryAndParse('field_module', `SELECT * FROM metaschema_modules_public.field_module WHERE database_id = $1`);
  await queryAndParse('table_template_module', `SELECT * FROM metaschema_modules_public.table_template_module WHERE database_id = $1`);
  await queryAndParse('uuid_module', `SELECT * FROM metaschema_modules_public.uuid_module WHERE database_id = $1`);
  await queryAndParse('default_ids_module', `SELECT * FROM metaschema_modules_public.default_ids_module WHERE database_id = $1`);
  await queryAndParse('denormalized_table_field', `SELECT * FROM metaschema_modules_public.denormalized_table_field WHERE database_id = $1`);

  return sql;
};
