import type { ConfirmPreviewField, ConfirmPreviewTable, ConfirmPrompt, PlanTableAccess, PlanTarget } from './preview';
import { databaseWords, newTableFieldLines, planAccessLines, rowLines } from './preview';

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

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

const under = (lines: string[]): string[] => lines.map((line) => (line ? `    ${line}` : line));

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

// The rule and grant lines the gate resolved for one table; without them, the rule types the input names.
function accessOf(access: PlanTableAccess[] | undefined, table: string, policies: Record<string, unknown>[]): string[] {
  const found = access?.find((entry) => entry.table === table);
  if (found) return planAccessLines(found);
  return policies.map((policy) => `rule  ${policyType(policy, '$type') ?? '?'}`);
}

function blueprintMessage(input: Record<string, unknown> | undefined, access: PlanTableAccess[] | undefined): string {
  const definition = obj(input?.definition);
  const tables = arr(definition?.tables).flatMap((table) => {
    const name = typeof table.table_name === 'string' ? table.table_name : '?';
    const schema = typeof table.schema_name === 'string' ? ` (schema ${table.schema_name})` : '';
    const found = access?.find((entry) => entry.table === name);
    return [
      `+ ${name}${schema}`,
      ...under(newTableFieldLines(arr(table.fields).map(previewField), found)),
      ...under(accessOf(access, name, arr(table.policies))),
    ];
  });
  const links = arr(definition?.relations).map((relation) => {
    const kind = typeof relation.relation_type === 'string' ? `  (${relation.relation_type})` : '';
    return `+ link  ${String(relation.source_table ?? '?')} -> ${String(relation.target_table ?? '?')}${kind}`;
  });
  return [...tables, ...links].join('\n');
}

function accessMessage(tableName: string, access: PlanTableAccess[] | undefined, policies: Record<string, unknown>[]): string {
  const lines = accessOf(access, tableName, policies);
  const unchanged = lines.every((line) => line.startsWith('= '));
  return [`${unchanged ? '=' : '~'} ${tableName}${unchanged ? '  no change' : ''}`, ...under(lines)].join('\n');
}

function fieldChanges(input: Record<string, unknown> | undefined): string[] {
  const changes: string[] = [];
  const newName = str(input, 'new_name');
  if (newName) changes.push(`rename -> ${newName}`);
  if (typeof input?.is_required === 'boolean') changes.push(input.is_required ? 'required' : 'optional');
  if (input && 'default_value' in input) {
    const value = defaultOf(input);
    changes.push(value === undefined ? 'no default' : `default -> ${value}`);
  }
  if (typeof input?.is_unique === 'boolean') changes.push(input.is_unique ? 'unique' : 'not unique');
  return changes;
}

function templateChanges(input: Record<string, unknown> | undefined): string[] {
  const patch = obj(input?.patch) ?? {};
  const changes: string[] = [];
  if (typeof patch.displayName === 'string') changes.push(`rename -> ${patch.displayName}`);
  if (typeof patch.description === 'string') changes.push('new description');
  if (Array.isArray(patch.categories)) changes.push(`categories -> ${patch.categories.join(', ') || 'none'}`);
  if (Array.isArray(patch.tags)) changes.push(`tags -> ${patch.tags.join(', ') || 'none'}`);
  if (patch.visibility === 'public') changes.push('public: every account can see and apply it');
  if (patch.visibility === 'private') changes.push('private to this account');
  return changes;
}

const UNDONE = '! This cannot be undone.';

/**
 * What a person reads before a call changes something: what it acts on
 * (`target`, as the gate resolved it), and what the call does as a change
 * list, and nothing it does not do. A call that creates or changes the access
 * of a table states it from `access`: one line per rule, marked against the
 * rules now.
 */
