export const MUTATING_DB_TOOLS = new Set<string>([
  'provision_database',
  'provision_blueprint',
  'add_relation',
  'delete_table',
  'create_field',
  'update_field',
  'delete_field',
  'add_policies',
  'apply_template',
  'create_template',
  'update_template',
  'delete_template',
  'add_records',
  'manage_entity_types',
  'create_api_key',
  'run_codegen',
]);

import { filterInternalPolicies } from '../blueprint/internal-policies';
import type { ConfirmPreview, ConfirmPreviewField, ConfirmPreviewTable } from './preview';

export type ConfirmPrompt = { title: string; message: string; preview?: ConfirmPreview };

function str(input: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = input?.[key];
  return typeof value === 'string' ? value : undefined;
}

function recordRows(input: Record<string, unknown> | undefined): Record<string, unknown>[] {
  const records = input?.records;
  if (!Array.isArray(records)) return [];
  return records.filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null);
}

function obj(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
}

function arr(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(obj).filter((v): v is Record<string, unknown> => !!v) : [];
}

function previewField(raw: Record<string, unknown>): ConfirmPreviewField {
  return {
    name: typeof raw.name === 'string' ? raw.name : '?',
    type: typeof raw.type === 'string' ? raw.type : '?',
    isRequired: raw.is_required === true,
    defaultValue: typeof raw.default === 'string' ? raw.default : null,
  };
}

function blueprintTables(input: Record<string, unknown> | undefined): ConfirmPreviewTable[] {
  const definition = obj(input?.definition);
  if (!definition) return [];
  const relations = arr(definition.relations);
  return arr(definition.tables).map((table) => {
    const tableName = typeof table.table_name === 'string' ? table.table_name : '?';
    return {
      name: tableName,
      fields: arr(table.fields).map(previewField),
      policies: filterInternalPolicies(
        arr(table.policies)
          .map((policy) => (typeof policy.$type === 'string' ? policy.$type : null))
          .filter((p): p is string => !!p),
      ),
      relationCount: relations.filter((r) => r.source_table === tableName).length,
    };
  });
}

function policyTypes(input: Record<string, unknown> | undefined): string[] {
  return filterInternalPolicies(
    arr(input?.policies)
      .map((policy) => (typeof policy.policy_type === 'string' ? policy.policy_type : null))
      .filter((p): p is string => !!p),
  );
}

