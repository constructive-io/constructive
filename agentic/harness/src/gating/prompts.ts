import type { ConfirmPreviewField, ConfirmPreviewTable, ConfirmPrompt, PlanTableAccess, PlanTarget } from './preview';
import { planAccessLines } from './preview';

// A default as the input gives it: SQL text, or a constant number or boolean; undefined for none (null removes one).
function defaultOf(input: Record<string, unknown> | undefined): string | undefined {
  const value = input?.default_value;
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : undefined;
}

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
    defaultValue: typeof raw.default === 'string' || typeof raw.default === 'number' || typeof raw.default === 'boolean' ? String(raw.default) : null,
  };
}

const policyType = (policy: Record<string, unknown>, key: string): string | null =>
  typeof policy[key] === 'string' ? (policy[key] as string) : null;

function blueprintTables(input: Record<string, unknown> | undefined): ConfirmPreviewTable[] {
  const definition = obj(input?.definition);
  if (!definition) return [];
  const relations = arr(definition.relations);
  return arr(definition.tables).map((table) => {
    const tableName = typeof table.table_name === 'string' ? table.table_name : '?';
    return {
      name: tableName,
      fields: arr(table.fields).map(previewField),
      policies: arr(table.policies)
        .map((policy) => policyType(policy, '$type'))
        .filter((p): p is string => !!p),
      relationCount: relations.filter((r) => r.source_table === tableName).length,
    };
  });
}

function fieldWords(field: ConfirmPreviewField): string {
  const notes = [field.type, ...(field.isRequired ? ['required'] : []), ...(field.defaultValue === null ? [] : [`default ${field.defaultValue}`])];
  return `${field.name} (${notes.join(', ')})`;
}

// The lines of the access the gate resolved for one table, when it resolved it.
const accessOf = (access: PlanTableAccess[] | undefined, table: string): string[] => {
  const found = access?.find((entry) => entry.table === table);
  return found ? planAccessLines(found) : [];
};

function blueprintMessage(input: Record<string, unknown> | undefined, access: PlanTableAccess[] | undefined): string {
  const tables = arr(obj(input?.definition)?.tables);
  const lines = tables.flatMap((table) => {
    const name = typeof table.table_name === 'string' ? table.table_name : '?';
    const schema = typeof table.schema_name === 'string' ? ` in the schema ${table.schema_name},` : '';
    const fields = arr(table.fields).map(previewField);
    const fieldText = fields.length ? `with the fields ${fields.map(fieldWords).join(', ')}` : 'with no fields of its own';
    return [`Table "${name}"${schema} ${fieldText}.`, ...accessOf(access, name)];
  });
  const count = `${tables.length} table${tables.length === 1 ? '' : 's'}`;
  return [`Create ${count} in the project database.`, ...lines].join('\n');
}

function policiesMessage(input: Record<string, unknown> | undefined, access: PlanTableAccess[] | undefined): string {
  const tableName = str(input, 'table_name') ?? '?';
  const count = arr(input?.policies).length;
  return [`Add ${count} access rule${count === 1 ? '' : 's'} to table "${tableName}"; the rules it has stay.`, ...accessOf(access, tableName)].join('\n');
}

function setAccessMessage(input: Record<string, unknown> | undefined, access: PlanTableAccess[] | undefined): string {
  const tableName = str(input, 'table_name') ?? '?';
  const count = arr(input?.policies).length;
  return [
    `Replace every access rule of table "${tableName}" with ${count} rule${count === 1 ? '' : 's'}; its grants stay.`,
    'Rules derived from them (history and translation copies) follow the new set.',
    ...accessOf(access, tableName),
  ].join('\n');
}

function fieldChanges(input: Record<string, unknown> | undefined): string[] {
  const changes: string[] = [];
  const newName = str(input, 'new_name');
  if (newName) changes.push(`rename it to "${newName}"`);
  if (typeof input?.is_required === 'boolean') changes.push(input.is_required ? 'make it required' : 'make it optional');
  if (input && 'default_value' in input) {
    const value = defaultOf(input);
    changes.push(value === undefined ? 'remove its default' : `set its default to ${value}`);
  }
  if (typeof input?.is_unique === 'boolean') {
    changes.push(input.is_unique ? 'add a unique constraint' : 'remove its unique constraint');
  }
  return changes;
}

function templateChanges(input: Record<string, unknown> | undefined): string[] {
  const patch = obj(input?.patch) ?? {};
  const changes: string[] = [];
  if (typeof patch.displayName === 'string') changes.push(`rename it to "${patch.displayName}"`);
  if (typeof patch.description === 'string') changes.push('set its description');
  if (Array.isArray(patch.categories)) changes.push(`set its categories to ${patch.categories.join(', ') || 'none'}`);
  if (Array.isArray(patch.tags)) changes.push(`set its tags to ${patch.tags.join(', ') || 'none'}`);
  if (patch.visibility === 'public') changes.push('make it public, so every account can see and apply it');
  if (patch.visibility === 'private') changes.push('make it private to this account');
  return changes;
}

