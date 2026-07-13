/**
 * Input type derivation for function binding mutations.
 *
 * Derives a protocol-agnostic field list from a function's payload metadata.
 * Priority:
 *   1. A JSON Schema on the binding config (`config.schema` or
 *      `config.payloadSchema`) — object properties become input fields.
 *   2. The definition's `payload_args` ([{name, type}]) — each declared arg
 *      becomes a nullable scalar field.
 *   3. Fallback: a single `payload: JSON` field.
 *
 * The derived shape is deliberately independent of graphql-js so it can be
 * reused for future REST payload validation. No runtime validation is
 * performed here — this is type derivation only.
 */

import type { FunctionBindingRow, JsonSchemaNode, PayloadArg } from './types';

/** Named scalar kinds the plugin knows how to resolve against the schema. */
export type DerivedScalar =
  | 'String'
  | 'Int'
  | 'Float'
  | 'Boolean'
  | 'UUID'
  | 'Datetime'
  | 'BigFloat'
  | 'JSON';

export interface DerivedField {
  name: string;
  scalar: DerivedScalar;
  required: boolean;
  list: boolean;
  description?: string;
  /** When set, the field is an enum of these string values. */
  enumValues?: string[];
}

export interface DerivedInput {
  /** 'schema' | 'payload-args' | 'fallback' */
  source: 'schema' | 'payload-args' | 'fallback';
  fields: DerivedField[];
}

/** Postgres payload_args type → GraphQL scalar name. */
const PG_TYPE_SCALARS: Record<string, DerivedScalar> = {
  uuid: 'UUID',
  text: 'String',
  int: 'Int',
  boolean: 'Boolean',
  numeric: 'BigFloat',
  jsonb: 'JSON',
  timestamptz: 'Datetime'
};

/** JSON Schema type → GraphQL scalar name. */
const JSON_SCHEMA_SCALARS: Record<string, DerivedScalar> = {
  string: 'String',
  integer: 'Int',
  number: 'Float',
  boolean: 'Boolean',
  object: 'JSON',
  null: 'JSON'
};

const FALLBACK_FIELD: DerivedField = {
  name: 'payload',
  scalar: 'JSON',
  required: false,
  list: false,
  description: 'Raw JSON payload passed to the function'
};

function schemaNodeType(node: JsonSchemaNode): string | undefined {
  if (Array.isArray(node.type)) {
    return node.type.find((t) => t !== 'null');
  }
  return node.type;
}

function deriveFromSchemaNode(
  name: string,
  node: JsonSchemaNode,
  required: boolean
): DerivedField {
  const base: DerivedField = {
    name,
    scalar: 'JSON',
    required,
    list: false,
    ...(node.description ? { description: node.description } : {})
  };

  const enumValues = node.enum?.filter(
    (v): v is string => typeof v === 'string'
  );
  if (enumValues && enumValues.length > 0 && enumValues.length === node.enum!.length) {
    return { ...base, scalar: 'String', enumValues };
  }

  const type = schemaNodeType(node);
  if (type === 'array') {
    const item = node.items
      ? deriveFromSchemaNode(name, node.items, false)
      : base;
    return { ...base, scalar: item.scalar, enumValues: item.enumValues, list: true };
  }

  const scalar = type ? JSON_SCHEMA_SCALARS[type] : undefined;
  return { ...base, scalar: scalar ?? 'JSON' };
}

function deriveFromJsonSchema(schema: JsonSchemaNode): DerivedField[] | null {
  if (schemaNodeType(schema) !== 'object' || !schema.properties) return null;
  const required = new Set(schema.required ?? []);
  const fields = Object.entries(schema.properties).map(([name, node]) =>
    deriveFromSchemaNode(name, node, required.has(name))
  );
  return fields.length > 0 ? fields : null;
}

function deriveFromPayloadArgs(args: PayloadArg[]): DerivedField[] | null {
  const fields: DerivedField[] = [];
  for (const arg of args) {
    if (!arg || typeof arg.name !== 'string' || arg.name.length === 0) {
      return null;
    }
    fields.push({
      name: arg.name,
      scalar: PG_TYPE_SCALARS[arg.type] ?? 'JSON',
      required: false,
      list: false
    });
  }
  return fields.length > 0 ? fields : null;
}

function bindingJsonSchema(binding: FunctionBindingRow): JsonSchemaNode | null {
  const config = binding.config;
  if (!config) return null;
  const candidate = config.schema ?? config.payloadSchema;
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    return candidate as JsonSchemaNode;
  }
  return null;
}

/**
 * Derive the input field list for a binding's mutation.
 */
export function deriveInputFields(binding: FunctionBindingRow): DerivedInput {
  const jsonSchema = bindingJsonSchema(binding);
  if (jsonSchema) {
    const fields = deriveFromJsonSchema(jsonSchema);
    if (fields) return { source: 'schema', fields };
  }

  if (Array.isArray(binding.payloadArgs) && binding.payloadArgs.length > 0) {
    const fields = deriveFromPayloadArgs(binding.payloadArgs);
    if (fields) return { source: 'payload-args', fields };
  }

  return { source: 'fallback', fields: [FALLBACK_FIELD] };
}

/**
 * Assemble the invocation payload jsonb from the mutation input values.
 * Fallback inputs pass `payload` through verbatim; typed inputs build an
 * object keyed by field name, omitting undefined values.
 */
export function buildInvocationPayload(
  derived: DerivedInput,
  input: Record<string, unknown>
): unknown {
  if (derived.source === 'fallback') {
    return input.payload ?? null;
  }
  const payload: Record<string, unknown> = {};
  for (const field of derived.fields) {
    const value = input[field.name];
    if (value !== undefined) {
      payload[field.name] = value;
    }
  }
  return payload;
}

/** Whether a binding's config enables GraphQL exposure (absent ⇒ enabled). */
export function isGraphqlEnabled(config: Record<string, unknown> | null): boolean {
  if (!config) return true;
  return config.graphql !== false;
}
