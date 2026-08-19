import { z } from 'zod';

import type { DshJsonSchema } from './dsh-types';

/**
 * A neutral tool's zod parameters, as dsh's JSON Schema subset.
 *
 * dsh enforces a deliberately small schema vocabulary on every registered tool:
 * `type`, `properties`, `required`, `items`, `oneOf`, `enum`, `const`, a boolean
 * `additionalProperties`, and the annotations. A zod schema routinely produces
 * more than that — `format` from `.uuid()`, `minimum`, `minItems`, `anyOf` from
 * a union, an object-valued `additionalProperties` from a record, `$defs`/`$ref`
 * from a reused sub-schema — and dsh rejects a tool carrying any of them.
 *
 * So this narrows: unsupported *constraints* are dropped, and unsupported
 * *structure* throws. Dropping a constraint is safe here and only here, because
 * the schema dsh receives is a hint to the model, not the enforcement:
 * `toDshTool` parses the model's arguments with the tool's own zod schema
 * before the body runs, so every constraint this drops is still applied — by
 * the party that owns it. What cannot degrade is the shape a caller has to
 * satisfy, which is why a non-object root or an unresolvable `$ref` is an error
 * rather than an open schema.
 */

const CONSTRAINTS = new Set([
  'type',
  'properties',
  'required',
  'items',
  'oneOf',
  'enum',
  'const',
  'additionalProperties'
]);

const ANNOTATIONS = new Set(['description', 'title', 'default', 'examples']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** What a conversion dropped, so a caller can log it rather than wonder. */
export interface DshSchemaConversion {
  parameters: DshJsonSchema;
  /**
   * Keywords dropped from the model-facing schema, as JSON-pointer-ish paths
   * (`properties.rows.minItems`). Still enforced by zod at execute time.
   */
  dropped: string[];
}

function narrow(node: unknown, path: string, dropped: string[]): DshJsonSchema {
  if (!isRecord(node)) return {};

  if (typeof node.$ref === 'string') {
    throw new Error(
      `tool parameters use a JSON Schema $ref ("${node.$ref}") at ${path || 'the root'}; ` +
      'dsh reads no references, so the schema must be inlined'
    );
  }

  const out: Record<string, unknown> = {};
  const source = widenUnions(node, path, dropped);

  for (const [key, value] of Object.entries(source)) {
    const at = path === '' ? key : `${path}.${key}`;

    if (key === '$schema' || key === '$defs' || key === 'definitions') continue;
    if (ANNOTATIONS.has(key)) {
      out[key] = value;
      continue;
    }
    if (!CONSTRAINTS.has(key)) {
      dropped.push(at);
      continue;
    }

    switch (key) {
    case 'properties': {
      const properties: Record<string, DshJsonSchema> = {};
      for (const [name, sub] of Object.entries(isRecord(value) ? value : {})) {
        properties[name] = narrow(sub, `${at}.${name}`, dropped);
      }
      out.properties = properties;
      break;
    }
    case 'items':
      out.items = narrow(value, at, dropped);
      break;
    case 'oneOf':
      out.oneOf = (Array.isArray(value) ? value : []).map((sub, index) =>
        narrow(sub, `${at}[${index}]`, dropped)
      );
      break;
    case 'additionalProperties':
      // Only the boolean form exists in dsh's subset; a zod record's
      // object-valued form degrades to the open default.
      if (typeof value === 'boolean') out.additionalProperties = value;
      else dropped.push(at);
      break;
    default:
      out[key] = value;
    }
  }

  // `required` may not name a property the narrowed schema no longer declares.
  if (Array.isArray(out.required)) {
    const declared = new Set(Object.keys((out.properties as Record<string, unknown>) ?? {}));
    const kept = out.required.filter((name) => typeof name === 'string' && declared.has(name));
    if (kept.length === 0) delete out.required;
    else out.required = kept;
  }

  return out as DshJsonSchema;
}

/**
 * `anyOf` and a type array as dsh's `oneOf`, where that is sound.
 *
 * zod emits `anyOf` for a union and `type: ['string', 'null']` for a nullable;
 * dsh has neither, only `oneOf` — which validates *exactly one* branch. That is
 * the same thing as `anyOf` only when the branches are disjoint, which is true
 * of the shapes zod actually produces here (a nullable, a union of distinct
 * scalar types) and not true in general. So a disjoint union converts, and an
 * overlapping one degrades to unconstrained rather than becoming a schema that
 * rejects a legitimate argument.
 */
function widenUnions(
  node: Record<string, unknown>,
  path: string,
  dropped: string[]
): Record<string, unknown> {
  const rest = { ...node };
  let branches: unknown[] | undefined;

  if (Array.isArray(rest.anyOf)) {
    branches = rest.anyOf;
    delete rest.anyOf;
  } else if (Array.isArray(rest.type)) {
    branches = rest.type.map((type) => ({ type }));
    delete rest.type;
  }

  if (!branches || rest.oneOf !== undefined) return node;

  const types = branches.map((branch) =>
    isRecord(branch) && typeof branch.type === 'string' ? branch.type : undefined
  );
  const disjoint =
    branches.length >= 2 &&
    types.every((type) => type !== undefined) &&
    new Set(types).size === types.length;

  if (!disjoint) {
    dropped.push(path === '' ? 'anyOf' : `${path}.anyOf`);
    return rest;
  }

  return { ...rest, oneOf: branches };
}

/** Convert and report, for a host that wants to see what degraded. */
export function convertDshParameters(schema: z.ZodType): DshSchemaConversion {
  const dropped: string[] = [];
  // zod's own emitter, in input mode (what a *caller* must send) against
  // draft-7 — the dialect dsh's subset is carved out of.
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7', io: 'input' });
  const narrowed = narrow(jsonSchema, '', dropped);

  if (narrowed.type !== 'object') {
    throw new Error(
      `tool parameters must be an object schema; received ${String(narrowed.type ?? 'no type')}. ` +
      'dsh names every argument, so a tool cannot take a bare value or a top-level union'
    );
  }

  return {
    parameters: {
      type: 'object',
      properties: narrowed.properties ?? {},
      ...(narrowed.required ? { required: narrowed.required } : {}),
      ...(narrowed.description ? { description: narrowed.description } : {})
    },
    dropped
  };
}

/** The dsh-subset JSON Schema for a tool's parameters. */
export const toDshParameters = (schema: z.ZodType): DshJsonSchema =>
  convertDshParameters(schema).parameters;
