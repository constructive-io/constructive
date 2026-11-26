import { type ChangeCommand, CliError, type CommandContext, type CommandDefinition, ExitCode, type Planned, type ReadCommand } from '@agentic-kit/command';
import type { ConfirmPrompt } from '@agentic-kit/harness';
import { type FragmentDefinitionNode, type GraphQLError, Kind, type OperationDefinitionNode, parse, print, type SelectionNode } from 'graphql';
import { z } from 'zod';

import type { CliCode } from '../../errors';
import { CLI_NAME, failureNext, openSession } from '../../session';
import { type Plane, type ReadRequest, readRequest, type RequestNext, resolveTarget, send, type Target, TARGET_PROPERTIES, targetWarnings, targetWords } from './target';

const DOCUMENT_INPUT = z.object({
  query: z.string().describe('The GraphQL document: the text, @file.graphql, or - to read it from stdin'),
  variables: z.string().optional().describe('The variables: a JSON object, @file.json, or - to read them from stdin'),
  operation_name: z.string().optional().describe('The operation to run, when the document has several'),
  ...TARGET_PROPERTIES
});

type DocumentInput = z.output<typeof DOCUMENT_INPUT>;

/** A root field an operation selects: its schema name, its alias, and its arguments as written in the document. */
interface RootField {
  name: string;
  alias?: string;
  arguments: { name: string; value: string }[];
}

/** One operation of a document: its type, its name, and its root fields, with fragments resolved. */
interface Operation {
  type: 'query' | 'mutation' | 'subscription';
  name?: string;
  fields: RootField[];
}

const keyOf = (field: RootField): string => field.alias ?? field.name;

/** The root fields of a selection set: a fragment, inline or spread, adds the fields it selects. */
function rootFields(selections: readonly SelectionNode[], fragments: Map<string, FragmentDefinitionNode>, open: ReadonlySet<string>): RootField[] {
  return selections.flatMap((selection): RootField[] => {
    switch (selection.kind) {
    case Kind.FIELD:
      return [{
        name: selection.name.value,
        ...(selection.alias ? { alias: selection.alias.value } : {}),
        arguments: (selection.arguments ?? []).map((argument) => ({ name: argument.name.value, value: print(argument.value) }))
      }];
    case Kind.INLINE_FRAGMENT:
      return rootFields(selection.selectionSet.selections, fragments, open);
    case Kind.FRAGMENT_SPREAD: {
      const fragment = fragments.get(selection.name.value);
      if (!fragment || open.has(fragment.name.value)) return [];
      return rootFields(fragment.selectionSet.selections, fragments, new Set([...open, fragment.name.value]));
    }
    }
  });
}

function documentError(message: string, hint?: string): CliError {
  return new CliError<CliCode>({ code: 'invalid-input', message, hint, exitCode: ExitCode.usage, details: { flag: '--query' } });
}

function operationsOf(document: string): Operation[] {
  let parsed;
  try {
    parsed = parse(document);
  } catch (error) {
    // The parser's message quotes the document, which may hold a secret, so only the position is kept.
    const location = (error as GraphQLError).locations?.[0];
    const where = location ? ` (at line ${location.line}, column ${location.column})` : '';
    throw documentError(`The document is not valid GraphQL${where}.`, 'Fix the document there, or run "constructive api search <term>" to find the names.');
  }
  const fragments = new Map(
    parsed.definitions.filter((definition): definition is FragmentDefinitionNode => definition.kind === Kind.FRAGMENT_DEFINITION).map((fragment) => [fragment.name.value, fragment])
  );
  const operations = parsed.definitions.filter((definition): definition is OperationDefinitionNode => definition.kind === Kind.OPERATION_DEFINITION);
  if (operations.length === 0) throw documentError('The document has no operation, only fragments.');
  return operations.map((operation) => ({
    type: operation.operation as Operation['type'],
    name: operation.name?.value,
    fields: rootFields(operation.selectionSet.selections, fragments, new Set())
  }));
}

