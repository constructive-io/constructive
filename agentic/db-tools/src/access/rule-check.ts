// The data of a rule a caller writes, checked against its Authz node's closed parameter_schema before anything changes.
// The schema is the registry's, in the form a caller writes it (the blueprint JSON Schema's node data definitions), so
// this check and the backend read the same truth; ajv does the validating.

import { listed, nearestName } from '@agentic-kit/harness';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { blueprintDefinitionJsonSchema, type JSONSchema, policyNodeTypes } from 'node-type-registry';

import { AUTHZ_NODES, defaultsOf, isObject, join, quoted, type RuleProblem } from './policies';

/**
 * The roles a rule can name: the request roles of the GraphQL API (`authenticated`, `anonymous`), the function lane's
 * floor (`authenticated_client`), and PostgreSQL's `public`, which is every role. The backend creates the policy for
 * the role as given, so another name fails there. An API may name its own request roles, so a caller can pass them.
 */
export const POLICY_ROLES = ['authenticated', 'anonymous', 'authenticated_client', 'public'] as const;

const COMBINATORS = ['AND', 'OR', 'NOT'];
const POLICY_TYPES = new Set(policyNodeTypes.map((node) => node.name));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let ajv: Ajv | undefined;

/**
 * A copy to validate: the validator fills registry defaults into what it checks, and a JSON copy shares no object
 * between two places, so a default filled in one rule never lands in another.
 */
export const jsonCopy = <T>(value: T): T => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const validators = new Map<string, ValidateFunction>();

/**
 * A validator of one definition of the registry's blueprint JSON Schema (`BlueprintDefinition`, `AuthzEntityMembershipParams`,
 * ...), with the formats the schema names. Registry defaults fill missing keys before the required keys are checked, as the
 * backend does, so a caller validates a copy.
 */
export function blueprintValidator(definition: string): ValidateFunction {
  if (!ajv) {
    ajv = new Ajv({ allErrors: true, strict: false, verbose: true, useDefaults: true });
    // A column name cannot be empty: PostgreSQL refuses a zero-length identifier.
    ajv.addFormat('column-ref', (name: string) => name.length > 0);
    ajv.addFormat('uuid', UUID);
    ajv.addFormat('function-ref', true);
    ajv.addFormat('labeled', true);
    ajv.addSchema(blueprintDefinitionJsonSchema, 'blueprint');
  }
  let validate = validators.get(definition);
  if (!validate) {
    validate = ajv.getSchema(`blueprint#/$defs/${definition}`);
    if (!validate) throw new Error(`The blueprint JSON Schema of node-type-registry has no definition ${definition}; rebuild node-type-registry.`);
    validators.set(definition, validate);
  }
  return validate;
}

const TYPE_WORDS: Record<string, string> = {
  string: 'a string',
  integer: 'an integer',
  number: 'a number',
  boolean: 'true or false',
  array: 'a list',
  object: 'an object',
  null: 'null'
};

// What a schema allows, in words.
function allowed(schema: JSONSchema): string {
  if (schema.enum) return `one of ${schema.enum.map((value) => JSON.stringify(value)).join(', ')}`;
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.anyOf) return listed(schema.anyOf.map(allowed), 'or');
  const types = [schema.type ?? []].flat();
  return types.length ? listed(types.map((type) => TYPE_WORDS[type] ?? type), 'or') : 'a value its schema allows';
}

// The Authz node a path is in: the last node name on it, or the rule's own type.
function nodeAt(type: string, path: string): string {
  return path.split('.').filter((segment) => AUTHZ_NODES.has(segment)).pop() ?? type;
}

const isExpressionLevel = (schema: JSONSchema | undefined): boolean => Boolean(schema?.properties?.AND && schema.properties.OR && schema.properties.NOT);

function callerKeys(node: string): string[] {
  return Object.entries(AUTHZ_NODES.get(node)?.parameter_schema.properties ?? {})
    .filter(([, schema]) => !schema.readOnly)
    .map(([key]) => key)
    .sort();
}

/**
 * Keys a member rule's data can hold that these tools do not support in a rule you write, with what to use instead.
 * A stored rule that holds one is said as a setting the words do not describe.
 */
