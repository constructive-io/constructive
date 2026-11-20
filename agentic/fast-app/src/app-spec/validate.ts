// Checks an AppSpec against the JSON Schema that ships with the composed app,
// then against itself (names that must exist, seed rows that must fit). Every
// error is a path into the spec plus a message the agent can act on.

import { Check, Errors } from 'typebox/schema';

import { CURATED_BLUEPRINTS, type CuratedBlueprint } from '../blueprints/curated';
import { checkReferences } from './references';
import { type SpecModel, specModel } from './spec-model';
import type { AppSpec, AppSpecError, SeedRow } from './types';

export type { AppSpecError };

/** A valid spec comes with its model, for the seed plan and the delta to reuse. */
export type AppSpecValidation =
  | { ok: true; spec: AppSpec; model: SpecModel }
  | { ok: false; errors: AppSpecError[] };

type JsonSchema = Record<string, unknown>;

/** Where the composed app keeps the schema, and where a template checkout does. */
export const APP_SPEC_SCHEMA_FILE = 'scripts/gen/app-spec.schema.json';
export const TEMPLATE_SPEC_SCHEMA_FILE = 'shared/gen/app-spec.schema.json';

const isObject = (value: unknown): value is JsonSchema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function resolveRef(root: JsonSchema, schema: JsonSchema): JsonSchema {
  const ref = schema.$ref;
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return schema;
  let node: unknown = root;
  for (const part of ref.slice(2).split('/')) node = isObject(node) ? node[part] : undefined;
  return isObject(node) ? node : schema;
}

function inlineRefs(root: JsonSchema, schema: JsonSchema): JsonSchema {
  let node = schema;
  for (let hops = 0; typeof node.$ref === 'string' && hops < 16; hops++) {
    const target = resolveRef(root, node);
    if (target === node) break;
    const { $ref: _ref, ...siblings } = node;
    node = { ...siblings, ...target };
  }
  return node;
}

// The schema picks a branch with if/then/else on `kind` (the backend, each
// dashboard tile), and a failed `then` reports only "must match then schema".
// So the schema is narrowed to this spec before the check: each if/then/else
// on the way to a value becomes the branch the value takes, under `allOf`,
// whose errors do surface. When the value fails the rest of the node (an
// unknown kind), no branch is added, so that error stands alone. Arrays get
// one schema per item, because two tiles can take different branches.
function narrow(root: JsonSchema, schema: unknown, value: unknown, depth = 0): unknown {
  if (!isObject(schema) || depth > 32) return schema;
  let node = inlineRefs(root, schema);
  if (isObject(node.if)) {
    const { if: condition, then: yes, else: no, ...rest } = node;
    const defs = { $defs: root.$defs };
    const branch = !Check({ ...rest, ...defs } as never, value)
      ? undefined
      : Check({ ...condition, ...defs } as never, value)
        ? yes
        : no;
    node = isObject(branch)
      ? { ...rest, allOf: [...(Array.isArray(rest.allOf) ? rest.allOf : []), branch] }
      : rest;
  }
  const out: JsonSchema = { ...node };
  if (isObject(node.properties) && isObject(value)) {
    out.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, child]) => [
        key,
        key in value ? narrow(root, child, value[key], depth + 1) : child,
      ]),
    );
  }
  if (isObject(node.items) && !('prefixItems' in node) && Array.isArray(value)) {
    out.prefixItems = value.map((item) => narrow(root, node.items, item, depth + 1));
  }
  if (Array.isArray(node.allOf)) {
    out.allOf = node.allOf.map((member) => narrow(root, member, value, depth + 1));
  }
  return out;
}

type RawError = {
  keyword: string;
  instancePath: string;
  params: Record<string, unknown>;
  message: string;
};

/** `/backend/entities/0/name` → `backend.entities[0].name` */
export function pointerToPath(pointer: string): string {
  const parts = pointer.split('/').slice(1);
  let out = '';
  for (const raw of parts) {
    const part = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    out += /^\d+$/.test(part) ? `[${part}]` : out ? `.${part}` : part;
  }
  return out || '(spec)';
}

function valueAt(spec: unknown, pointer: string): unknown {
  let node = spec;
  for (const part of pointer.split('/').slice(1)) {
    node =
      isObject(node) || Array.isArray(node) ? (node as Record<string, unknown>)[part] : undefined;
  }
  return node;
}

function toErrors(spec: unknown, error: RawError): AppSpecError[] {
  const at = pointerToPath(error.instancePath);
  const got = JSON.stringify(valueAt(spec, error.instancePath));
  const { params } = error;
  switch (error.keyword) {
  case 'required':
    return ((params.requiredProperties as string[]) ?? []).map((name) => ({
      path: at,
      message: `missing the required property "${name}"`,
    }));
  case 'additionalProperties':
    return ((params.additionalProperties as string[]) ?? []).map((name) => ({
      path: at === '(spec)' ? name : `${at}.${name}`,
      message: 'is not a property the AppSpec knows; remove it',
    }));
  case 'enum':
    return [
      {
        path: at,
        message: `must be one of ${(params.allowedValues as unknown[]).map((v) => JSON.stringify(v)).join(', ')}, not ${got}`,
      },
    ];
  case 'const':
    return [{ path: at, message: `must be ${JSON.stringify(params.allowedValue)}, not ${got}` }];
  case 'pattern':
    return [{ path: at, message: `${got} must match ${String(params.pattern)}` }];
  case 'boolean':
  case 'if':
  case 'oneOf':
  case 'anyOf':
    return [];
  default:
    return [{ path: at, message: error.message }];
  }
}

export type ValidateOptions = {
  /** The curated blueprints a blueprint backend is checked against; the shipped ones by default. */
  blueprints?: Readonly<Record<string, CuratedBlueprint>>;
  /**
   * Per table, the sample rows in the database already. A seed that starts
   * with them isn't held to the table as it is now (a column made required
   * outside the app); their references still are.
   */
  landed?: Readonly<Record<string, readonly SeedRow[]>>;
  /** The database's entity types' tables with their columns (`entityTableColumns`), which keys, links and rows may name. */
  entityTables?: ReadonlyMap<string, ReadonlySet<string>>;
};

export function validateAppSpec(
  value: unknown,
  schema: JsonSchema,
  { blueprints = CURATED_BLUEPRINTS, landed, entityTables = new Map() }: ValidateOptions = {},
): AppSpecValidation {
  const [ok, raw] = Errors(narrow(schema, schema, value) as never, value);
  if (!ok) {
    const seen = new Set<string>();
    const errors = (raw as unknown as RawError[])
      .flatMap((error) => toErrors(value, error))
      .filter((error) => {
        const key = `${error.path}\n${error.message}`;
        return !seen.has(key) && seen.add(key);
      });
    // A oneOf that failed with no other error still has to say something.
    if (errors.length > 0) return { ok: false, errors };
    return {
      ok: false,
      errors: [{ path: '(spec)', message: 'does not match the AppSpec schema' }],
    };
  }
  const spec = value as AppSpec;
  const model = specModel(spec, blueprints, entityTables);
  const errors = checkReferences(model, spec, landed);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, spec, model };
}

/** The errors as the agent reads them: one line per error. */
export function formatAppSpecErrors(errors: readonly AppSpecError[]): string {
  return errors.map((error) => `- ${error.path}: ${error.message}`).join('\n');
}
