import { readFileSync } from 'fs';
import type { Inquirerer, Question, Validation } from 'inquirerer';
import { resolve as resolvePath } from 'path';
import { z } from 'zod';

import {
  CliError,
  type CliErrorInit,
  type CommandErrorCode,
  ExitCode,
  type FollowUpOptions,
  type InputSchema,
  isCliError,
  type JSONSchema,
  type JSONSchemaType,
  type NextStep,
  type NextWord,
  type StepOptions
} from './types';

type ScalarKind =
  | { kind: 'boolean' }
  | { kind: 'scalar'; type: 'string' | 'number' | 'integer' }
  | { kind: 'enum'; values: readonly unknown[] };

/** How a property is read from argv: a boolean switch, one scalar, a repeatable scalar, or JSON text / @path. */
export type FlagKind = ScalarKind | { kind: 'list'; item: ScalarKind } | { kind: 'json' };

export type FlagScope = 'layer' | 'global' | 'input';

export interface FlagDef {
  property: string;
  /** Canonical kebab-case spelling, without the leading dashes. */
  flag: string;
  /** The property's JSON Schema, as the layer shows it. */
  schema: JSONSchema;
  /** The property's own zod schema, which checks one value of it. */
  check: z.ZodType;
  kind: FlagKind;
  scope: FlagScope;
  secret: boolean;
  required: boolean;
}

export interface FlagTable {
  flags: FlagDef[];
  /** Every accepted spelling (kebab, snake, camel and the property name) to its flag. */
  lookup: Map<string, FlagDef>;
  /** The short forms of the layer's own flags (`-h`, `-y`) to their flag; each takes no value. */
  shorts: Map<string, FlagDef>;
}

/** `index` is the argv element of the flag; `valueIndex` is the element that holds its value (the same one for --x=v). */
export type Token =
  | { kind: 'flag'; def: FlagDef; value: string | boolean | undefined; index: number; valueIndex?: number }
  | { kind: 'unknown'; flag: string }
  | { kind: 'positional'; value: string; index: number }
  | { kind: 'separator'; index: number };

type RawValue = string | boolean | undefined;

/** The JSON Schema of a zod schema, as the layer reads and prints it. */
export function jsonSchemaOf(schema: z.ZodType, io: 'input' | 'output'): JSONSchema {
  const json = z.toJSONSchema(schema, { io, unrepresentable: 'any' }) as JSONSchema;
  delete json.$schema;
  return json;
}

export const LAYER_INPUT = z.object({
  json: z.boolean().optional().describe('Print one JSON envelope on stdout (same as --format json)'),
  format: z.enum(['text', 'json']).optional().describe('Output format; the default is text on a terminal, else json'),
  fields: z.string().optional().describe('Keep only these comma-separated paths of data, for example id,owner.name'),
  input: z.string().optional().describe('The whole input as JSON, @file.json, or - for stdin; flags override its keys'),
  dry_run: z.boolean().optional().describe('Show the plan of a change and change nothing'),
  yes: z.boolean().optional().meta({ description: 'Approve the plan of a change without a prompt', 'x-short': 'y' }),
  no_input: z.boolean().optional().describe('Never prompt; a missing value fails with missing-input'),
  tty: z.boolean().optional().describe('Pass false to never prompt (same as --no-input)'),
  schema: z.boolean().optional().describe('Print the input and output JSON Schema of the command'),
  llms: z.boolean().optional().describe('Print a Markdown command index for agents; with --json, the full manifest'),
  cwd: z.string().optional().meta({ description: 'Run as if started in this directory', 'x-carry': true }),
  version: z.boolean().optional().describe('Print the version'),
  help: z.boolean().optional().meta({ description: 'Show help', 'x-short': 'h' })
});

export const LAYER_FLAGS: JSONSchema = jsonSchemaOf(LAYER_INPUT, 'input');

export interface LayerFlags {
  /** Set only by --json or --format; the caller picks the default from the terminal. */
  format?: 'text' | 'json';
  fields?: string[];
  input?: string;
  dryRun: boolean;
  yes: boolean;
  noInput: boolean;
  tty: boolean;
  schema: boolean;
  llms: boolean;
  cwd?: string;
  version: boolean;
  help: boolean;
}

const builtByLayer = new WeakSet<object>();

/** An error whose text the layer wrote, so it never holds a secret and is never searched for one. */
export function layerError(init: CliErrorInit<CommandErrorCode>): CliError<CommandErrorCode> {
  const error = new CliError(init);
  builtByLayer.add(error);
  return error;
}

export const isLayerError = (error: unknown): error is CliError<CommandErrorCode> =>
  typeof error === 'object' && error !== null && builtByLayer.has(error);

export function usageError(code: CommandErrorCode, message: string, extra: Omit<CliErrorInit, 'code' | 'message' | 'exitCode'> = {}): CliError<CommandErrorCode> {
  return layerError({ code, message, exitCode: ExitCode.usage, ...extra });
}

function invalidInput(message: string, hint: string, flag: string, extra: Record<string, unknown> = {}): CliError {
  return usageError('invalid-input', message, { hint, details: { flag, ...extra } });
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The value of an own key only, so that `constructor`, `toString` and `__proto__` read as absent. */
export function own<T>(map: Record<string, T> | undefined, key: string): T | undefined {
  return map !== undefined && Object.hasOwn(map, key) ? map[key] : undefined;
}

export function orList(items: string[], conjunction = 'or'): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}