const NOT_SUPPORTED: Record<string, string> = {
  any_array: 'a team column that holds a list of teams is not supported. Name a column that holds one team id.',
  include_current_user_id: 'counting the person\'s own id as a team is not supported. For rows that name the person, add an AuthzDirectOwner rule.',
  entity_capability_check: 'matching the member list against the row instead of the person is not supported. To ask more of a member, use is_admin, is_owner, capabilities, levels or mask.'
};

/** The keys the backend reads from a member rule's data that NOT_SUPPORTED keeps out of a rule you write. */
export const READ_BUT_NOT_SUPPORTED: readonly string[] = Object.keys(NOT_SUPPORTED);

function extraKey(type: string, at: string, key: string, parent: JSONSchema | undefined): RuleProblem {
  const path = join(at, key);
  if (isExpressionLevel(parent)) {
    const takes = `A rule you write takes only Authz nodes and ${listed(quoted(COMBINATORS))}.`;
    const same = COMBINATORS.find((name) => name.toLowerCase() === key.toLowerCase());
    if (same) return { path, code: 'not-a-node', message: `${type}: "${key}" is not a key the backend reads. Use "${same}": the combinators are in capitals.` };
    if (AUTHZ_NODES.has(key)) return { path, code: 'not-in-expression', message: `${type}: ${key} cannot be built inside an expression. Give it as a rule of its own.` };
    const meant = nearestName(key, [...AUTHZ_NODES.keys()]);
    if (meant) return { path, code: 'mistyped-node', message: `${type}: "${key}" is not an Authz node; did you mean "${meant}"? ${takes}`, meant };
    return { path, code: 'not-a-node', message: `${type}: "${key}" is not an Authz node: it is a raw expression or a node the registry does not have. ${takes}` };
  }
  const node = nodeAt(type, at);
  // At the node's own data, or in an object nested in it.
  const own = at === '' || at.endsWith(node);
  if (own && AUTHZ_NODES.get(node)?.parameter_schema.properties?.[key]?.readOnly) {
    return { path, code: 'stored-only-key', message: `${node}'s "${key}" is set by the backend or the platform, and a rule you write does not give it. Leave it out.` };
  }
  if (own && Object.hasOwn(NOT_SUPPORTED, key)) return { path, code: 'not-supported', message: `${node}'s "${key}": ${NOT_SUPPORTED[key]}` };
  const keys = own ? callerKeys(node) : Object.keys(parent?.properties ?? {}).sort();
  const meant = nearestName(key, keys);
  return {
    path,
    code: 'unknown-key',
    message:
      `${node} has no key "${path}"${meant ? `; did you mean "${meant}"?` : '.'} The backend would store it and ignore it, so the rule ` +
      `would let in more people than you meant. ${keys.length ? `It takes ${listed(quoted(keys))}.` : 'It takes no keys.'}`,
    ...(meant ? { meant } : {})
  };
}

const groupsOf = (branches: unknown): string[][] | undefined =>
  Array.isArray(branches) && branches.every((branch) => isObject(branch) && Array.isArray(branch.required)) ? branches.map((branch) => branch.required as string[]) : undefined;

// A branch of a oneOf or anyOf fails on its own whenever the whole fails; the whole is reported instead.
const inBranch = (error: ErrorObject): boolean => /\/(oneOf|anyOf)\/\d+\//.test(error.schemaPath);

