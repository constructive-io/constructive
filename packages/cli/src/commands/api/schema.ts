import { CliError, type CommandContext, ExitCode, type ReadCommand } from '@agentic-kit/command';
import {
  getIntrospectionQuery,
  type IntrospectionField,
  type IntrospectionInputValue,
  type IntrospectionQuery,
  type IntrospectionSchema,
  type IntrospectionType,
  type IntrospectionTypeRef
} from 'graphql';
import { z } from 'zod';

import type { CliCode } from '../../errors';
import { CLI_NAME, failureNext, openSession } from '../../session';
import { resolveTarget, send, type Target, TARGET_PROPERTIES, type TargetInput,targetWarnings, targetWords } from './target';

type RootKind = 'query' | 'mutation' | 'subscription';
type MatchKind = RootKind | 'type' | 'field';

/** Where a match sorts among matches of the same quality: entry points first, then types. */
const KIND_ORDER: Record<MatchKind, number> = { query: 0, mutation: 1, subscription: 2, type: 3, field: 4 };
const MAX_LINE = 160;

export interface Match {
  kind: MatchKind;
  /** A type name, a root field name, or Type.field. */
  name: string;
  typeKind?: string;
  /** The return type of a field. */
  type?: string;
  description?: string;
}

function typeName(ref: IntrospectionTypeRef): string {
  switch (ref.kind) {
  case 'NON_NULL':
    return `${typeName(ref.ofType)}!`;
  case 'LIST':
    return `[${typeName(ref.ofType)}]`;
  default:
    return ref.name;
  }
}

function firstLine(text: string | null | undefined): string | undefined {
  const line = text?.split('\n')[0].trim();
  if (!line) return undefined;
  return line.length > MAX_LINE ? `${line.slice(0, MAX_LINE - 1)}…` : line;
}

const described = (text: string | null | undefined) => (text ? { description: text } : {});

const fieldsOf = (type: IntrospectionType): readonly IntrospectionField[] => ('fields' in type && type.fields) || [];

function rootKinds(schema: IntrospectionSchema): Map<string, RootKind> {
  const roots: Array<[string | undefined, RootKind]> = [
    [schema.queryType?.name, 'query'],
    [schema.mutationType?.name, 'mutation'],
    [schema.subscriptionType?.name, 'subscription']
  ];
  return new Map(roots.filter((root): root is [string, RootKind] => Boolean(root[0])));
}

const publicTypes = (schema: IntrospectionSchema): IntrospectionType[] => schema.types.filter((type) => !type.name.startsWith('__'));

/**
 * Every type and field whose name holds `term`. Types and root fields come
 * before the fields of other types (which repeat a type name in every payload),
 * and in each group exact names come first, then prefixes, then the rest.
 */
export function search(schema: IntrospectionSchema, term: string): Match[] {
  const wanted = term.toLowerCase();
  const quality = (name: string): number => {
    const lower = name.toLowerCase();
    if (lower === wanted) return 0;
    if (lower.startsWith(wanted)) return 1;
    return lower.includes(wanted) ? 2 : -1;
  };
  const roots = rootKinds(schema);
  const scored: Array<{ match: Match; quality: number }> = [];
  for (const type of publicTypes(schema)) {
    scored.push({ match: { kind: 'type', name: type.name, typeKind: type.kind, ...shortDescription(type.description) }, quality: quality(type.name) });
    const root = roots.get(type.name);
    for (const field of fieldsOf(type)) {
      scored.push({
        match: { kind: root ?? 'field', name: root ? field.name : `${type.name}.${field.name}`, type: typeName(field.type), ...shortDescription(field.description) },
        quality: quality(field.name)
      });
    }
  }
  return scored
    .filter((entry) => entry.quality >= 0)
    .sort((a, b) =>
      Number(a.match.kind === 'field') - Number(b.match.kind === 'field') ||
      a.quality - b.quality ||
      KIND_ORDER[a.match.kind] - KIND_ORDER[b.match.kind] ||
      a.match.name.localeCompare(b.match.name))
    .map((entry) => entry.match);
}

function shortDescription(text: string | null | undefined): { description?: string } {
  const line = firstLine(text);
  return line ? { description: line } : {};
}

const argument = (value: IntrospectionInputValue) => ({
  name: value.name,
  type: typeName(value.type),
  ...(value.defaultValue != null ? { defaultValue: value.defaultValue } : {}),
  ...described(value.description)
});