export function buildConfirmPrompt(
  toolName: string,
  input: Record<string, unknown> | undefined,
  resolved: { target: PlanTarget; access?: PlanTableAccess[]; notes?: string[] },
): ConfirmPrompt {
  const call = describeCall(toolName, input, resolved.access, resolved.target);
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
  target: PlanTarget,
): Omit<ConfirmPrompt, 'target'> {
  switch (toolName) {
  case 'provision_database': {
    const name = str(input, 'database_name') ?? '?';
    return {
      title: `Create database ${name}`,
      message: [`+ database  ${name}`, `+ .env      binds this directory to ${name}`].join('\n'),
    };
  }
  case 'replace_database': {
    const name = str(input, 'database_name') ?? '?';
    const replaces = target.kind === 'account' && target.replaces ? databaseWords(target.replaces) : undefined;
    return {
      title: 'Replace the database of this directory',
      message: [
        `+ database  ${name} (empty)`,
        `~ .env      ${replaces ? `${replaces} -> ${name}` : `binds this directory to ${name}`}`,
        `= ${replaces ?? 'The database it uses now'} keeps its data. This directory stops using it.`,
      ].join('\n'),
    };
  }
  case 'provision_blueprint': {
    const tables = blueprintTables(input);
    return {
      title: tables.length === 1 ? `Add table ${tables[0].name}` : `Add ${plural(tables.length, 'table')}`,
      message: blueprintMessage(input, access),
      preview: tables.length > 0 ? { kind: 'blueprint', tables } : undefined,
    };
  }
  case 'add_relation': {
    const source = str(input, 'source_table') ?? '?';
    const linked = str(input, 'target_table') ?? '?';
    const message = str(input, 'relation_type') === 'many_to_many'
      ? `+ ${str(input, 'junction_table_name') ?? '?'}  links ${source} <-> ${linked}`
      : `+ ${source}.${str(input, 'field_name') ?? '?'}  -> ${linked}`;
    return { title: `Link ${source} to ${linked}`, message };
  }
  case 'delete_table': {
    const table = str(input, 'table_name') ?? '?';
    return { title: `Delete table ${table}`, message: [`- ${table}  the table and all its rows`, UNDONE].join('\n') };
  }
  case 'create_field': {
    const tableName = str(input, 'table_name') ?? '?';
    const fieldName = str(input, 'field_name') ?? '?';
    const field = { name: fieldName, type: str(input, 'type') ?? '?', isRequired: input?.is_required === true, defaultValue: defaultOf(input) ?? null };
    const facts = [field.type, ...(field.isRequired ? ['required'] : []), ...(field.defaultValue === null ? [] : [`default ${field.defaultValue}`]), ...(input?.is_unique === true ? ['unique'] : [])];
    return {
      title: `Add field ${tableName}.${fieldName}`,
      message: `+ ${tableName}.${fieldName}  ${facts.join('  ')}`,
      preview: { kind: 'field', tableName, field },
    };
  }
  case 'update_field': {
    const name = `${str(input, 'table_name') ?? '?'}.${str(input, 'field_name') ?? '?'}`;
    return { title: `Change field ${name}`, message: `~ ${name}  ${fieldChanges(input).join('; ')}` };
  }
  case 'retype_field': {
    const name = `${str(input, 'table_name') ?? '?'}.${str(input, 'field_name') ?? '?'}`;
    return {
      title: `Change the type of ${name}`,
      message: [`~ ${name}  -> ${str(input, 'type') ?? '?'}`, '! A value that does not convert fails the change or is lost.'].join('\n'),
    };
  }
  case 'delete_field': {
    const name = `${str(input, 'table_name') ?? '?'}.${str(input, 'field_name') ?? '?'}`;
    return { title: `Delete field ${name}`, message: [`- ${name}  the field and its data`, UNDONE].join('\n') };
  }
  case 'add_policies': {
    const tableName = str(input, 'table_name') ?? '?';
    const given = arr(input?.policies);
    const policies = given.map((policy) => policyType(policy, '$type')).filter((p): p is string => !!p);
    return {
      title: `Add ${plural(given.length, 'rule')} to ${tableName}`,
      message: accessMessage(tableName, access, given),
      preview: policies.length > 0 ? { kind: 'policies', tableName, policies } : undefined,
    };
  }
  case 'set_access': {
    const tableName = str(input, 'table_name') ?? '?';
    return { title: `Replace the rules of ${tableName}`, message: accessMessage(tableName, access, arr(input?.policies)) };
  }
  case 'apply_template': {
    const name = str(input, 'templateName') ?? '?';
    return { title: `Apply template ${name}`, message: `+ the tables of template ${name}` };
  }
  case 'create_template': {
    const source = str(input, 'blueprintName');
    const name = str(input, 'displayName') ?? '?';
    return {
      title: `Save template ${name}`,
      message: `+ template ${name}  from ${source ? `blueprint ${source}` : 'the latest blueprint of this project'}; private until made public`,
    };
  }
  case 'update_template': {
    const name = str(input, 'templateName') ?? '?';
    return { title: `Change template ${name}`, message: `~ ${name}  ${templateChanges(input).join('; ') || 'nothing'}` };
  }
  case 'delete_template': {
    const name = str(input, 'templateName') ?? '?';
    return { title: `Delete template ${name}`, message: [`- template ${name}`, UNDONE].join('\n') };
  }
  case 'add_records': {
    const rows = recordRows(input);
    const tableName = str(input, 'table_name') ?? '?';
    return {
      title: `Add ${plural(rows.length, 'row')} to ${tableName}`,
      message: [`+ ${plural(rows.length, 'row')} into ${tableName}`, ...under(rows.length ? rowLines(rows) : [])].join('\n'),
      preview: rows.length > 0 ? { kind: 'records', tableName, rows } : undefined,
    };
  }
  case 'create_entity_type': {
    const name = str(input, 'name') ?? '?';
    return { title: `Create entity type ${name}`, message: `+ entity type ${name}  a table for its rows, and tables for who belongs to each one` };
  }
  case 'delete_entity_type': {
    const id = str(input, 'entity_type_id') ?? '?';
    return {
      title: `Delete entity type ${id}`,
      message: [`- entity type ${id}  its registration only`, '= Its table and rows stay.'].join('\n'),
    };
  }
  case 'create_api_key': {
    const keyName = str(input, 'key_name') ?? '?';
    const entityIds = Array.isArray(input?.entity_ids) ? input.entity_ids.length : 0;
    const scope = entityIds > 0 ? `scoped to ${entityIds} entit${entityIds === 1 ? 'y' : 'ies'}` : 'unscoped: it acts as your signed-in app user';
    return {
      title: `Create API key ${keyName}`,
      message: [
        `+ API key ${keyName}  ${scope}${input?.read_only === true ? ', read-only' : ''}`,
        '! You may need to give your password. The key goes to .env and is shown to you once, never to the agent.',
      ].join('\n'),
    };
  }
  case 'run_codegen':
    return { title: 'Generate the app SDK', message: '~ packages/app/src/graphql/sdk  generated again from the database' };
  default:
    return { title: `Run ${toolName}`, message: `Run the tool "${toolName}".` };
  }
}
