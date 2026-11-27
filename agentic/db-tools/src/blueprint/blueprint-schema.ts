// The blueprint as provision_blueprint takes it, and the one rule shape every access tool takes. The parameter schemas
// stay small: they name the keys, and the registry's blueprint JSON Schema checks a whole definition and each rule
// inside the tool, the way the backend reads them.

import { identifierParam, listed, looseObject, nearestName, strictObject, textParam } from '@agentic-kit/harness';
import { type BlueprintDefinition, type BlueprintField, type BlueprintTable, type FieldDefault, type FieldType, policyNodeTypes } from 'node-type-registry';
import { z } from 'zod';

import { quoted, type RuleProblem } from '../access/policies';
import { blueprintValidator, jsonCopy } from '../access/rule-check';

const POLICY_TYPES = policyNodeTypes.map((node) => node.name);

/** The policy types a rule takes: the registry's Authz nodes that are policies. */
export const AuthzTypeZod = z
  .enum(POLICY_TYPES as [string, ...string[]])
  .describe('A policy type: an Authz node of the registry (node-type-registry); its data takes the parameters of that node');

/** What a rule object says about a key of another rule shape, or one the tools do not support. */
export const RULE_KEY_HINTS: Record<string, string> = {
  role: 'is not a key of a rule: the role is "policy_role".',
  restrictive: 'is not a key of a rule: a restrictive rule has "permissive": false.',
  policy_type: 'is not a key of a rule: the type is "$type".',
  operations: 'is not a key of a rule: give "privileges" (select, insert, update, delete).',
  with_check: 'is not supported in a rule you write: the tools cannot give an update rule its own check of the changed row.',
};

/**
 * One access rule, in the registry's blueprint shape (`BlueprintPolicy`). The tool checks it against that shape
 * (`ruleShapeProblems`) and its data against its policy type.
 */
export const AccessPolicyZod = looseObject({
  $type: z.string().describe('The policy type: an Authz node, for example "AuthzEntityMembership"'),
  privileges: z.array(z.string()).optional().describe('The privileges the rule covers: select, insert, update or delete'),
  permissive: z.boolean().optional().describe('False for a restrictive rule, a limit every row must also pass. Default true.'),
  policy_role: textParam().optional().describe('Default "authenticated"'),
  policy_name: textParam().optional().describe('The name of the rule, when two rules of one policy type, role and privilege are on one table'),
  data: z.record(z.string(), z.unknown()).optional().describe("The node's parameters, as its parameter schema names them"),
}).describe('One rule: {$type, privileges, permissive, policy_role, policy_name, data}');

export type AccessPolicy = z.infer<typeof AccessPolicyZod>;

// A branch of a oneOf or anyOf fails on its own whenever the whole fails; the whole is reported instead. `if` repeats the
// errors of its `then`.
const reported = (error: { schemaPath: string; keyword: string }): boolean => !/\/(oneOf|anyOf)\/\d+\//.test(error.schemaPath) && error.keyword !== 'if';

const RULE_KEYS = ['$type', 'privileges', 'permissive', 'policy_role', 'policy_name', 'data'];

/**
 * What is wrong with one rule's shape, by the registry's `BlueprintPolicy`: its keys, its policy type and its
 * privileges, which a rule here always gives (its data is its policy type's to check). `with_check` is refused unless
 * `withCheck` allows it.
 */
export function ruleShapeProblems(rule: unknown, { withCheck = false }: { withCheck?: boolean } = {}): RuleProblem[] {
  if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) return [{ path: '', code: 'type', message: 'A rule must be an object.' }];
  const without = (value: Record<string, unknown>, key: string) => Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
  const envelope = without(rule as Record<string, unknown>, 'data');
  const unchecked = without(envelope, 'with_check');
  const problems: RuleProblem[] = [];
  if (envelope.privileges === undefined) problems.push({ path: 'privileges', code: 'privileges', message: '"privileges" is missing: give the privileges the rule covers, from select, insert, update and delete.' });
  if (!withCheck && envelope.with_check !== undefined) problems.push({ path: 'with_check', code: 'not-supported', message: `"with_check" ${RULE_KEY_HINTS.with_check}` });
  const validate = blueprintValidator('BlueprintPolicy');
  if (!validate(jsonCopy(withCheck ? envelope : unchecked))) {
    for (const error of validate.errors.filter(reported)) {
      const path = error.instancePath.split('/').slice(1).join('.');
      if (error.keyword === 'additionalProperties') {
        const key = String(error.params.additionalProperty);
        const meant = nearestName(key, RULE_KEYS);
        problems.push({
          path: key,
          code: 'unknown-key',
          message: `"${key}" ${Object.hasOwn(RULE_KEY_HINTS, key) ? RULE_KEY_HINTS[key] : meant ? `is not a key of a rule: use "${meant}".` : `is not a key of a rule: its keys are ${listed(quoted(RULE_KEYS))}.`}`,
          ...(meant ? { meant } : {}),
        });
      } else if (path === '$type' || (error.keyword === 'required' && error.params.missingProperty === '$type')) {
        const meant = typeof envelope.$type === 'string' ? nearestName(envelope.$type, POLICY_TYPES) : undefined;
        problems.push({
          path: '$type',
          code: meant ? 'mistyped-node' : 'not-a-node',
          message: `"$type" ${envelope.$type === undefined ? 'is missing' : `is ${JSON.stringify(envelope.$type)}, which is not a policy type`}${meant ? `; did you mean "${meant}"?` : '.'} Give the policy type of the rule.`,
          ...(meant ? { meant } : {}),
        });
      } else if (path.startsWith('privileges')) {
        problems.push({ path, code: 'privileges', message: `"privileges" must list one or more of select, insert, update and delete.` });
      } else {
        problems.push({ path, code: error.keyword, message: `"${path}" ${error.message}.` });
      }
    }
  }
  return problems.filter((problem, i) => problems.findIndex((other) => other.path === problem.path) === i);
}