export type Description =
  | { kind: 'type'; name: string; typeKind: string; description?: string; fields?: unknown[]; total?: number }
  | { kind: RootKind | 'field'; parent: string; name: string; type: string; description?: string; args: ReturnType<typeof argument>[] };

/** The entries of a type by its kind: an introspection answer lists every key for every kind, with null for the ones that do not apply. */
function typeEntries(type: IntrospectionType): unknown[] | undefined {
  switch (type.kind) {
  case 'OBJECT':
  case 'INTERFACE':
    return fieldsOf(type).map((field) => ({
      name: field.name,
      type: typeName(field.type),
      ...(field.args.length ? { args: field.args.map((arg) => `${arg.name}: ${typeName(arg.type)}`) } : {}),
      ...shortDescription(field.description)
    }));
  case 'INPUT_OBJECT':
    return (type.inputFields ?? []).map(argument);
  case 'ENUM':
    return (type.enumValues ?? []).map((value) => ({ name: value.name, ...shortDescription(value.description) }));
  case 'UNION':
    return (type.possibleTypes ?? []).map((member) => ({ name: member.name }));
  default:
    return undefined;
  }
}

function describeType(type: IntrospectionType, limit: number): Description {
  const head = { kind: 'type' as const, name: type.name, typeKind: type.kind, ...described(type.description) };
  const entries = typeEntries(type);
  return entries ? { ...head, fields: entries.slice(0, limit), total: entries.length } : head;
}

const namedType = (ref: IntrospectionTypeRef): string => (ref.kind === 'NON_NULL' || ref.kind === 'LIST' ? namedType(ref.ofType) : ref.name);

/** The input object types the arguments of a field take, each once: what a person must write to call it. */
export function inputTypesOf(schema: IntrospectionSchema, description: Description): string[] {
  if (description.kind === 'type') return [];
  const kinds = new Map(publicTypes(schema).map((type) => [type.name, type.kind]));
  const parent = publicTypes(schema).find((type) => type.name === description.parent);
  const field = parent && fieldsOf(parent).find((candidate) => candidate.name === description.name);
  return [...new Set((field?.args ?? []).map((arg) => namedType(arg.type)).filter((name) => kinds.get(name) === 'INPUT_OBJECT'))];
}

function describeField(parent: string, kind: RootKind | 'field', field: IntrospectionField): Description {
  return { kind, parent, name: field.name, type: typeName(field.type), ...described(field.description), args: field.args.map(argument) };
}

/** A type by its name, a field as Type.field, or a root field by its name alone. */
export function describe(schema: IntrospectionSchema, name: string, limit: number): Description | undefined {
  const types = publicTypes(schema);
  const type = types.find((candidate) => candidate.name === name);
  if (type) return describeType(type, limit);
  const roots = rootKinds(schema);
  const [parentName, fieldName] = name.includes('.') ? name.split('.', 2) : [undefined, name];
  const parents = parentName ? types.filter((candidate) => candidate.name === parentName) : types.filter((candidate) => roots.has(candidate.name));
  for (const parent of parents) {
    const field = fieldsOf(parent).find((candidate) => candidate.name === fieldName);
    if (field) return describeField(parent.name, roots.get(parent.name) ?? 'field', field);
  }
  return undefined;
}

async function introspect(input: TargetInput, ctx: CommandContext): Promise<{ schema: IntrospectionSchema; target: Target }> {
  const session = await openSession(ctx);
  const target = resolveTarget(input, session);
  const data = (await send(target, { query: getIntrospectionQuery() }, `Reading the schema of ${target.endpoint}`, (failure) => failureNext(failure, ctx))) as IntrospectionQuery;
  return { schema: data.__schema, target };
}

function positiveLimit(limit: number): number {
  if (limit >= 1) return limit;
  throw new CliError<CliCode>({ code: 'invalid-input', message: `--limit must be 1 or more, got ${limit}.`, exitCode: ExitCode.usage, details: { flag: '--limit' } });
}

function matchLine(match: Match): string {
  const what = match.type ? `${match.name}: ${match.type}` : `${match.name} (${match.typeKind})`;
  return `${match.kind.padEnd(12)} ${what}${match.description ? `  ${match.description}` : ''}`;
}