export function buildConfirmPrompt(
  toolName: string,
  input: Record<string, unknown> | undefined,
): ConfirmPrompt {
  switch (toolName) {
  case 'provision_database': {
    const name = str(input, 'database_name') ?? 'new database';
    return {
      title: 'Provision database?',
      message: `Sign up an owner and provision a new Constructive database "${name}" (standard module set), then write credentials to the project .env.`,
    };
  }
  case 'provision_blueprint': {
    const name = str(input, 'name') ?? 'new schema';
    const tables = blueprintTables(input);
    const count = tables.length;
    return {
      title: 'Create tables?',
      message: `Provision blueprint "${name}"${count ? ` (${count} table${count === 1 ? '' : 's'})` : ''} in the project database.`,
      preview: count > 0 ? { kind: 'blueprint', tables } : undefined,
    };
  }
  case 'add_relation': {
    const source = str(input, 'source_table') ?? '?';
    const target = str(input, 'target_table') ?? '?';
    const isManyToMany = str(input, 'relation_type') === 'many_to_many';
    const message = isManyToMany
      ? `Create a junction table "${str(input, 'junction_table_name') ?? '?'}" linking existing tables "${source}" ↔ "${target}".`
      : `Add a foreign-key column "${str(input, 'field_name') ?? '?'}" on existing table "${source}" referencing "${target}".`;
    return { title: 'Add relation?', message };
  }
  case 'delete_table':
    return {
      title: 'Delete table?',
      message: `Permanently delete the table "${str(input, 'table_name') ?? '?'}" and its data.`,
    };
  case 'create_field': {
    const tableName = str(input, 'table_name') ?? '?';
    const fieldName = str(input, 'field_name') ?? '?';
    return {
      title: 'Add field?',
      message: `Add field "${fieldName}" to table "${tableName}".`,
      preview: {
        kind: 'field',
        tableName,
        field: {
          name: fieldName,
          type: str(input, 'type') ?? '?',
          isRequired: input?.is_required === true,
          defaultValue: str(input, 'default_value') ?? null,
        },
      },
    };
  }
  case 'update_field':
    return {
      title: 'Update field?',
      message: `Modify field "${str(input, 'field_name') ?? '?'}" on table "${str(input, 'table_name') ?? '?'}".`,
    };
  case 'delete_field':
    return {
      title: 'Delete field?',
      message: `Permanently delete field "${str(input, 'field_name') ?? '?'}" from table "${str(input, 'table_name') ?? '?'}".`,
    };
  case 'add_policies': {
    const tableName = str(input, 'table_name') ?? '?';
    const policies = policyTypes(input);
    const count = policies.length;
    return {
      title: 'Add policies?',
      message: `Add ${count || ''} RLS ${count === 1 ? 'policy' : 'policies'} to table "${tableName}".`,
      preview: count > 0 ? { kind: 'policies', tableName, policies } : undefined,
    };
  }
  case 'apply_template':
    return {
      title: 'Apply template?',
      message: `Apply blueprint template "${str(input, 'templateName') ?? '?'}" to the project database.`,
    };
  case 'create_template': {
    const source = str(input, 'blueprintName');
    return {
      title: 'Create template?',
      message: `Create reusable template "${str(input, 'displayName') ?? '?'}" in the catalog from ${source ? `blueprint "${source}"` : 'the latest blueprint'}.`,
    };
  }
  case 'update_template':
    return {
      title: 'Update template?',
      message: `Update blueprint template "${str(input, 'templateName') ?? '?'}".`,
    };
  case 'delete_template':
    return {
      title: 'Delete template?',
      message: `Permanently delete blueprint template "${str(input, 'templateName') ?? '?'}".`,
    };
  case 'add_records': {
    const rows = recordRows(input);
    const count = rows.length;
    const tableName = str(input, 'table_name') ?? '?';
    return {
      title: 'Add records?',
      message: `Insert ${count || ''} row${count === 1 ? '' : 's'} into table "${tableName}".`,
      preview: count > 0 ? { kind: 'records', tableName, rows } : undefined,
    };
  }
  case 'manage_entity_types': {
    const action = str(input, 'action');
    const name = str(input, 'name');
    const id = str(input, 'entity_type_id');
    switch (action) {
    case 'create':
      return {
        title: 'Create entity type?',
        message: `Provision entity type "${name ?? '?'}" in the project database (creates its entity table and membership wiring).`,
      };
    case 'delete':
      return {
        title: 'Delete entity type?',
        message: `Delete the registration of entity type ${id ?? '?'}. The provisioned entity table and its data stay in the API schema.`,
      };
    default:
      return { title: 'Manage entity types?', message: 'Change entity types in the project database.' };
    }
  }
  case 'create_api_key': {
    const keyName = str(input, 'key_name') ?? '?';
    const readOnly = input?.read_only === true;
    const entityIds = Array.isArray(input?.entity_ids) ? input.entity_ids.length : 0;
    const scope =
      entityIds > 0
        ? `scoped to ${entityIds} entit${entityIds === 1 ? 'y' : 'ies'}`
        : 'unscoped — it acts as your signed-in app user';
    return {
      title: 'Create API key?',
      message: `Mint API key "${keyName}" (${scope}${readOnly ? ', read-only' : ''}). You may be asked to verify your password; the key is written to .env and shown to you once — never to the agent.`,
    };
  }
  case 'run_codegen':
    return {
      title: 'Run codegen?',
      message: 'Generate the typed GraphQL SDK in packages/app (upgrade codegen, run it, normalize barrels).',
    };
  default:
    return { title: 'Run tool?', message: `Allow "${toolName}" to run?` };
  }
}