/** The operation that runs: the one --operation-name names, or the only one. Anything else is refused before a request or a plan. */
function selectOperation(operations: Operation[], name: string | undefined): Operation {
  const names = operations.flatMap((operation) => (operation.name ? [`"${operation.name}"`] : []));
  if (name !== undefined) {
    const named = operations.find((operation) => operation.name === name);
    if (named) return named;
    throw new CliError<CliCode>({
      code: 'invalid-input',
      message: `The document has no operation named "${name}". It has ${names.join(', ') || 'only an anonymous operation'}.`,
      exitCode: ExitCode.usage,
      details: { flag: '--operation-name' }
    });
  }
  if (operations.length === 1) return operations[0];
  throw new CliError<CliCode>({
    code: 'invalid-input',
    message: `The document has ${operations.length} operations, so --operation-name must say which one runs.`,
    hint: `Pass --operation-name with one of ${names.join(', ')}.`,
    exitCode: ExitCode.usage,
    details: { flag: '--operation-name' }
  });
}

const isChange = (operation: Operation): boolean => operation.type !== 'query';

const fieldText = (field: RootField): string => (field.alias ? `${field.alias} (${field.name})` : field.name);

const callText = (field: RootField): string =>
  `${field.alias ? `${field.alias}: ` : ''}${field.name}${field.arguments.length ? `(${field.arguments.map((argument) => `${argument.name}: ${argument.value}`).join(', ')})` : ''}`;

const describeOperation = (operation: Operation): string =>
  `${operation.type}${operation.name ? ` ${operation.name}` : ''} (${operation.fields.map(fieldText).join(', ') || 'no fields'})`;

/** The variables of a plan: their names, and their values only when they were given as text on the command line. */
type PlanVariables = { from: 'text'; names: string[]; values: Record<string, unknown> } | { from: 'file' | 'stdin'; names: string[] };

/** The plan of `api mutate`, as data: what runs, where, with which credential, and with which variables. */
interface MutationPlan extends ConfirmPrompt {
  plane: Plane;
  operation: Operation;
  variables?: PlanVariables;
}

const MAX_VALUE = 80;