function words(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

export function kebabCase(name: string): string {
  return words(name).join('-');
}

function spellings(property: string): string[] {
  const parts = words(property);
  const camel = parts[0] + parts.slice(1).map((part) => part[0].toUpperCase() + part.slice(1)).join('');
  return [...new Set([parts.join('-'), parts.join('_'), camel, property])];
}

function primaryType(schema: JSONSchema): JSONSchemaType | undefined {
  return Array.isArray(schema.type) ? schema.type.find((type) => type !== 'null') : schema.type;
}

function scalarKind(schema: JSONSchema): ScalarKind | undefined {
  if (schema.enum) return { kind: 'enum', values: schema.enum };
  const type = primaryType(schema);
  switch (type) {
  case 'boolean':
    return { kind: 'boolean' };
  case 'string':
  case 'number':
  case 'integer':
    return { kind: 'scalar', type };
  default:
    return undefined;
  }
}

/** The scalar branch of `anyOf`/`oneOf` that holds one scalar schema and `null`. */
function nullableScalar(schema: JSONSchema): ScalarKind | undefined {
  const branches = schema.anyOf ?? schema.oneOf;
  if (!branches || branches.length !== 2) return undefined;
  const others = branches.filter((branch) => branch.type !== 'null');
  return others.length === 1 ? scalarKind(others[0]) : undefined;
}

/** A nullable scalar reads as the scalar; any schema with no usable type reads as JSON text or @path. */
export function flagKind(schema: JSONSchema): FlagKind {
  const scalar = scalarKind(schema) ?? nullableScalar(schema);
  if (scalar) return scalar;
  const item = primaryType(schema) === 'array' && schema.items ? scalarKind(schema.items) : undefined;
  return item ? { kind: 'list', item } : { kind: 'json' };
}

const SCOPE_NAMES: Record<FlagScope, string> = {
  layer: 'a flag the command layer owns',
  global: 'a global flag of the CLI',
  input: 'an input property'
};

/** One source of flags: a zod object and its JSON Schema as the layer shows it. */
export interface FlagSource {
  scope: FlagScope;
  schema?: InputSchema;
  json?: JSONSchema;
}

/** Throws a plain Error on a definition mistake: these are bugs in the CLI, not in the user's argv. */
export function buildFlagTable(owner: string, sources: FlagSource[]): FlagTable {
  const flags: FlagDef[] = [];
  const lookup = new Map<string, FlagDef>();
  const shorts = new Map<string, FlagDef>();
  for (const { scope, schema, json } of sources) {
    if (!schema) continue;
    if (primaryType(json) !== 'object') {
      throw new Error(`${owner}: the ${scope} schema must be a zod object, because each of its properties becomes a flag.`);
    }
    const required = new Set(json.required ?? []);
    for (const [property, propertySchema] of Object.entries(json.properties ?? {})) {
      if (words(property).length === 0) {
        throw new Error(`${owner}: the property "${property}" has no letters or digits to spell a flag with. Rename it.`);
      }
      const def: FlagDef = {
        property,
        flag: kebabCase(property),
        schema: propertySchema,
        check: schema.shape[property] as z.ZodType,
        kind: flagKind(propertySchema),
        scope,
        secret: isSecret(propertySchema),
        required: required.has(property)
      };
      for (const spelling of spellings(property)) {
        const taken = lookup.get(spelling);
        if (taken) {
          throw new Error(
            `${owner}: --${spelling} is a spelling of both "${taken.property}" (${SCOPE_NAMES[taken.scope]}) ` +
              `and "${property}" (${SCOPE_NAMES[scope]}). Rename one of them.`
          );
        }
        lookup.set(spelling, def);
      }
      const short = propertySchema['x-short'];
      if (short !== undefined) {
        if (scope !== 'layer') {
          throw new Error(
            `${owner}: the property "${property}" declares the short form -${short}, but short forms belong to the command layer ` +
              '(-h for --help, -y for --yes), so a command or a CLI global cannot declare one. Remove its x-short.'
          );
        }
        shorts.set(`-${short}`, def);
      }
      flags.push(def);
    }
  }
  return { flags, lookup, shorts };
}

const NEGATIVE_NUMBER = /^-\d/;

/** The flag a name (without dashes) spells: an exact spelling, or `no-` plus a boolean flag. */
function flagNamed(name: string, table: FlagTable): { def: FlagDef; negated: boolean } | undefined {
  const def = table.lookup.get(name);
  if (def) return { def, negated: false };
  const negated = name.startsWith('no-') ? table.lookup.get(name.slice(3)) : undefined;
  return negated?.kind.kind === 'boolean' ? { def: negated, negated: true } : undefined;
}

const isKnownFlag = (word: string, table: FlagTable): boolean =>
  word.startsWith('--') && flagNamed(word.slice(2).split('=')[0], table) !== undefined;

export function tokenize(argv: readonly string[], table: FlagTable): Token[] {
  const tokens: Token[] = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--') {
      tokens.push({ kind: 'separator', index });
      for (let rest = index + 1; rest < argv.length; rest++) {
        tokens.push({ kind: 'positional', value: argv[rest], index: rest });
      }
      break;
    }
    const short = table.shorts.get(arg);
    if (short) {
      tokens.push({ kind: 'flag', def: short, value: true, index });
      continue;
    }
    if (!arg.startsWith('--')) {
      const isFlag = arg.length > 1 && arg.startsWith('-') && !NEGATIVE_NUMBER.test(arg);
      tokens.push(isFlag ? { kind: 'unknown', flag: arg } : { kind: 'positional', value: arg, index });
      continue;
    }
    const equals = arg.indexOf('=');
    const name = equals === -1 ? arg.slice(2) : arg.slice(2, equals);
    const inline = equals === -1 ? undefined : arg.slice(equals + 1);
    const def = table.lookup.get(name);
    const next = argv[index + 1];
    const inlineIndex = inline === undefined ? undefined : index;
    if (def?.kind.kind === 'boolean') {
      // Only a literal true/false is a boolean's value, so `--yes tasks` keeps `tasks` as a positional.
      if (inline === undefined && (next === 'true' || next === 'false')) {
        tokens.push({ kind: 'flag', def, value: next, index, valueIndex: index + 1 });
        index++;
      } else {
        tokens.push({ kind: 'flag', def, value: inline ?? true, index, valueIndex: inlineIndex });
      }
    } else if (def) {
      // A secret may start with --, so after a secret flag only a known flag or the separator means "no value".
      const nextIsValue = next !== undefined && (!next.startsWith('--') || (def.secret && next !== '--' && !isKnownFlag(next, table)));
      if (inline === undefined && nextIsValue) {
        tokens.push({ kind: 'flag', def, value: next, index, valueIndex: index + 1 });
        index++;
      } else {
        tokens.push({ kind: 'flag', def, value: inline, index, valueIndex: inlineIndex });
      }
    } else {
      const negated = inline === undefined ? flagNamed(name, table) : undefined;
      tokens.push(negated ? { kind: 'flag', def: negated.def, value: false, index } : { kind: 'unknown', flag: `--${name}` });
    }
  }
  return tokens;
}

