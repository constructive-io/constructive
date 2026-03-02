/**
 * GraphQL equivalent of export-meta.ts.
 * 
 * Fetches metadata from metaschema_public, services_public, and metaschema_modules_public
 * via GraphQL queries instead of direct SQL, then uses the same csv-to-pg Parser to
 * generate SQL INSERT statements.
 */
import { Parser } from 'csv-to-pg';

import { GraphQLClient } from './graphql-client';
import {
  buildFieldsFragment,
  getGraphQLQueryName,
  graphqlRowToPostgresRow,
  intervalToPostgres
} from './graphql-naming';

type FieldType = 'uuid' | 'uuid[]' | 'text' | 'text[]' | 'boolean' | 'image' | 'upload' | 'url' | 'jsonb' | 'int' | 'interval' | 'timestamptz';

interface TableConfig {
  schema: string;
  table: string;
  conflictDoNothing?: boolean;
  fields: Record<string, FieldType>;
}

/**
 * Same config map as export-meta.ts — defines the schema, table, and expected fields
 * for each table we need to export. The fields are used both to build the GraphQL
 * query fragment and to construct the csv-to-pg Parser for SQL generation.
 */
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

export interface ExportGraphQLMetaParams {
  /** GraphQL client configured for the meta/services API endpoint */
  client: GraphQLClient;
  /** The database_id to filter by */
  database_id: string;
}

export type ExportGraphQLMetaResult = Record<string, string>;

/**
 * Fetch metadata via GraphQL and generate SQL INSERT statements.
 * This is the GraphQL equivalent of exportMeta() in export-meta.ts.
 */
export const exportGraphQLMeta = async ({
  client,
  database_id
}: ExportGraphQLMetaParams): Promise<ExportGraphQLMetaResult> => {
  const sql: Record<string, string> = {};

  const queryAndParse = async (key: string) => {
    const tableConfig = config[key];
    if (!tableConfig) return;

    const pgFieldNames = Object.keys(tableConfig.fields);
    const graphqlFieldsFragment = buildFieldsFragment(pgFieldNames, tableConfig.fields);
    const graphqlQueryName = getGraphQLQueryName(tableConfig.table);

    // The 'database' table is fetched by id, not by database_id
    const condition = key === 'database'
      ? { id: database_id }
      : { databaseId: database_id };

    try {
      const rows = await client.fetchAllNodes(
        graphqlQueryName,
        graphqlFieldsFragment,
        condition
      );

      if (rows.length > 0) {
        // Convert camelCase GraphQL keys back to snake_case for the Parser
        // Also convert interval objects back to Postgres interval strings
        const pgRows = rows.map(row => {
          const pgRow = graphqlRowToPostgresRow(row);
          // Convert any interval fields from {seconds, minutes, ...} objects to strings
          for (const [fieldName, fieldType] of Object.entries(tableConfig.fields)) {
            if (fieldType === 'interval' && pgRow[fieldName] && typeof pgRow[fieldName] === 'object') {
              pgRow[fieldName] = intervalToPostgres(pgRow[fieldName] as Record<string, number | null>);
            }
          }
          return pgRow;
        });

        // Filter fields to only those that exist in the returned data
        // This mirrors the dynamic field building in the SQL version
        const returnedKeys = new Set<string>();
        for (const row of pgRows) {
          for (const k of Object.keys(row)) {
            returnedKeys.add(k);
          }
        }

        const dynamicFields: Record<string, FieldType> = {};
        for (const [fieldName, fieldType] of Object.entries(tableConfig.fields)) {
          if (returnedKeys.has(fieldName)) {
            dynamicFields[fieldName] = fieldType;
          }
        }

        if (Object.keys(dynamicFields).length === 0) return;

        const parser = new Parser({
          schema: tableConfig.schema,
          table: tableConfig.table,
          conflictDoNothing: tableConfig.conflictDoNothing,
          fields: dynamicFields
        });

        const parsed = await parser.parse(pgRows);
        if (parsed) {
          sql[key] = parsed;
        }
      }
    } catch (err: unknown) {
      // If the GraphQL query fails (e.g. table not exposed), skip silently
      // similar to how the SQL version handles 42P01 (undefined_table)
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('Cannot query field') ||
        message.includes('is not defined by type') ||
        message.includes('Unknown field') ||
        message.includes('Field') && message.includes('not found')
      ) {
        // Field/table not available in the GraphQL schema — skip
        return;
      }
      throw err;
    }
  };

  // =============================================================================
  // metaschema_public tables
  // =============================================================================
  await queryAndParse('database');
  await queryAndParse('schema');
  await queryAndParse('table');
  await queryAndParse('field');
  await queryAndParse('policy');
  await queryAndParse('index');
  await queryAndParse('trigger');
  await queryAndParse('trigger_function');
  await queryAndParse('rls_function');
  await queryAndParse('limit_function');
  await queryAndParse('procedure');
  await queryAndParse('foreign_key_constraint');
  await queryAndParse('primary_key_constraint');
  await queryAndParse('unique_constraint');
  await queryAndParse('check_constraint');
  await queryAndParse('full_text_search');
  await queryAndParse('schema_grant');
  await queryAndParse('table_grant');

  // =============================================================================
  // services_public tables
  // =============================================================================
  await queryAndParse('domains');
  await queryAndParse('sites');
  await queryAndParse('apis');
  await queryAndParse('apps');
  await queryAndParse('site_modules');
  await queryAndParse('site_themes');
  await queryAndParse('site_metadata');
  await queryAndParse('api_modules');
  await queryAndParse('api_schemas');

  // =============================================================================
  // metaschema_modules_public tables
  // =============================================================================
  await queryAndParse('rls_module');
  await queryAndParse('user_auth_module');
  await queryAndParse('memberships_module');
  await queryAndParse('permissions_module');
  await queryAndParse('limits_module');
  await queryAndParse('levels_module');
  await queryAndParse('users_module');
  await queryAndParse('hierarchy_module');
  await queryAndParse('membership_types_module');
  await queryAndParse('invites_module');
  await queryAndParse('emails_module');
  await queryAndParse('sessions_module');
  await queryAndParse('secrets_module');
  await queryAndParse('profiles_module');
  await queryAndParse('encrypted_secrets_module');
  await queryAndParse('connected_accounts_module');
  await queryAndParse('phone_numbers_module');
  await queryAndParse('crypto_addresses_module');
  await queryAndParse('crypto_auth_module');
  await queryAndParse('field_module');
  await queryAndParse('table_template_module');
  await queryAndParse('uuid_module');
  await queryAndParse('default_ids_module');
  await queryAndParse('denormalized_table_field');

  return sql;
};