function problemOf(type: string, error: ErrorObject): RuleProblem | undefined {
  if (inBranch(error)) return undefined;
  const at = error.instancePath.split('/').slice(1).map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~')).join('.');
  const label = at ? `${nodeAt(type, at)}'s "${at}"` : `${type}'s data`;
  const schema = error.parentSchema as JSONSchema | undefined;
  switch (error.keyword) {
  case 'additionalProperties':
    return extraKey(type, at, String(error.params.additionalProperty), schema);
  case 'required': {
    const key = String(error.params.missingProperty);
    const property = schema?.properties?.[key];
    return { path: join(at, key), code: 'required', message: `${nodeAt(type, at)} needs "${join(at, key)}"${property ? ` (${allowed(property)})` : ''}. Add it.` };
  }
  case 'oneOf':
  case 'anyOf': {
    const groups = groupsOf(error.schema);
    if (!groups) return { path: at, code: 'type', message: `${label} must be ${allowed(schema ?? {})}.` };
    const options = listed(groups.map((group) => listed(quoted(group))), 'or');
    const both = error.keyword === 'oneOf' && Array.isArray(error.params.passingSchemas);
    return {
      path: at,
      code: 'one-of',
      message: both ? `${nodeAt(type, at)} takes exactly one of ${options}, not more. Leave one out.` : `${nodeAt(type, at)} needs ${options}, and the backend refuses the rule without one of them. Add one.`
    };
  }
  case 'type':
  case 'enum':
  case 'const':
    return { path: at, code: error.keyword, message: `${label} must be ${allowed(schema ?? {})}.` };
  case 'minimum':
  case 'maximum':
    return { path: at, code: 'range', message: `${label} must be ${error.keyword === 'minimum' ? 'at least' : 'at most'} ${error.params.limit}.` };
  case 'minItems':
    return { path: at, code: 'not-empty', message: `${label} must list at least ${error.params.limit} item${error.params.limit === 1 ? '' : 's'}, and the backend refuses an empty list.` };
  case 'minLength':
    return { path: at, code: 'not-empty', message: `${label} cannot be empty.` };
  case 'minProperties':
  case 'maxProperties':
    return {
      path: at,
      code: 'expression',
      message: `${label} must hold exactly one key: ${listed(quoted(COMBINATORS))} or one Authz node, as in {"AuthzEntityMembership": {...}}. Put several parts under "AND" or "OR".`
    };
  case 'format':
    return error.params.format === 'column-ref'
      ? { path: at, code: 'not-empty', message: `${label} names a column, and a column name cannot be empty. Give the column's name.` }
      : { path: at, code: 'format', message: `${label} must be a ${error.params.format}.` };
  case 'pattern':
    return { path: at, code: 'pattern', message: `${label} must match ${error.params.pattern}.` };
  case 'not':
    return { path: at, code: 'not', message: `${label} cannot be ${allowed((schema?.not as JSONSchema) ?? {})}.` };
  default:
    // `if` repeats the errors of its `then`, which are reported on their own.
    return error.keyword === 'if' ? undefined : { path: at, code: error.keyword, message: `${label} ${error.message}.` };
  }
}

function roleProblem(role: string | undefined, roles: readonly string[]): RuleProblem[] {
  if (role === undefined || roles.includes(role)) return [];
  const meant = nearestName(role, [...roles]);
  return [
    {
      path: 'role',
      code: 'unknown-role',
      message:
        `The role "${role}" is not a role a rule can name${meant ? `; did you mean "${meant}"?` : '.'} ` +
        `The backend creates the policy for the role as given, and it fails for a role that does not exist. Use ${listed(quoted([...roles]), 'or')}.`,
      ...(meant ? { meant } : {})
    }
  ];
}

/** A table a rule names: by id, or by schema and name. */
export type TableRef = { id?: string; schema?: string; name?: string };

/**
 * What a rule is checked with: the role it names and the roles it may name (`POLICY_ROLES` when not given), whether a
 * blueprint builds it (only a blueprint resolves a module's table), and the columns of another table it names, when
 * the caller knows them.
 */
export type RuleContext = {
  role?: string;
  roles?: readonly string[];
  inBlueprint?: boolean;
  columnsOf?: (table: TableRef) => readonly string[] | undefined;
};

/** The column names AuthzOrgHierarchy does not support for the columns of its own table. */
const CHART_COLUMN_NAMES = ['entity_id', 'ancestor_id', 'descendant_id', 'depth'];

type Visit = (type: string, data: Record<string, unknown>, path: string) => void;

function eachPart(value: unknown, path: string, visit: Visit): void {
  if (Array.isArray(value)) return value.forEach((item, i) => eachPart(item, join(path, i), visit));
  if (!isObject(value)) return;
  for (const [key, inner] of Object.entries(value)) {
    if (COMBINATORS.includes(key)) eachPart(inner, join(path, key), visit);
    else if (AUTHZ_NODES.has(key) && isObject(inner)) eachLeaf(key, inner, join(path, key), visit);
  }
}