/** The format asked for by --json or --format, read leniently so that a usage error can still be printed in it. */
export function requestedFormat(tokens: Token[]): 'text' | 'json' | undefined {
  let format: 'text' | 'json' | undefined;
  for (const token of tokens) {
    if (token.kind !== 'flag' || token.def.scope !== 'layer') continue;
    if (token.def.property === 'json' && (token.value === true || token.value === 'true')) return 'json';
    if (token.def.property === 'format' && (token.value === 'text' || token.value === 'json')) format = token.value;
  }
  return format;
}

const shown = (secret: boolean, raw: string): string => (secret ? '' : `, got ${JSON.stringify(raw)}`);

const DECIMAL = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
const INTEGER_LITERAL = /^-?\d+$/;

/** `secret` says whether the raw value may be quoted back in an error. */
function coerceScalar(def: FlagDef, kind: ScalarKind, raw: string, label: string, secret: boolean): unknown {
  switch (kind.kind) {
  case 'boolean':
    if (raw === 'true' || raw === 'false') return raw === 'true';
    throw invalidInput(`${label} takes true or false${shown(secret, raw)}.`, `Pass ${label} alone for true, or --no-${def.flag} for false.`, label);
  case 'enum': {
    const index = kind.values.findIndex((value) => String(value) === raw);
    if (index !== -1) return kind.values[index];
    const near = secret ? [] : closest(raw, kind.values.map(String));
    throw invalidInput(
      `${label} must be one of ${kind.values.map(String).join(', ')}${shown(secret, raw)}.`,
      near.length ? `Did you mean ${orList(near.map((value) => `"${value}"`))}?` : 'Pass one of the listed values.',
      label
    );
  }
  case 'scalar': {
    if (kind.type === 'string') return raw;
    const value = Number(raw);
    const expected = kind.type === 'integer' ? 'an integer' : 'a number';
    if (!DECIMAL.test(raw) || !Number.isFinite(value) || (kind.type === 'integer' && !Number.isInteger(value))) {
      throw invalidInput(`${label} must be ${expected} in decimal notation${shown(secret, raw)}.`, `Pass ${label} as ${expected}, for example 42.`, label);
    }
    // Past 2^53 an integer silently changes value, so it is refused rather than rounded.
    if ((kind.type === 'integer' || INTEGER_LITERAL.test(raw)) && !Number.isSafeInteger(value)) {
      throw invalidInput(
        `${label} is outside the safe integer range of ±${Number.MAX_SAFE_INTEGER}${shown(secret, raw)}.`,
        'Pass a smaller value, or pass it as a string if the schema takes one.',
        label
      );
    }
    return value;
  }
  }
}

function readJsonText(raw: string, label: string, cwd: string): string {
  if (!raw.startsWith('@')) return raw;
  const file = resolvePath(cwd, raw.slice(1));
  try {
    return readFileSync(file, 'utf8');
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code ?? (error as Error).message;
    throw invalidInput(`${label} could not read ${file} (${reason}).`, `Check the path. A relative path is resolved from ${cwd}.`, label);
  }
}

function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    // The engine's message can quote the input, and the input may hold a secret, so only the position is kept.
    const position = /position (\d+)/.exec((error as Error).message)?.[1];
    throw invalidInput(
      `${label} is not valid JSON${position ? ` (the error is at character ${position})` : ''}.`,
      `Pass valid JSON, or a file with ${label} @file.json.`,
      label
    );
  }
}

/** Turns every raw value given for one flag into a value of its JSON type; zod checks it later. `label` names the flag. */
export function coerceFlag(def: FlagDef, raws: RawValue[], label: string, cwd: string): unknown {
  const { kind } = def;
  if (kind.kind !== 'list' && raws.length > 1) {
    throw invalidInput(`${label} was given ${raws.length} times, but it takes one value.`, `Pass ${label} once.`, label);
  }
  if (kind.kind === 'boolean') {
    const [raw] = raws;
    return typeof raw === 'boolean' ? raw : coerceScalar(def, kind, raw, label, def.secret);
  }
  if (raws.some((raw) => typeof raw !== 'string')) {
    throw invalidInput(`${label} needs a value.`, `Pass it as ${label} <value> or ${label}=<value>.`, label);
  }
  const values = raws as string[];
  switch (kind.kind) {
  case 'scalar':
  case 'enum':
    return coerceScalar(def, kind, values[0], label, def.secret);
  case 'list': {
    const secret = def.secret || isSecret(def.schema.items);
    return values.flatMap((raw) => {
      if (!raw.trimStart().startsWith('[')) return [coerceScalar(def, kind.item, raw, label, secret)];
      const parsed = parseJson(raw, label);
      if (!Array.isArray(parsed)) throw invalidInput(`${label} is not valid: a JSON value of it must be an array.`, `Pass ${label} once per item, or one JSON array.`, label);
      return parsed;
    });
  }
  case 'json':
    return parseJson(readJsonText(values[0], label, cwd), label);
  }
}

/** `lenient` skips a flag whose value does not read, for a passthrough command that owns its arguments. */
export function readScope(tokens: Token[], scope: FlagScope, cwd: string, lenient = false): Record<string, unknown> {
  const grouped = new Map<FlagDef, RawValue[]>();
  for (const token of tokens) {
    if (token.kind !== 'flag' || token.def.scope !== scope) continue;
    grouped.set(token.def, [...(grouped.get(token.def) ?? []), token.value]);
  }
  const values: Record<string, unknown> = {};
  for (const [def, raws] of grouped) {
    try {
      values[def.property] = coerceFlag(def, raws, `--${def.flag}`, cwd);
    } catch (error) {
      if (!lenient || !isCliError(error)) throw error;
    }
  }
  return values;
}

export function readLayerFlags(tokens: Token[], cwd: string, lenient = false): LayerFlags {
  const values = readScope(tokens, 'layer', cwd, lenient);
  return {
    format: values.json === true ? 'json' : (values.format as 'text' | 'json' | undefined),
    fields: typeof values.fields === 'string'
      ? values.fields.split(',').map((field) => field.trim()).filter(Boolean)
      : undefined,
    input: values.input as string | undefined,
    dryRun: values.dry_run === true,
    yes: values.yes === true,
    noInput: values.no_input === true,
    tty: values.tty !== false,
    schema: values.schema === true,
    llms: values.llms === true,
    cwd: values.cwd as string | undefined,
    version: values.version === true,
    help: values.help === true
  };
}