function descriptionText(description: Description): string {
  if (description.kind === 'type') {
    const lines = [`type ${description.name} (${description.typeKind})${description.description ? `: ${description.description}` : ''}`];
    for (const entry of (description.fields ?? []) as Array<{ name: string; type?: string; args?: string[]; defaultValue?: string; description?: string }>) {
      const args = entry.args ? `(${entry.args.join(', ')})` : '';
      const fallback = entry.defaultValue !== undefined ? ` = ${entry.defaultValue}` : '';
      lines.push(`  ${entry.name}${args}${entry.type ? `: ${entry.type}` : ''}${fallback}${entry.description ? `  ${firstLine(entry.description)}` : ''}`);
    }
    if (description.total !== undefined && description.total > (description.fields?.length ?? 0)) {
      lines.push(`  … ${description.total - (description.fields?.length ?? 0)} more`);
    }
    return lines.join('\n');
  }
  const args = description.args.map((arg) => `${arg.name}: ${arg.type}`).join(', ');
  const lines = [`${description.kind} ${description.parent}.${description.name}(${args}): ${description.type}`];
  if (description.description) lines.push(description.description);
  if (description.args.length) {
    lines.push('Arguments:', ...description.args.map((arg) => `  ${arg.name}: ${arg.type}${arg.description ? `  ${firstLine(arg.description)}` : ''}`));
  }
  return lines.join('\n');
}

const SearchInput = z.object({
  term: z.string().describe('A part of a type or field name, in any case'),
  limit: z.number().int().default(20).describe('Show at most this many matches'),
  ...TARGET_PROPERTIES
});

const apiSearch: ReadCommand<typeof SearchInput, { matches: Match[]; total: number }> = {
  name: 'api search',
  summary: 'Find types and fields in the GraphQL schema of a plane',
  description: 'Reads the schema of a plane by introspection, and lists the types and fields whose names hold the term, with the first line of each description.',
  effect: 'read',
  input: SearchInput,
  positionals: ['term'],
  examples: [{ command: `${CLI_NAME} api search database` }, { command: `${CLI_NAME} api search blueprint --plane modules` }],
  async run(input, ctx) {
    const limit = positiveLimit(input.limit);
    const { schema, target } = await introspect(input, ctx);
    const all = search(schema, input.term);
    const matches = all.slice(0, limit);
    const next = all.length > matches.length
      ? [ctx.followUp(['--limit', String(all.length)], { drop: ['--limit'], why: 'Show every match' })]
      : matches.length
        ? [ctx.next(['api', 'describe', matches[0].name, ...targetWords(input)], 'See its fields or arguments')]
        : [];
    const text = matches.length ? matches.map(matchLine).join('\n') : `No type or field name holds "${input.term}".`;
    return { data: { matches, total: all.length }, text, next, warnings: targetWarnings(target) };
  }
};

const DescribeInput = z.object({
  name: z.string().describe('A type, Type.field, or a root field name'),
  limit: z.number().int().default(50).describe('Show at most this many fields of a type'),
  ...TARGET_PROPERTIES
});

const apiDescribe: ReadCommand<typeof DescribeInput, Description> = {
  name: 'api describe',
  summary: 'Show a type with its fields, or a field with its arguments and return type',
  description: 'Reads the schema of a plane by introspection. NAME is a type (Database), a field (Database.name), or a root field (databases).',
  effect: 'read',
  input: DescribeInput,
  positionals: ['name'],
  examples: [{ command: `${CLI_NAME} api describe Database` }, { command: `${CLI_NAME} api describe databases` }],
  async run(input, ctx) {
    const limit = positiveLimit(input.limit);
    const { schema, target } = await introspect(input, ctx);
    const description = describe(schema, input.name, limit);
    if (!description) {
      throw new CliError<CliCode>({
        code: 'not-found',
        message: `The schema of ${target.endpoint} has no type or field named "${input.name}".`,
        hint: 'Names are case-sensitive. Search for a part of the name.',
        next: [ctx.next(['api', 'search', input.name, ...targetWords(input)], 'Find similar names')]
      });
    }
    const truncated = description.kind === 'type' && description.total !== undefined && description.total > (description.fields?.length ?? 0);
    const next = [
      ...(truncated ? [ctx.followUp(['--limit', String(description.total)], { drop: ['--limit'], why: 'Show every field' })] : []),
      ...inputTypesOf(schema, description).map((name) => ctx.next(['api', 'describe', name, ...targetWords(input)], `See the fields of ${name}, its input`))
    ];
    return { data: description, text: descriptionText(description), next: next.length ? next : undefined, warnings: targetWarnings(target) };
  }
};

export const schemaCommands = [apiSearch, apiDescribe];