/**
 * What a person reads before a call changes something: what it acts on
 * (`target`, as the gate resolved it), what the call does, in plain words,
 * and nothing it does not do. A call that creates or changes the access of a
 * table states it from `access`: one sentence per rule, before and after.
 */
export function buildConfirmPrompt(
  toolName: string,
  input: Record<string, unknown> | undefined,
  resolved: { target: PlanTarget; access?: PlanTableAccess[]; notes?: string[] },
): ConfirmPrompt {
  const call = describeCall(toolName, input, resolved.access);
  const notes = resolved.notes ?? [];
  return {
    ...call,
    message: [call.message, ...notes.map((note) => `Note: ${note}`)].join('\n'),
    target: resolved.target,
    ...(resolved.access?.length ? { access: resolved.access } : {}),
    ...(notes.length ? { notes } : {}),
  };
}

function describeCall(
  toolName: string,
  input: Record<string, unknown> | undefined,
  access: PlanTableAccess[] | undefined,
): Omit<ConfirmPrompt, 'target'> {
  switch (toolName) {
  case 'provision_database':
    return {
      title: 'Create database?',
      message:
        `Create a new Constructive database "${str(input, 'database_name') ?? '?'}" under the signed-in account and bind this directory to it: ` +
        'its id and endpoints are written to .env.',
    };
  case 'replace_database':
    return {
      title: 'Replace database?',
      message:
        `Bind this directory to a new, empty database "${str(input, 'database_name') ?? '?'}". The database it is bound to now keeps its data, ` +
        'but this directory no longer uses it; its tables must be created again in the new one.',
    };
  case 'provision_blueprint': {
    const tables = blueprintTables(input);
    return {
      title: 'Create tables?',
      message: blueprintMessage(input, access),
      preview: tables.length > 0 ? { kind: 'blueprint', tables } : undefined,
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
      message: `Add field "${fieldName}" to table "${tableName}"${input?.is_unique === true ? ', with a unique constraint' : ''}.`,
      preview: {
        kind: 'field',
        tableName,
        field: {
          name: fieldName,
          type: str(input, 'type') ?? '?',
          isRequired: input?.is_required === true,
          defaultValue: defaultOf(input) ?? null,
        },
      },
    };
  }
  case 'update_field':
    return {
      title: 'Update field?',
      message: `Change field "${str(input, 'field_name') ?? '?'}" on table "${str(input, 'table_name') ?? '?'}": ${fieldChanges(input).join('; ')}.`,
    };
  case 'retype_field':
    return {
      title: 'Change field type?',
      message:
        `Change the type of field "${str(input, 'field_name') ?? '?'}" on table "${str(input, 'table_name') ?? '?'}" to ${str(input, 'type') ?? '?'}, ` +
        'which converts every value and fails or loses data when a value does not fit.',
    };
  case 'delete_field':
    return {
      title: 'Delete field?',
      message: `Permanently delete field "${str(input, 'field_name') ?? '?'}" from table "${str(input, 'table_name') ?? '?'}".`,
    };
  case 'add_policies': {
    const tableName = str(input, 'table_name') ?? '?';
    const policies = arr(input?.policies)
      .map((policy) => policyType(policy, '$type'))
      .filter((p): p is string => !!p);
    return {
      title: 'Add access rules?',
      message: policiesMessage(input, access),
      preview: policies.length > 0 ? { kind: 'policies', tableName, policies } : undefined,
    };
  }
  case 'set_access':
    return { title: 'Replace access?', message: setAccessMessage(input, access) };
  case 'apply_template':
    return {
      title: 'Apply template?',
      message: `Create the tables of the template "${str(input, 'templateName') ?? '?'}" in the project database.`,
    };
  case 'create_template': {
    const source = str(input, 'blueprintName');
    return {
      title: 'Create template?',
      message: `Save ${source ? `the blueprint "${source}"` : 'the latest blueprint of this project'} as the template "${str(input, 'displayName') ?? '?'}" in this account's template catalog. It stays private unless it is made public.`,
    };
  }
  case 'update_template':
    return {
      title: 'Update template?',
      message: `Change the template "${str(input, 'templateName') ?? '?'}": ${templateChanges(input).join('; ') || 'nothing'}.`,
    };
  case 'delete_template':
    return {
      title: 'Delete template?',
      message: `Permanently delete the template "${str(input, 'templateName') ?? '?'}".`,
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
  case 'create_entity_type':
    return {
      title: 'Create entity type?',
      message: `Create the entity type "${str(input, 'name') ?? '?'}" in the project database: a table for its rows, and the tables that record who belongs to each one.`,
    };
  case 'delete_entity_type':
    return {
      title: 'Delete entity type?',
      message: `Delete the registration of entity type ${str(input, 'entity_type_id') ?? '?'}. The table it made and its rows stay in the database.`,
    };
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
      message: "Generate the typed GraphQL SDK of the project's app from the database again, into packages/app/src/graphql/sdk.",
    };
  default:
    return { title: 'Run tool?', message: `Allow "${toolName}" to run?` };
  }
}