/** Whether the schema takes `null`: a "null" type, a null const or enum member, a union branch that does, or no type. */
function acceptsNull(schema: JSONSchema | undefined): boolean {
  if (!isPlainObject(schema)) return true;
  if (schema.const !== undefined) return schema.const === null;
  if (schema.enum) return schema.enum.includes(null);
  const branches = schema.anyOf ?? schema.oneOf;
  if (branches) return branches.some(acceptsNull);
  if (schema.allOf) return schema.allOf.every(acceptsNull);
  if (schema.type === undefined) return true;
  return Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null';
}

/**
 * The one null rule of the layer: a null means "not given" for an optional key whose schema does not take null.
 * Hosts with strict function calling and template-built input send every optional key, as null when it is not
 * given. A required key, or one whose schema takes null, keeps its null, and zod judges it.
 */
const isAbsentNull = (value: unknown, schema: JSONSchema | undefined, required: boolean): boolean =>
  value === null && !required && schema !== undefined && !acceptsNull(schema);

/** `value` with each null that means "not given" removed, in nested objects and list items. */
function withoutAbsentNulls(value: unknown, schema: JSONSchema | undefined): unknown {
  if (!isPlainObject(schema)) return value;
  if (Array.isArray(value)) return schema.items ? value.map((item) => withoutAbsentNulls(item, schema.items)) : value;
  if (!isPlainObject(value)) return value;
  const required = new Set(schema.required ?? []);
  const additional = typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined;
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]): Array<[string, unknown]> => {
    const child = own(schema.properties, key) ?? additional;
    return isAbsentNull(item, child, required.has(key)) ? [] : [[key, withoutAbsentNulls(item, child)]];
  }));
}

const pathText = (path: readonly PropertyKey[]): string =>
  path.reduce<string>((text, key) => (typeof key === 'number' ? `${text}[${key}]` : text ? `${text}.${String(key)}` : String(key)), '');

/** The JSON Schema at `path` under `schema`, through properties, items and additionalProperties, and whether a node on the way is secret. */
function schemaAt(schema: JSONSchema | undefined, path: readonly PropertyKey[]): { node: JSONSchema | undefined; secret: boolean } {
  let node = schema;
  let secret = isSecret(node);
  for (const key of path) {
    if (!isPlainObject(node)) return { node: undefined, secret };
    const additional = typeof node.additionalProperties === 'object' ? node.additionalProperties : undefined;
    node = typeof key === 'number' ? node.items : own(node.properties, String(key)) ?? additional;
    secret ||= isSecret(node);
  }
  return { node, secret };
}

function valueAt(value: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>((at, key) => (isPlainObject(at) || Array.isArray(at) ? (at as Record<PropertyKey, unknown>)[key] : undefined), value);
}

/** At most this many allowed keys are listed in a hint; a longer list is left to --schema. */
const MAX_LISTED_KEYS = 10;

function keyHint(key: string, allowed: string[], at: string): string | undefined {
  const near = closest(key, allowed);
  const parts = near.length ? [`Did you mean ${orList(near.map((name) => `"${name}"`))}?`] : [];
  if (allowed.length && allowed.length <= MAX_LISTED_KEYS) parts.push(`The keys allowed ${at ? `at ${at}` : 'here'} are ${allowed.join(', ')}.`);
  return parts.length ? parts.join(' ') : undefined;
}

/** What is wrong with a value, and, when the layer can tell, what to pass in its place. */
interface Problem {
  /** Where under the value it names, as text. */
  at: string;
  message: string;
  hint?: string;
}

/**
 * A zod issue in words: where (`display` writes a path as the reader names it), what, and the nearest allowed key or
 * enum value when one is close. It never quotes the value, and inside a secret node it names no key and no value at all.
 */
function problemOf(issue: z.core.$ZodIssue, value: unknown, schema: JSONSchema, display: (path: readonly PropertyKey[]) => string): Problem {
  const at = display(issue.path);
  const { node, secret } = schemaAt(schema, issue.path);
  if (secret) return { at, message: 'a value under it does not match its schema' };
  switch (issue.code) {
  case 'unrecognized_keys': {
    const [key] = issue.keys;
    return { at, message: `the key "${key}" is not allowed`, hint: keyHint(key, Object.keys(node?.properties ?? {}), at) };
  }
  case 'invalid_type':
    if (valueAt(value, issue.path) === undefined) {
      return { at: display(issue.path.slice(0, -1)), message: `the required key "${String(issue.path[issue.path.length - 1])}" is missing` };
    }
    return { at, message: `expected ${issue.expected}` };
  case 'invalid_value': {
    const given = valueAt(value, issue.path);
    const near = typeof given === 'string' ? closest(given, issue.values.filter((member): member is string => typeof member === 'string')) : [];
    return {
      at,
      message: `expected one of ${issue.values.map((member) => JSON.stringify(member)).join(', ')}`,
      hint: near.length ? `Did you mean ${orList(near.map((member) => `"${member}"`))}?` : undefined
    };
  }
  default:
    return { at, message: issue.message.replace(/\.$/, '').replace(/^\w/, (first) => first.toLowerCase()) };
  }
}

/** Where a value of the input came from, as an error names it: `--input`, a flag, or an argument. */
export type InputLabels = Map<string, string>;

/**
 * The input after the one null rule, parsed by the command's zod schema. A failure is `invalid-input`: it names the
 * flag (or --input, or the argument) of the first bad value and where in it, lists every issue in `details.issues`,
 * and never quotes a value.
 */
