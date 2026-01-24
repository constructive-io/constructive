/**
 * GraphQL operation builders for common SDK operations
 * These mirror the patterns from @constructive-io/sdk
 */

/**
 * Build a findMany query document
 */
export function buildFindManyQuery(
  modelName: string,
  pluralName: string,
  select: Record<string, unknown>,
  options?: {
    where?: Record<string, unknown>;
    orderBy?: string[];
    first?: number;
    last?: number;
    after?: string;
    before?: string;
    offset?: number;
  }
): { document: string; variables: Record<string, unknown> } {
  const selectFields = buildSelectFields(select);
  const filterType = `${modelName}Filter`;
  const orderByType = `${capitalize(pluralName)}OrderBy`;

  const variables: Record<string, unknown> = {};
  const args: string[] = [];

  if (options?.where) {
    variables.where = options.where;
    args.push(`filter: $where`);
  }
  if (options?.orderBy) {
    variables.orderBy = options.orderBy;
    args.push(`orderBy: $orderBy`);
  }
  if (options?.first !== undefined) {
    variables.first = options.first;
    args.push(`first: $first`);
  }
  if (options?.last !== undefined) {
    variables.last = options.last;
    args.push(`last: $last`);
  }
  if (options?.after) {
    variables.after = options.after;
    args.push(`after: $after`);
  }
  if (options?.before) {
    variables.before = options.before;
    args.push(`before: $before`);
  }
  if (options?.offset !== undefined) {
    variables.offset = options.offset;
    args.push(`offset: $offset`);
  }

  const variablesDef = buildVariablesDef({
    where: filterType,
    orderBy: `[${orderByType}!]`,
    first: 'Int',
    last: 'Int',
    after: 'Cursor',
    before: 'Cursor',
    offset: 'Int',
  }, variables);

  const argsStr = args.length > 0 ? `(${args.join(', ')})` : '';

  const document = `
query ${modelName}FindMany${variablesDef} {
  ${pluralName}${argsStr} {
    nodes {
      ${selectFields}
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}`.trim();

  return { document, variables };
}

/**
 * Build a findFirst query document
 */
export function buildFindFirstQuery(
  modelName: string,
  pluralName: string,
  select: Record<string, unknown>,
  options?: {
    where?: Record<string, unknown>;
  }
): { document: string; variables: Record<string, unknown> } {
  const selectFields = buildSelectFields(select);
  const filterType = `${modelName}Filter`;

  const variables: Record<string, unknown> = {};
  const args: string[] = ['first: 1'];

  if (options?.where) {
    variables.where = options.where;
    args.push(`filter: $where`);
  }

  const variablesDef = buildVariablesDef({ where: filterType }, variables);
  const argsStr = `(${args.join(', ')})`;

  const document = `
query ${modelName}FindFirst${variablesDef} {
  ${pluralName}${argsStr} {
    nodes {
      ${selectFields}
    }
  }
}`.trim();

  return { document, variables };
}

/**
 * Build a create mutation document
 */
export function buildCreateMutation(
  modelName: string,
  mutationName: string,
  fieldName: string,
  select: Record<string, unknown>,
  data: Record<string, unknown>,
  inputType: string
): { document: string; variables: Record<string, unknown> } {
  const selectFields = buildSelectFields(select);

  const variables = {
    input: {
      [fieldName]: data,
    },
  };

  const document = `
mutation ${modelName}Create($input: ${inputType}!) {
  ${mutationName}(input: $input) {
    ${fieldName} {
      ${selectFields}
    }
  }
}`.trim();

  return { document, variables };
}

/**
 * Build an update mutation document
 */
export function buildUpdateMutation(
  modelName: string,
  mutationName: string,
  fieldName: string,
  select: Record<string, unknown>,
  where: { id: string },
  data: Record<string, unknown>,
  inputType: string
): { document: string; variables: Record<string, unknown> } {
  const selectFields = buildSelectFields(select);

  const variables = {
    input: {
      id: where.id,
      patch: data,
    },
  };

  const document = `
mutation ${modelName}Update($input: ${inputType}!) {
  ${mutationName}(input: $input) {
    ${fieldName} {
      ${selectFields}
    }
  }
}`.trim();

  return { document, variables };
}

/**
 * Build a delete mutation document
 */
export function buildDeleteMutation(
  modelName: string,
  mutationName: string,
  fieldName: string,
  where: { id: string },
  inputType: string
): { document: string; variables: Record<string, unknown> } {
  const variables = {
    input: {
      id: where.id,
    },
  };

  const document = `
mutation ${modelName}Delete($input: ${inputType}!) {
  ${mutationName}(input: $input) {
    ${fieldName} {
      id
    }
  }
}`.trim();

  return { document, variables };
}

/**
 * Build select fields from a select object
 */
function buildSelectFields(
  select: Record<string, unknown>,
  indent = 0
): string {
  const spaces = '  '.repeat(indent);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(select)) {
    if (value === true) {
      lines.push(`${spaces}${key}`);
    } else if (typeof value === 'object' && value !== null) {
      const nested = value as Record<string, unknown>;
      if (nested.nodes) {
        // Connection type
        const nodeFields = buildSelectFields(
          nested.nodes as Record<string, unknown>,
          indent + 2
        );
        lines.push(`${spaces}${key} {`);
        lines.push(`${spaces}  nodes {`);
        lines.push(nodeFields);
        lines.push(`${spaces}  }`);
        lines.push(`${spaces}}`);
      } else {
        // Nested object
        const nestedFields = buildSelectFields(nested, indent + 1);
        lines.push(`${spaces}${key} {`);
        lines.push(nestedFields);
        lines.push(`${spaces}}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Build GraphQL variables definition
 */
function buildVariablesDef(
  types: Record<string, string>,
  variables: Record<string, unknown>
): string {
  const defs: string[] = [];

  for (const [name, type] of Object.entries(types)) {
    if (variables[name] !== undefined) {
      defs.push(`$${name}: ${type}`);
    }
  }

  return defs.length > 0 ? `(${defs.join(', ')})` : '';
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert camelCase to PascalCase
 */
export function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert PascalCase to camelCase
 */
export function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Get plural form of a model name (simple heuristic)
 */
export function pluralize(name: string): string {
  if (name.endsWith('y')) {
    return name.slice(0, -1) + 'ies';
  }
  if (name.endsWith('s') || name.endsWith('x') || name.endsWith('ch') || name.endsWith('sh')) {
    return name + 'es';
  }
  return name + 's';
}