function valueText(value: unknown): string {
  const text = JSON.stringify(value) ?? String(value);
  return text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE - 1)}…` : text;
}

function planOf(operation: Operation, target: Target, request: ReadRequest): MutationPlan {
  const given = request.body.variables;
  const names = Object.keys(given ?? {});
  const variables: PlanVariables | undefined = !given
    ? undefined
    : request.variablesFrom === 'text'
      ? { from: 'text', names, values: given }
      : { from: request.variablesFrom === 'stdin' ? 'stdin' : 'file', names };
  const what = `${operation.type}${operation.name ? ` ${operation.name}` : ''}`;
  const signedIn = target.credential.kind === 'session';
  const lines = [
    signedIn ? `Send ${what} on the ${target.plane} plane:` : `Send ${what} to ${target.endpoint} (the ${target.plane} plane), with no credential:`,
    ...operation.fields.map((field) => `  ${callText(field)}`)
  ];
  if (variables?.from === 'text') lines.push(`Variables: ${names.map((name) => `${name} = ${valueText(variables.values[name])}`).join(', ')}`);
  else if (variables) lines.push(`Variables, read from ${variables.from === 'stdin' ? 'stdin' : 'a file'} (values not shown): ${names.join(', ')}`);
  return {
    title: `Send ${operation.type}?`,
    message: lines.join('\n'),
    target:
      target.credential.kind === 'session'
        ? { kind: 'account', apiEndpoint: target.endpoint, account: target.credential.account }
        : { kind: 'no-credential', endpoint: target.endpoint },
    plane: target.plane,
    operation,
    ...(variables ? { variables } : {})
  };
}

/**
 * A warning for each mutation root field whose payload names no row: an update
 * or a delete that matched nothing answers with every selected record null and
 * no error, so the row does not exist or this account may not change it.
 */
function unchangedWarnings(data: unknown, operation: Operation): string[] {
  if (operation.type !== 'mutation' || typeof data !== 'object' || data === null) return [];
  const answer = data as Record<string, unknown>;
  return operation.fields
    .filter((field) => {
      const payload = answer[keyOf(field)];
      if (typeof payload !== 'object' || payload === null) return false;
      const records = Object.entries(payload).filter(([key]) => key !== 'clientMutationId' && key !== 'query');
      return records.length > 0 && records.every(([, value]) => value === null);
    })
    .map((field) => `${fieldText(field)} changed no row: its answer names none, so the row does not exist or this account may not change it.`);
}

/** The same command line, run by the other command of the pair. */
function otherCommand(ctx: CommandContext, from: string, to: string, why: string): CliError {
  return new CliError<CliCode>({
    code: 'invalid-input',
    message: `"${CLI_NAME} ${from}" does not run this document: ${why}.`,
    hint: `Run it with "${CLI_NAME} ${to}".`,
    exitCode: ExitCode.usage,
    next: [ctx.followUp([], { command: to, why: `Run the document with ${to}` })]
  });
}

/** The next steps for a failed document: for one too large, where to read the arguments that limit its root fields. */
function documentNext(input: DocumentInput, operation: Operation, ctx: CommandContext): RequestNext {
  return (failure) => {
    if (failure.code !== 'query-too-large') return failureNext(failure, ctx);
    const fields = [...new Set(operation.fields.map((field) => field.name))].slice(0, 3);
    return fields.map((field) => ctx.next(['api', 'describe', field, ...targetWords(input)], `See the arguments that limit the rows of ${field}`));
  };
}

async function request(input: DocumentInput, ctx: CommandContext, accept: (operation: Operation) => void) {
  const session = await openSession(ctx);
  const read = await readRequest(input, ctx);
  const operation = selectOperation(operationsOf(read.body.query), input.operation_name);
  accept(operation);
  return { target: resolveTarget(input, session), operation, read, failureNext: documentNext(input, operation, ctx) };
}

const shown = (data: unknown, target: Target, warnings: string[] = []) => ({
  data,
  text: JSON.stringify(data, null, 2),
  warnings: [...targetWarnings(target), ...warnings]
});

const apiQuery: ReadCommand<typeof DOCUMENT_INPUT, unknown> = {
  name: 'api query',
  summary: 'Run a GraphQL query on a plane of the backend',
  description:
    'Sends a GraphQL query to a plane of the session backend (api by default) with the session credential, and prints its data. ' +
    'A query only reads, so it runs at once; a mutation or a subscription runs with api mutate.',
  effect: 'read',
  input: DOCUMENT_INPUT,
  positionals: ['query'],
  examples: [
    { command: `${CLI_NAME} api query '{ databases(first: 10) { nodes { id name } } }'` },
    { command: `${CLI_NAME} api query @query.graphql --variables '{"first":10}' --plane modules` }
  ],
  async run(input, ctx) {
    const { target, read, failureNext } = await request(input, ctx, (operation) => {
      if (isChange(operation)) throw otherCommand(ctx, 'api query', 'api mutate', `it runs ${describeOperation(operation)}, which can change data`);
    });
    return shown(await send(target, read.body, `The query on ${target.endpoint}`, failureNext), target);
  }
};

/** The approved mutation: what is sent, where, and to whom the plan said. */
type MutationPlanned = Planned & Awaited<ReturnType<typeof request>>;

const apiMutate: ChangeCommand<typeof DOCUMENT_INPUT, unknown, MutationPlanned> = {
  name: 'api mutate',
  summary: 'Run a GraphQL mutation on a plane of the backend, after approval',
  description:
    'Sends a GraphQL document with a mutation or a subscription to a plane of the session backend, with the session credential. ' +
    'It is a change: without --yes it stops with the plan (the endpoint, the account, each root field with its arguments, and the variables) until a person approves it.',
  effect: 'write',
  input: DOCUMENT_INPUT,
  positionals: ['query'],
  examples: [{ command: `${CLI_NAME} api mutate @create.graphql --variables @vars.json --dry-run`, description: 'Show the plan; nothing is sent' }],
  notes: ['Give a secret (a password, a token) in --variables - or @file, never as text on the command line.'],
  async plan(input, ctx) {
    const requested = await request(input, ctx, (selected) => {
      if (!isChange(selected)) throw otherCommand(ctx, 'api mutate', 'api query', 'the operation that runs only reads');
    });
    return { plan: planOf(requested.operation, requested.target, requested.read), ...requested };
  },
  async apply(_input, { target, operation, read, failureNext }) {
    const data = await send(target, read.body, `The ${operation.type} on ${target.endpoint}`, failureNext);
    return shown(data, target, unchangedWarnings(data, operation));
  }
};

export const operationCommands: CommandDefinition[] = [apiQuery, apiMutate];