export function parseInput(schema: InputSchema, json: JSONSchema, values: Record<string, unknown>, labels: InputLabels, schemaHint: string): Record<string, unknown> {
  const given = withoutAbsentNulls(values, json) as Record<string, unknown>;
  const parsed = schema.safeParse(given);
  if (parsed.success) return parsed.data;
  const issues = parsed.error.issues.map((issue) => {
    const property = typeof issue.path[0] === 'string' ? issue.path[0] : undefined;
    const label = property ? labels.get(property) ?? `--${kebabCase(property)}` : '--input';
    // A value given in --input is named from the top of the input, one given in a flag from the top of the flag.
    const display = label === '--input' ? pathText : (path: readonly PropertyKey[]) => pathText(path.slice(1));
    const { at, message, hint } = problemOf(issue, given, json, display);
    return { label, at, message, hint };
  });
  const [first] = issues;
  throw invalidInput(
    `${first.label} is not valid: ${first.at ? `at ${first.at}, ` : ''}${first.message}.`,
    first.hint ?? schemaHint,
    first.label,
    { issues: issues.map(({ label, at, message }) => ({ flag: label, ...(at ? { path: at } : {}), message })) }
  );
}

/** The value of one flag, checked by its own zod schema; the error that names it, or undefined when it fits. */
function checkOne(def: FlagDef, value: unknown): string | undefined {
  const given = withoutAbsentNulls(value, def.schema);
  const parsed = def.check.safeParse(given);
  if (parsed.success) return undefined;
  const problem = problemOf(parsed.error.issues[0], given, def.schema, pathText);
  return `--${def.flag} is not valid: ${problem.at ? `at ${problem.at}, ` : ''}${problem.message}.`;
}

export interface InputRequest {
  table: FlagTable;
  positionals: readonly string[];
  tokens: Token[];
  /** The value of --input. */
  input?: string;
  cwd: string;
  /** What the input is for: its usage text, its command path, and the run's step builder. */
  scope: Scope;
  readStdin(): Promise<string>;
}

async function readInputObject(request: InputRequest, labels: InputLabels): Promise<Record<string, unknown>> {
  const label = '--input';
  const schemaHint = `Run "${request.scope.usage} --schema" to see the input properties.`;
  const fromStdin = request.input === '-';
  const text = fromStdin ? await request.readStdin() : readJsonText(request.input, label, request.cwd);
  if (fromStdin && text.trim() === '') {
    throw invalidInput('--input - read nothing from stdin.', 'Pipe a JSON object into the command, or pass the JSON inline with --input \'{...}\'.', label);
  }
  const parsed = parseJson(text, label);
  if (!isPlainObject(parsed)) {
    throw invalidInput('--input must be a JSON object.', `Pass an object whose keys are the input properties. ${schemaHint}`, label);
  }
  const inputProperties = request.table.flags.filter((def) => def.scope === 'input').map((def) => def.property);
  const values: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(parsed)) {
    const def = request.table.lookup.get(key);
    if (!def || def.scope !== 'input') {
      const suggestions = closest(key, inputProperties).map((property) => `"${property}"`);
      throw invalidInput(`--input has the unknown key "${key}".`, suggestions.length ? `Did you mean ${orList(suggestions)}?` : schemaHint, label);
    }
    if (Object.hasOwn(values, def.property)) {
      throw invalidInput(`--input sets "${def.property}" twice, with two spellings of the key.`, 'Keep one of the keys.', label);
    }
    values[def.property] = raw;
    labels.set(def.property, label);
  }
  return values;
}

/** The flag of the argument at `index`: its positional's, or the last one's when that one is a list, which takes the rest. */
export function positionalAt(names: readonly string[], table: FlagTable, index: number): FlagDef | undefined {
  if (index < names.length) return table.lookup.get(names[index]);
  const last = names.length ? table.lookup.get(names[names.length - 1]) : undefined;
  return last?.kind.kind === 'list' ? last : undefined;
}

/**
 * Merges --input, positionals and flags (in rising priority) into the raw input, with the label of each value, and
 * the required flags still missing. Schema defaults are zod's to fill, when it parses the input.
 */
export async function readInput(request: InputRequest): Promise<{ values: Record<string, unknown>; labels: InputLabels; missing: FlagDef[] }> {
  const { table, tokens, cwd, positionals: names } = request;
  const labels: InputLabels = new Map();
  const values = request.input === undefined ? {} : await readInputObject(request, labels);
  const given = readScope(tokens, 'input', cwd);
  for (const property of Object.keys(given)) labels.set(property, `--${table.lookup.get(property).flag}`);
  const positionals = tokens.filter((token): token is Extract<Token, { kind: 'positional' }> => token.kind === 'positional');
  const extra = positionals.find((_token, index) => !positionalAt(names, table, index));
  if (extra) {
    const takes = names.length === 0 ? 'no arguments' : `${names.length} argument${names.length === 1 ? '' : 's'} (${names.join(', ')})`;
    const { usage, path, step } = request.scope;
    throw usageError('unexpected-argument', `"${usage}" takes ${takes}, but got the extra argument "${extra.value}".`, {
      hint: `Pass other values as flags. Run "${usage} --help" to list them.`,
      next: [step([...path, '--help'], 'List the arguments and flags')]
    });
  }
  const raws = new Map<FlagDef, string[]>();
  positionals.forEach((token, index) => {
    const def = positionalAt(names, table, index);
    raws.set(def, [...(raws.get(def) ?? []), token.value]);
  });
  for (const [def, values] of raws) {
    if (Object.hasOwn(given, def.property)) {
      throw invalidInput(`"${def.property}" was given twice: as argument ${names.indexOf(def.property) + 1} and as --${def.flag}.`, 'Give it once.', `--${def.flag}`);
    }
    given[def.property] = coerceFlag(def, values, `<${def.flag}>`, cwd);
    labels.set(def.property, `<${def.flag}>`);
  }
  Object.assign(values, given);
  const missing = table.flags.filter((def) => def.scope === 'input' && def.required && own(values, def.property) === undefined);
  return { values, labels, missing };
}

export const REDACTED = '***';
const MIN_SEARCH_LENGTH = 8;
const SHELL_SAFE = /^[\w@%+=:,./-]+$/;