const DefinitionZod = z
  .looseObject({
    tables: z
      // The names a plan shows are plain text; the rest of a table is the schema's to check.
      .array(z.looseObject({ table_name: identifierParam().optional(), fields: z.array(z.looseObject({ name: identifierParam() })).optional() }))
      .describe(
        'The tables to create. A table takes table_name, and optionally schema_name, fields, nodes, policies, grants, use_rls, indexes, ' +
          'unique_constraints, check_constraints and full_text_searches. A field is {name, type, is_required, default}: its type a name ' +
          '("text", "text[]") or a type object, its default SQL text ("now()"), a number, true or false, or a default object. A rule is ' +
          '{$type, privileges, permissive, policy_role, data}. Every table gets id, created_at and updated_at, and the columns its rules need.',
      ),
  })
  .describe(
    'The blueprint: tables, and optionally relations ({$type: "RelationBelongsTo", source_table, target_table, field_name, ...; ' +
      'source_schema and target_schema name the schema of each end}), indexes, unique_constraints, check_constraints, full_text_searches, ' +
      'entity_types and the other keys of a blueprint. The whole blueprint is checked against the blueprint JSON Schema of node-type-registry ' +
      'before anything changes.',
  );

export const BlueprintZod = strictObject('the input', {
  name: textParam().describe('Blueprint name in snake_case'),
  description: z.string().describe('Brief description of what this schema is for'),
  definition: DefinitionZod,
  categories: z.array(textParam()).optional().describe('Template categories if saved as template, e.g. ["e-commerce", "healthcare"]'),
  tags: z.array(textParam()).optional().describe('Freeform search tags if saved as template, e.g. ["products", "orders"]'),
});

/** A field as a caller writes it: its type as a name ("text", "text[]") or a type object, its default as SQL text, a constant, or a default object. */
export type FieldBlueprint = Omit<BlueprintField, 'type' | 'default'> & { type: string | FieldType; default?: string | number | boolean | null | FieldDefault };

/** A table as a caller writes it. */
export type TableBlueprint = Omit<BlueprintTable, 'fields'> & { fields?: FieldBlueprint[] };

/** The input of provision_blueprint, with the definition as a caller writes it. */
export type Blueprint = {
  name: string;
  description: string;
  definition: Omit<BlueprintDefinition, 'tables'> & { tables: TableBlueprint[] };
  categories?: string[];
  tags?: string[];
};


const at = (instancePath: string): string => ['definition', ...instancePath.split('/').slice(1)].join('.');

/**
 * What is wrong with a blueprint the backend would receive, by the registry's blueprint JSON Schema: one sentence per
 * place, none when it fits. The backend checks it again with its own rules.
 */
export function blueprintProblems(definition: unknown): string[] {
  const validate = blueprintValidator('BlueprintDefinition');
  if (validate(jsonCopy(definition))) return [];
  const sentences = validate.errors.filter(reported).map((error) => {
    const place = at(error.instancePath);
    switch (error.keyword) {
    case 'required':
      return `${place} needs "${error.params.missingProperty}".`;
    case 'additionalProperties':
      return `${place} has no key "${error.params.additionalProperty}".`;
    case 'enum':
      return `${place} must be one of ${(error.params.allowedValues as unknown[]).map((value) => JSON.stringify(value)).join(', ')}.`;
    case 'anyOf':
    case 'oneOf':
      return `${place} is not in a shape it takes.`;
    default:
      return `${place} ${error.message}.`;
    }
  });
  return [...new Set(sentences)];
}