// Each Authz node of a rule, nested ones included.
function eachLeaf(type: string, data: Record<string, unknown>, path: string, visit: Visit): void {
  if (type === 'AuthzComposite') return eachPart(data, path, visit);
  visit(type, data, path);
}

/**
 * The rule shapes these tools do not support, which the parameter schema cannot say: a module's table outside a
 * blueprint, and the shapes the backend builds into a weaker check than the data says. A stored rule of such a shape
 * is one its words cannot fully state.
 */
export function unsupportedShapes(type: string, data: Record<string, unknown>, context: RuleContext): RuleProblem[] {
  const problems: RuleProblem[] = [];
  eachLeaf(type, data, '', (node, given, at) => {
    const values = { ...defaultsOf(node), ...given };
    if (!context.inBlueprint && values.ref_module !== undefined) {
      problems.push({
        path: join(at, 'ref_module'),
        code: 'not-supported',
        message: `${node}'s "ref_module" names a table a module made, which only a blueprint resolves. Give the table as "ref_table_id", or as "ref_schema" and "ref_table".`
      });
    }
    if (node === 'AuthzOrgHierarchy') {
      for (const param of ['entity_field', 'anchor_field']) {
        const column = values[param];
        if (typeof column !== 'string' || !CHART_COLUMN_NAMES.includes(column)) continue;
        problems.push({
          path: join(at, param),
          code: 'not-supported',
          message:
            `${node}'s "${param}" is "${column}"${given[param] === undefined ? ' (its default)' : ''}, and this rule does not support a column named ` +
            `${listed(quoted(CHART_COLUMN_NAMES), 'or')}. Name a column with another name.`
        });
      }
    }
    if (node === 'AuthzRelatedMemberList' && typeof values.this_object_key === 'string') {
      const columns = context.columnsOf?.({ id: values.owned_table_id as string, schema: values.owned_schema as string, name: values.owned_table as string });
      if (columns?.includes(values.this_object_key)) {
        problems.push({
          path: join(at, 'this_object_key'),
          code: 'not-supported',
          message:
            `${node}'s "this_object_key" is "${values.this_object_key}", and the related table has a column of that name too, which this rule does not support. ` +
            'Name a column of this table whose name the related table does not have.'
        });
      }
    }
  });
  return problems;
}

/**
 * The problems of one rule a caller writes for Authz node `type`: its data against the node's closed parameter_schema
 * (nested Authz nodes included), the rule shapes these tools do not support, and the role it names. An empty list
 * means the backend builds the rule as written. A key the backend or the platform sets is `stored-only-key`, a key
 * these tools do not support is `not-supported`, any other key the node does not take is `unknown-key`, and a part
 * that is not an Authz node or AND, OR, NOT is refused.
 */
export function checkRule(type: string, data: unknown, context: RuleContext = {}): RuleProblem[] {
  const roles = roleProblem(context.role, context.roles ?? POLICY_ROLES);
  if (AUTHZ_NODES.has(type) && !POLICY_TYPES.has(type)) {
    return [
      {
        path: '',
        code: 'not-a-policy',
        message: `${type} is not a policy type a rule can use: it guards writes to columns, and a blueprint gives it in a table's "nodes". Use a policy type for a rule.`
      },
      ...roles
    ];
  }
  if (!AUTHZ_NODES.has(type)) {
    const meant = nearestName(type, [...POLICY_TYPES]);
    return [
      {
        path: '',
        code: meant ? 'mistyped-node' : 'not-a-node',
        message: `"${type}" is not an Authz node${meant ? `; did you mean "${meant}"?` : '.'} Use the name of one, for example "AuthzEntityMembership".`,
        ...(meant ? { meant } : {})
      },
      ...roles
    ];
  }
  if (data !== undefined && !isObject(data)) return [{ path: '', code: 'type', message: `${type}'s data must be an object of its parameters.` }, ...roles];
  const validate = blueprintValidator(`${type}Params`);
  const problems = validate(jsonCopy(data ?? {})) ? unsupportedShapes(type, (data ?? {}) as Record<string, unknown>, context) : validate.errors.map((error) => problemOf(type, error)).filter(Boolean);
  // One problem per place: a wrong type there also fails the rules about it.
  return [...roles, ...problems.filter((problem, i) => problems.findIndex((other) => other.path === problem.path) === i)];
}