// A leading = is quoted too: zsh (the macOS default shell) expands `=name` to the path of a command `name`.
export const shellQuote = (word: string): string =>
  SHELL_SAFE.test(word) && !word.startsWith('=') ? word : `'${word.replace(/'/g, `'\\''`)}'`;

/** The CLI name and the words, each shell-quoted where needed, so that a POSIX shell reads every word as one. */
export const quoteCommand = (cliName: string, words: readonly string[]): string => [cliName, ...words].map(shellQuote).join(' ');

const wordText = (word: NextWord): string => (typeof word === 'string' ? word : `<${word.placeholder}>`);

/** A next step: `argv` is exact, `command` is quoted for POSIX shells, and a placeholder stays bare in both. */
export function nextStep(cliName: string, words: readonly NextWord[], why: string): NextStep {
  const argv = [cliName, ...words.map(wordText)];
  const command = [shellQuote(cliName), ...words.map((word) => (typeof word === 'string' ? shellQuote(word) : wordText(word)))].join(' ');
  const placeholders = [...new Set(words.filter((word) => typeof word !== 'string').map(wordText))];
  return placeholders.length ? { command, argv, placeholders, why } : { command, argv, why };
}

function containsSecret(schema: JSONSchema | undefined): boolean {
  if (!isPlainObject(schema)) return false;
  if (schema['x-secret'] === true) return true;
  const additional = typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined;
  const children = [...Object.values(schema.properties ?? {}), schema.items, additional, ...(schema.anyOf ?? []), ...(schema.oneOf ?? []), ...(schema.allOf ?? [])];
  return children.some(containsSecret);
}

/** A node is secret when it is marked, or when it is a union with a secret in any branch (the branch a value took is unknown). */
export function isSecret(schema: JSONSchema | undefined): boolean {
  if (!isPlainObject(schema)) return false;
  return schema['x-secret'] === true || [schema.anyOf, schema.oneOf, schema.allOf].some((branches) => branches?.some(containsSecret) ?? false);
}

function collectLeaves(value: unknown, into: string[]): void {
  if (typeof value === 'string') into.push(value);
  else if (typeof value === 'number') into.push(String(value));
  else if (Array.isArray(value)) value.forEach((item) => collectLeaves(item, into));
  else if (isPlainObject(value)) Object.values(value).forEach((item) => collectLeaves(item, into));
}

export interface SplitSecrets {
  /** The value with every x-secret node replaced by ***. */
  redacted: unknown;
  /** Every string and number under an x-secret node. */
  secrets: string[];
  found: boolean;
}

/** The one walk of a value with its schema that decides what is secret. Nothing else adds to `secrets`. */
export function splitSecrets(value: unknown, schema: JSONSchema | undefined): SplitSecrets {
  const secrets: string[] = [];
  let found = false;
  const walk = (node: unknown, nodeSchema: JSONSchema | undefined): unknown => {
    if (node === undefined || !nodeSchema) return node;
    if (isSecret(nodeSchema)) {
      found = true;
      collectLeaves(node, secrets);
      return REDACTED;
    }
    if (Array.isArray(node)) return node.map((item) => walk(item, nodeSchema.items));
    if (!isPlainObject(node)) return node;
    const additional = typeof nodeSchema.additionalProperties === 'object' ? nodeSchema.additionalProperties : undefined;
    return Object.fromEntries(Object.entries(node).map(([key, item]) => [key, walk(item, own(nodeSchema.properties, key) ?? additional)]));
  };
  const redacted = walk(value, schema);
  return { redacted, secrets, found };
}

/**
 * Patterns for text the layer did not write, such as a message a command throws: each secret of 8 or more
 * characters, raw, JSON-escaped and shell-quoted, longest first. A shorter secret would match ordinary words.
 */
export function searchPatterns(secrets: string[]): string[] {
  const patterns = new Set<string>();
  for (const secret of secrets) {
    if (secret.length < MIN_SEARCH_LENGTH) continue;
    patterns.add(secret);
    patterns.add(JSON.stringify(secret).slice(1, -1));
    patterns.add(shellQuote(secret));
  }
  return [...patterns].sort((a, b) => b.length - a.length);
}

export const redactText = (text: string, patterns: string[]): string =>
  patterns.reduce((result, pattern) => result.split(pattern).join(REDACTED), text);

/** JSON text with its secret nodes as ***; text that does not parse is *** whole when the schema holds a secret. */
function redactJsonText(text: string, schema: JSONSchema | undefined): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return containsSecret(schema) ? REDACTED : text;
  }
  const split = splitSecrets(parsed, schema);
  return split.found ? JSON.stringify(split.redacted) : text;
}

/** One argv word that holds a value of `def`, with its secrets replaced where they sit. */
function redactWord(word: string, def: FlagDef): string {
  if (def.secret) return REDACTED;
  switch (def.kind.kind) {
  case 'list':
    if (word.trimStart().startsWith('[')) return redactJsonText(word, def.schema);
    return isSecret(def.schema.items) ? REDACTED : word;
  case 'json':
    return word.startsWith('@') ? word : redactJsonText(word, def.schema);
  default:
    return word;
  }
}

/** Builds a next step of one run: the CLI name, the run's carried flags but those named in `drop`, then `words`. */
export type StepBuilder = (words: readonly NextWord[], why: string, options?: StepOptions) => NextStep;

/** What a usage error or a hint is about: the text a person typed for it, its command path, and the run's steps. */
export interface Scope {
  usage: string;
  path: string[];
  step: StepBuilder;
}

const isCarried = (def: FlagDef): boolean => def.scope !== 'input' && def.schema['x-carry'] === true;

/**
 * The step builder of one run. It repeats each flag of the run marked x-carry right after the CLI name, in argv
 * order, as typed, with a secret value as a placeholder named after its flag; a step leaves out the carried flags
 * named in `drop`. `table` is the one the run was parsed with, and `argvIndex` maps a token index back to argv.
 */
export function stepBuilder(
  cliName: string,
  argv: readonly string[],
  tokens: Token[],
  argvIndex: (tokenIndex: number) => number,
  table: FlagTable
): StepBuilder {
  const given = tokens.flatMap((token): Array<{ def: FlagDef; words: NextWord[] }> => {
    if (token.kind !== 'flag' || !isCarried(token.def)) return [];
    const at = argvIndex(token.index);
    const valueAt = token.valueIndex === undefined ? undefined : argvIndex(token.valueIndex);
    const secret = typeof token.value === 'string' && redactWord(token.value, token.def) !== token.value;
    const placeholder = { placeholder: token.def.flag };
    if (valueAt === undefined) return [{ def: token.def, words: [argv[at]] }];
    if (valueAt === at) return [{ def: token.def, words: secret ? [argv[at].slice(0, argv[at].indexOf('=')), placeholder] : [argv[at]] }];
    return [{ def: token.def, words: [argv[at], secret ? placeholder : argv[valueAt]] }];
  });
  // A one-value flag given twice failed this run; repeating both values would fail the step too, and keeping one
  // would choose for the person. The step names the flag once, with a placeholder for the value they choose.
  const count = (def: FlagDef): number => given.filter((flag) => flag.def === def).length;
  const carried = given.flatMap((flag, index) => {
    if (flag.def.kind.kind === 'list' || count(flag.def) === 1) return [flag];
    if (given.findIndex((other) => other.def === flag.def) !== index) return [];
    return [{ def: flag.def, words: [flagName(flag.def.property), { placeholder: flag.def.flag }] }];
  });
  return (words, why, { drop = [] } = {}) => {
    const dropped = new Set(drop.map((spelling) => {
      const named = flagNamed(spelling.replace(/^--/, ''), table);
      if (!named || !isCarried(named.def)) {
        throw new Error(`A next step cannot drop ${spelling}, because it is not a carried global flag of ${cliName}. Name a global flag marked x-carry, for example --cwd.`);
      }
      return named.def;
    }));
    return nextStep(cliName, [...carried.filter(({ def }) => !dropped.has(def)).flatMap((flag) => flag.words), ...words], why);
  };
}

export interface CommandLine {
  invocation: string;
  followUp(flags: string[], options: FollowUpOptions): NextStep;
}

/**
 * The command line as given, secrets as *** and words shell-quoted where needed, plus next steps built from it.
 * `tokens` come from the argv without the command path, whose argv indexes are `path`; `argvIndex` maps a token
 * index back to argv. `input` is the command's input JSON Schema, for the secrets of --input.
 */
export function commandLine(
  cliName: string,
  usage: string,
  argv: readonly string[],
  path: readonly number[],
  argvIndex: (tokenIndex: number) => number,
  tokens: Token[],
  positionals: readonly string[],
  input: JSONSchema | undefined,
  table: FlagTable
): CommandLine {
  const words = [...argv];
  const flagWords: Array<{ def: FlagDef; at: number[] }> = [];
  // A redacted word, by argv index: the placeholder a follow-up shows, and the flag spelling of an inline `--x=v`.
  const secrets = new Map<number, { placeholder: string; inlineFlag?: string }>();
  let separator: number | undefined;
  let slot = 0;
  for (const token of tokens) {
    if (token.kind === 'separator') {
      separator = argvIndex(token.index);
    } else if (token.kind === 'positional') {
      const def = positionalAt(positionals, table, slot++);
      const at = argvIndex(token.index);
      if (!def) continue;
      const value = redactWord(token.value, def);
      if (value === token.value) continue;
      words[at] = value;
      secrets.set(at, { placeholder: def.flag });
    } else if (token.kind === 'flag') {
      const at = argvIndex(token.index);
      const valueAt = token.valueIndex === undefined ? undefined : argvIndex(token.valueIndex);
      flagWords.push({ def: token.def, at: valueAt === undefined || valueAt === at ? [at] : [at, valueAt] });
      if (valueAt === undefined || typeof token.value !== 'string') continue;
      const isInput = token.def.scope === 'layer' && token.def.property === 'input';
      const keep = isInput && (token.value === '-' || token.value.startsWith('@'));
      const value = keep ? token.value : isInput ? redactJsonText(token.value, input) : redactWord(token.value, token.def);
      if (value === token.value) continue;
      const inline = valueAt === at;
      const flagText = inline ? words[at].slice(0, words[at].indexOf('=')) : undefined;
      words[valueAt] = inline ? `${flagText}=${value}` : value;
      secrets.set(valueAt, { placeholder: token.def.flag, inlineFlag: flagText });
    }
  }
  // One argv word as a next step shows it: a redacted secret is a placeholder, and an inline `--x=secret` two words.
  const stepWords = (index: number): NextWord[] => {
    const secret = secrets.get(index);
    if (!secret) return [words[index]];
    return secret.inlineFlag ? [secret.inlineFlag, { placeholder: secret.placeholder }] : [{ placeholder: secret.placeholder }];
  };
  return {
    invocation: quoteCommand(cliName, words),
    followUp(flags, { why, drop = [], command: newPath }) {
      const dropped = new Set(drop.map((spelling) => {
        const named = flagNamed(spelling.replace(/^--/, ''), table);
        if (!named) throw new Error(`followUp cannot drop ${spelling}, because it is not a flag of "${usage}". Name a flag the command accepts.`);
        return named.def;
      }));
      const removed = new Set(flagWords.filter(({ def }) => dropped.has(def)).flatMap(({ at }) => at));
      const end = separator ?? words.length;
      const out: NextWord[] = [];
      for (let index = 0; index <= words.length; index++) {
        if (index === end) out.push(...flags);
        if (index === words.length || removed.has(index)) continue;
        if (path.includes(index)) {
          if (newPath === undefined) out.push(words[index]);
          else if (index === path[0]) out.push(...newPath.split(' '));
          continue;
        }
        out.push(...stepWords(index));
      }
      return nextStep(cliName, out, why);
    }
  };
}

/** The flag a person types for an input property, for example `--table-name` for `table_name`. */
export const flagName = (property: string): string => `--${kebabCase(property)}`;

const isPlaceholder = (value: unknown): value is { placeholder: string } =>
  isPlainObject(value) && Object.keys(value).length === 1 && typeof value.placeholder === 'string';

/** The one word that carries `value` for `def`, as a positional or after its flag; undefined when no word can. */
function valueWord(def: FlagDef, value: unknown): string | undefined {
  if (value === null && def.kind.kind !== 'json') return undefined;
  switch (def.kind.kind) {
  case 'boolean':
  case 'scalar':
  case 'enum':
    return String(value);
  case 'list':
  case 'json':
    return JSON.stringify(value);
  }
}

/** A word that the tokenizer reads as a positional, not as a flag. */
const standsAlone = (word: string): boolean => !(word.startsWith('-') && word !== '-' && !NEGATIVE_NUMBER.test(word));

/** A flag and its value; a value that starts with -- is written inline, or the tokenizer would read it as a flag. */
const flagWordsOf = (def: FlagDef, word: string): string[] =>
  word.startsWith('--') ? [`${flagName(def.property)}=${word}`] : [flagName(def.property), word];

/**
 * The words after a command path that make the parser read `input` back: positionals as bare words in their
 * declared order while each can stand alone, then flags in the order of `input`. A list is repeated flags unless an
 * item would read as JSON (or it is empty), and then one JSON word. A value that no flag can carry (null for a
 * scalar flag) goes into one --input word, which the parser reads before the flags. A secret or a
 * `{ placeholder }` value becomes a placeholder word. Throws for a key or a value the command's schema refuses.
 */
export function inputWords(positionals: readonly string[], table: FlagTable, input: Record<string, unknown>, usage: string): NextWord[] {
  const inputs = table.flags.filter((def) => def.scope === 'input');
  const entries: Array<[string, unknown]> = [];
  const defs = new Map<string, FlagDef>();
  for (const [key, raw] of Object.entries(input)) {
    if (raw === undefined) continue;
    const def = inputs.find((candidate) => candidate.property === key);
    if (!def) {
      throw new Error(`nextFor cannot pass "${key}" to "${usage}", because its input schema has no such property. Known properties: ${inputs.map((known) => known.property).join(', ') || 'none'}.`);
    }
    if (isPlaceholder(raw)) {
      defs.set(key, def);
      entries.push([key, raw]);
      continue;
    }
    if (isAbsentNull(raw, def.schema, def.required)) continue;
    const value = withoutAbsentNulls(raw, def.schema);
    const problem = def.secret ? undefined : checkOne(def, value);
    if (problem) throw new Error(`nextFor cannot pass the input to "${usage}": ${problem}`);
    defs.set(key, def);
    entries.push([key, value]);
  }
  const placeholderFor = (def: FlagDef, value: unknown): NextWord | undefined => {
    if (isPlaceholder(value)) return value;
    if (def.secret || ((def.kind.kind === 'json' || def.kind.kind === 'list') && splitSecrets(value, def.schema).found)) {
      return { placeholder: def.flag };
    }
    return undefined;
  };

  const words: NextWord[] = [];
  const asPositional = new Set<string>();
  for (const name of positionals) {
    if (!defs.has(name)) break;
    const value = entries.find(([key]) => key === name)[1];
    const placeholder = placeholderFor(defs.get(name), value);
    const word = placeholder ? undefined : valueWord(defs.get(name), value);
    if (!placeholder && (word === undefined || !standsAlone(word))) break;
    words.push(placeholder ?? word);
    asPositional.add(name);
  }

  const inputOnly: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (asPositional.has(key)) continue;
    const def = defs.get(key);
    const placeholder = placeholderFor(def, value);
    if (placeholder) {
      words.push(flagName(def.property), placeholder);
    } else if (value === null && def.kind.kind !== 'json') {
      inputOnly[key] = value;
    } else if (def.kind.kind === 'boolean') {
      words.push(value ? flagName(def.property) : `--no-${def.flag}`);
    } else if (def.kind.kind === 'list') {
      const items = value as unknown[];
      const repeated = items.length > 0 && items.every((item) => !String(item).trimStart().startsWith('['));
      words.push(...(repeated ? items.flatMap((item) => flagWordsOf(def, String(item))) : flagWordsOf(def, JSON.stringify(items))));
    } else {
      words.push(...flagWordsOf(def, valueWord(def, value)));
    }
  }
  if (Object.keys(inputOnly).length) words.push('--input', JSON.stringify(inputOnly));
  return words;
}

function questionFor(def: FlagDef, cwd: string): Question {
  const base = { name: def.property, message: def.schema.description ?? def.property, required: true };
  switch (def.kind.kind) {
  case 'enum':
    return { ...base, type: 'list', options: def.kind.values.map((value) => ({ name: String(value), value })) };
  case 'boolean':
    return { ...base, type: 'confirm' };
  default: {
    const validate = (answer: unknown): Validation => {
      if (answer === null || answer === undefined) return { success: true };
      try {
        const problem = checkOne(def, typeof answer === 'string' ? coerceFlag(def, [answer], `--${def.flag}`, cwd) : answer);
        return problem ? { success: false, reason: problem } : { success: true };
      } catch (error) {
        return { success: false, reason: (error as Error).message };
      }
    };
    return def.secret ? { ...base, type: 'password', validate } : { ...base, type: 'text', validate };
  }
  }
}

/** Prompts for each missing value with a prompt built from its schema, and types the answers like flags. */
export async function askFor(missing: FlagDef[], prompter: Inquirerer, cwd: string): Promise<Record<string, unknown>> {
  const answers = await prompter.prompt<Record<string, unknown>>({}, missing.map((def) => questionFor(def, cwd)));
  const values: Record<string, unknown> = {};
  for (const def of missing) {
    const answer = own(answers, def.property);
    values[def.property] = typeof answer === 'string' ? coerceFlag(def, [answer], `--${def.flag}`, cwd) : answer;
  }
  return values;
}

/** Optimal string alignment distance: inserts, deletes, substitutions, and swaps of two neighbouring characters. */
function editDistance(left: string, right: string): number {
  const rows = Array.from({ length: left.length + 1 }, (_, i) => Array.from({ length: right.length + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[left.length][right.length];
}

/**
 * The one rule for a suggestion (a flag, a command, a key, an enum value): the edit distance from what was typed,
 * when it is at most one edit for every four characters typed, so `foo` allows one edit and `permisive` two.
 */
export function nearness(typed: string, candidate: string): number | undefined {
  const distance = editDistance(typed, candidate);
  return distance <= Math.floor((typed.length + 1) / 4) ? distance : undefined;
}

export function closest(input: string, candidates: string[]): string[] {
  return candidates
    .map((candidate) => ({ candidate, distance: nearness(input, candidate) }))
    .filter(({ distance }) => distance !== undefined)
    .sort((a, b) => a.distance - b.distance || a.candidate.localeCompare(b.candidate))
    .slice(0, 3)
    .map(({ candidate }) => candidate);
}
