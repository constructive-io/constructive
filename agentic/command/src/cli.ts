import { Inquirerer, parseArgv } from 'inquirerer';
import { resolve as resolvePath } from 'path';
import { Readable, Writable } from 'stream';
import { isatty } from 'tty';
import { z } from 'zod';

import { runChange } from './approval';
import { buildManifest, commandHelp, commandSchema, groupHelp, llmsIndex, rootHelp, type Shown, topicPage } from './help';
import {
  askFor,
  buildFlagTable,
  closest,
  type CommandLine,
  commandLine,
  type FlagDef,
  type FlagTable,
  inputWords,
  isLayerError,
  isPlainObject,
  jsonSchemaOf,
  kebabCase,
  LAYER_FLAGS,
  LAYER_INPUT,
  layerError,
  type LayerFlags,
  nearness,
  orList,
  own,
  parseInput,
  readInput,
  readLayerFlags,
  readScope,
  redactText,
  requestedFormat,
  type Scope,
  searchPatterns,
  splitSecrets,
  type StepBuilder,
  stepBuilder,
  type Token,
  tokenize,
  usageError
} from './input';
import {
  type ChangeCommand,
  type Cli,
  type CliConfig,
  CliError,
  type CliIO,
  type CommandContext,
  type CommandDefinition,
  type CommandErrorCode,
  type CommandResult,
  type Effect,
  ExitCode,
  type HelpTopic,
  type InputSchema,
  isCliError,
  type NextStep,
  type PassthroughCommand,
  type ReadCommand
} from './types';

type Format = 'text' | 'json';

/** `path` holds the argv indexes of the words that named the group or command. */
type Resolution =
  | { kind: 'root' }
  | { kind: 'group'; group: string; path: Set<number> }
  | { kind: 'command'; command: CommandDefinition; path: Set<number> }
  | { kind: 'unknown'; words: string[] };

/** The kinds of command, by what the layer does before it hands over: nothing, the input, or the input and the approval. */
type Kind = 'read' | 'change' | 'immediate' | 'serve' | 'passthrough';

/** After SIGINT, how long the command may take to settle before the interrupt is reported anyway. */
const SETTLE_LIMIT_MS = 2000;
const COMMAND_NAME = /^[a-z0-9][\w-]*( [a-z0-9][\w-]*)*$/i;
const TOPIC_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A Markdown heading outside fenced code. */
const HEADING = /^ {0,3}#{1,6}(\s|$)/m;
const FENCED = /^ {0,3}```[\s\S]*?^ {0,3}```/gm;

const HELP_INPUT = z.object({
  name: z.array(z.string()).optional().describe('The words of a command or of a group of commands, or the name of a help topic; none for the help of the CLI')
});

const HELP_PAGE = z.object({
  kind: z.enum(['cli', 'group', 'command', 'topic']).describe('What the page is the help of'),
  name: z.string().describe('The name of the CLI, the group, the command or the topic'),
  text: z.string().describe('The page, as help prints it')
});

type HelpPage = z.output<typeof HELP_PAGE>;

/** Throws a plain Error on a definition mistake, as for a command. `taken` holds every command and group name. */
function checkTopics(topics: HelpTopic[], taken: Set<string>): void {
  const names = new Set<string>();
  const sections = new Map<string, string>();
  for (const topic of topics) {
    const owner = `The help topic "${topic.name}"`;
    if (!TOPIC_NAME.test(topic.name)) throw new Error(`${owner} has an invalid name. Use lower-case words joined by "-", for example "exit-codes".`);
    if (names.has(topic.name)) throw new Error(`${owner} is defined twice. Give each topic a unique name.`);
    if (taken.has(topic.name)) throw new Error(`${owner} has the name of a command or a group, so "help ${topic.name}" could not tell them apart. Rename the topic.`);
    if (HEADING.test(topic.body.replace(FENCED, ''))) {
      throw new Error(`${owner} has a heading in its body, but a topic body has no headings, because the reference makes the topic one section of its own. Use paragraphs and lists.`);
    }
    if (topic.section && sections.has(topic.section)) {
      throw new Error(`${owner} fills the section ${topic.section}, which the topic "${sections.get(topic.section)}" fills too. Give the section to one of them.`);
    }
    if (topic.section) sections.set(topic.section, topic.name);
    names.add(topic.name);
  }
}

const isTerminal = (stream: Readable | Writable): boolean => (stream as { isTTY?: boolean }).isTTY === true;

const isFunction = (value: unknown): boolean => typeof value === 'function';

/**
 * The kind of a command, checked against what it defines: a change must have `plan` and `apply` and no `run`, so no
 * command can run a change past the layer's approval. Throws a plain Error on a definition mistake.
 */
function kindOf(command: CommandDefinition, owner: string): Kind {
  const shape = command as unknown as Record<string, unknown>;
  const has = (key: string) => isFunction(shape[key]);
  const effect = shape.effect;
  if (effect !== 'read' && effect !== 'write' && effect !== 'destructive') {
    throw new Error(`${owner} has the effect ${JSON.stringify(effect)}. Give it "read", "write" or "destructive".`);
  }
  if (shape.passthrough !== undefined) {
    if (!has('passthrough') || has('run') || has('plan') || has('apply') || has('serve') || shape.input !== undefined || shape.positionals !== undefined) {
      throw new Error(`${owner} is a passthrough command, so it has passthrough() alone, and no input schema or positionals. Remove the rest, or remove passthrough.`);
    }
    return 'passthrough';
  }
  if (has('serve')) {
    if (shape.stdout !== 'reserved' || has('run') || has('plan') || has('apply')) {
      throw new Error(`${owner} serves a protocol, so it has serve() alone and stdout: 'reserved'. Remove run, plan and apply.`);
    }
    return 'serve';
  }
  if (shape.stdout !== undefined) throw new Error(`${owner} reserves stdout, which only a command with serve() does.`);
  if (shape.immediate !== undefined) {
    if (shape.immediate !== true || effect !== 'write' || !has('run') || has('plan') || has('apply')) {
      throw new Error(`${owner} runs at once (immediate: true), so it is a "write" with run() and no plan or apply. Give it a plan instead if it can lose data or widen access.`);
    }
    return 'immediate';
  }
  if (effect === 'read') {
    if (!has('run') || has('plan') || has('apply')) throw new Error(`${owner} is a "read" command, so it has run() and no plan or apply.`);
    return 'read';
  }
  if (!has('plan') || !has('apply') || has('run')) {
    throw new Error(
      `${owner} has the effect "${effect}", so it has plan() and apply() and no run(): the layer shows the plan, ` +
        'and calls apply only once the run approves it (--yes, or a yes on a terminal). ' +
        'A write the person makes to their own local session, with nothing to approve, is immediate: true with run().'
    );
  }
  return 'change';
}

async function readAll(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Keeps only the given dot paths of `data`; an array maps over its elements. Each path that matched somewhere is
 * added to `matched` (in an empty array every path counts as matched, since no element can disprove it).
 */
function pick(data: unknown, paths: string[], matched: Set<string>, prefix = ''): unknown {
  if (Array.isArray(data)) {
    if (data.length === 0) paths.forEach((path) => matched.add(prefix + path));
    return data.map((item) => pick(item, paths, matched, prefix));
  }
  if (!isPlainObject(data)) return data;
  const byHead = new Map<string, string[]>();
  for (const path of paths) {
    const [head, ...rest] = path.split('.');
    byHead.set(head, [...(byHead.get(head) ?? []), rest.join('.')]);
  }
  const picked: Array<[string, unknown]> = [];
  for (const [head, tails] of byHead) {
    if (!Object.hasOwn(data, head)) continue;
    if (tails.includes('')) {
      picked.push([head, data[head]]);
      tails.forEach((tail) => matched.add(prefix + (tail ? `${head}.${tail}` : head)));
    } else {
      picked.push([head, pick(data[head], tails, matched, `${prefix}${head}.`)]);
    }
  }
  return Object.fromEntries(picked);
}

function unmatchedFields(unmatched: string[], command: string, data: unknown): { message: string; keys: string } {
  const sample = Array.isArray(data) ? data[0] : data;
  const keys = isPlainObject(sample) ? Object.keys(sample) : [];
  return {
    message: `--fields ${orList(unmatched.map((path) => `"${path}"`), 'and')} matched nothing in the data of "${command}".`,
    keys: keys.length ? `The data has the keys ${keys.join(', ')}.` : 'The data has no keys to select.'
  };
}

const cell = (value: unknown): string =>
  value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);

function renderTable(rows: Record<string, unknown>[]): string {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const cells = [keys, ...rows.map((row) => keys.map((key) => cell(row[key])))];
  const widths = keys.map((_, index) => Math.max(...cells.map((line) => line[index].length)));
  return cells.map((line) => line.map((value, index) => value.padEnd(widths[index])).join('  ').trimEnd()).join('\n');
}

function renderData(data: unknown): string {
  if (data === null || data === undefined) return '';
  if (Array.isArray(data)) {
    if (data.length === 0) return '(none)';
    return data.every(isPlainObject) ? renderTable(data) : data.map(cell).join('\n');
  }
  if (isPlainObject(data)) {
    return Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${cell(value)}`)
      .join('\n');
  }
  return String(data);
}

const nextBlock = (next: NextStep[]): string =>
  ['Next:', ...next.map((step) => (step.why ? `  ${step.command}  # ${step.why}` : `  ${step.command}`))].join('\n');

/**
 * Writes a run's output. `print` and `json` are for what a person asks for (help, --version, --schema, --llms) and
 * go to stdout. Results and errors go to `results`: stdout, or stderr for a command whose stdout is reserved.
 */
class Output {
  private patterns: string[] = [];

  constructor(
    readonly format: Format,
    private readonly stdout: Writable,
    private readonly stderr: Writable,
    private readonly results: Writable,
    private readonly debug: boolean,
    private readonly command: string | undefined
  ) {}

  /** The secrets that text written by the command (not by the layer) is searched for. */
  useSecrets(secrets: string[]): void {
    this.patterns = searchPatterns(secrets);
  }

  print(text: string): number {
    this.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
    return ExitCode.ok;
  }

  json(value: unknown): number {
    return this.print(JSON.stringify(value, null, 2));
  }

  private emit(text: string): void {
    this.results.write(text.endsWith('\n') ? text : `${text}\n`);
  }

  private emitJson(value: unknown): void {
    this.emit(JSON.stringify(value, null, 2));
  }

  /** A --fields path that matches nothing fails a read; after a change it is only a warning, since the change ran. */
  success(result: CommandResult, fields: string[] | undefined, effect: Effect): number {
    const matched = new Set<string>();
    const data = fields ? pick(result.data ?? null, fields, matched) : result.data ?? null;
    const unmatched = fields?.filter((field) => !matched.has(field)) ?? [];
    const warnings = (result.warnings ?? []).map((warning) => this.redact(warning));
    if (unmatched.length) {
      const { message, keys } = unmatchedFields(unmatched, this.command, result.data ?? null);
      if (effect === 'read') {
        return this.error(usageError('invalid-input', message, { hint: keys, details: { flag: '--fields', unmatched } }));
      }
      warnings.push(`${message} ${keys}`);
    }
    const next = this.steps(result.next);
    if (this.format === 'json') {
      this.emitJson({ ok: true, data, meta: { command: this.command, next, warnings: warnings.length ? warnings : undefined } });
      return ExitCode.ok;
    }
    const body = !fields && result.text !== undefined ? result.text : renderData(data);
    if (body) this.emit(body);
    if (next) this.emit(nextBlock(next));
    for (const warning of warnings) this.stderr.write(`Warning: ${warning}\n`);
    return ExitCode.ok;
  }

  error(thrown: unknown): number {
    const search = !isLayerError(thrown);
    const redact = (text: string): string => (search ? this.redact(text) : text);
    const stack = !isCliError(thrown) && this.debug && thrown instanceof Error ? redact(thrown.stack ?? '') : undefined;
    const error = isCliError(thrown)
      ? thrown
      : new CliError<CommandErrorCode>({
        code: 'failed',
        message: thrown instanceof Error ? thrown.message : String(thrown),
        hint: this.debug ? undefined : 'Rerun with DEBUG=1 to see the stack trace.',
        details: stack ? { stack } : undefined
      });
    const message = redact(error.message);
    const cause = error.cause === undefined ? undefined : redact(error.cause);
    const hint = error.hint === undefined ? undefined : redact(error.hint);
    const next = search ? this.steps(error.next) : error.next;
    if (this.format === 'json') {
      this.emitJson({
        ok: false,
        error: { code: error.code, message, cause, hint, retryable: error.retryable, details: search ? this.redactDeep(error.details) : error.details },
        meta: { command: this.command, next }
      });
      return error.exitCode;
    }
    const lines = [`Error (${error.code}): ${message}`];
    if (cause) lines.push(`Cause: ${cause}`);
    if (hint) lines.push(`Hint: ${hint}`);
    if (next) lines.push(nextBlock(next));
    if (stack) lines.push(stack);
    this.stderr.write(`${lines.join('\n')}\n`);
    return error.exitCode;
  }

  private steps(next: NextStep[] | undefined): NextStep[] | undefined {
    if (!next?.length) return undefined;
    return next.map((step) => ({
      command: this.redact(step.command),
      argv: step.argv?.map((word) => this.redact(word)),
      placeholders: step.placeholders,
      why: this.redact(step.why)
    }));
  }

  private redact(text: string): string {
    return redactText(text, this.patterns);
  }

  private redactDeep(value: unknown): unknown {
    if (typeof value === 'string') return this.redact(value);
    if (Array.isArray(value)) return value.map((item) => this.redactDeep(item));
    if (isPlainObject(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.redactDeep(item)]));
    }
    return value;
  }
}

/** Why prompts are off, or undefined when the session is interactive. */
function promptBlocker(stdinIsTerminal: boolean, stdoutIsTerminal: boolean, layer: LayerFlags, env: NodeJS.ProcessEnv): string | undefined {
  if (layer.noInput) return '--no-input was given';
  if (!layer.tty) return '--tty false was given';
  if (env.CI) return 'the CI environment variable is set';
  if (!stdinIsTerminal) return 'stdin is not a terminal';
  if (!stdoutIsTerminal) return 'stdout is not a terminal';
  return undefined;
}

const helpStep = ({ path, step }: Scope, why: string): NextStep => step([...path, '--help'], why);

function rejectUnknownFlags(tokens: Token[], table: FlagTable, scope: Scope): void {
  const { usage } = scope;
  const unknown = tokens.find((token): token is Extract<Token, { kind: 'unknown' }> => token.kind === 'unknown');
  if (!unknown) return;
  const typed = unknown.flag.replace(/^-+/, '');
  const suggestions = closest(kebabCase(typed) || typed, table.flags.map((def) => def.flag)).map((flag) => `--${flag}`);
  throw usageError('unknown-flag', `${unknown.flag} is not a flag of "${usage}".`, {
    hint: suggestions.length ? `Did you mean ${orList(suggestions)}?` : `Run "${usage} --help" to list the flags.`,
    next: [helpStep(scope, 'List the flags')],
    details: { flag: unknown.flag, suggestions }
  });
}

function rejectPositionals(tokens: Token[], scope: Scope): void {
  const { usage } = scope;
  const extra = tokens.find((token): token is Extract<Token, { kind: 'positional' }> => token.kind === 'positional');
  if (!extra) return;
  throw usageError('unexpected-argument', `"${usage}" takes no arguments, but got "${extra.value}".`, {
    hint: `Run "${usage} --help" to list the commands.`,
    next: [helpStep(scope, 'List the commands')]
  });
}

function missingInput(scope: Scope, missing: FlagDef[], blocker: string): CliError {
  const { usage } = scope;
  const flags = missing.map((def) => `--${def.flag}`);
  return usageError('missing-input', `"${usage}" needs ${orList(flags, 'and')}.`, {
    cause: `No value was given, and prompts are off because ${blocker}.`,
    hint: `Pass ${flags.length === 1 ? 'it as a flag' : 'them as flags'}, or pass the whole input with --input '<json>', --input @file.json or --input - (stdin).`,
    next: [scope.step([...scope.path, '--schema'], 'See every input property')],
    details: { missing: flags }
  });
}

/** A command that changes at once has no plan to show, so it has no dry run. */
function rejectDryRun(layer: LayerFlags, scope: Scope, why: string): void {
  if (!layer.dryRun) return;
  throw usageError('dry-run-unsupported', `"${scope.usage}" has no dry run: ${why}.`, {
    hint: `Run it without --dry-run. Run "${scope.usage} --help" to see what it changes.`,
    next: [helpStep(scope, 'See what the command changes')],
    details: { flag: '--dry-run' }
  });
}

/** A command that serves a protocol has no plan of the layer's, so it takes neither --dry-run nor --yes. */
function rejectApprovalFlags(layer: LayerFlags, scope: Scope): void {
  rejectDryRun(layer, scope, 'it serves a protocol, and its client approves each change made through it');
  if (layer.yes) {
    throw usageError('invalid-input', `--yes does not apply to "${scope.usage}": it approves nothing here, because its client approves each change made through it.`, {
      hint: 'Run it without --yes.',
      next: [helpStep(scope, 'See what the command serves')],
      details: { flag: '--yes' }
    });
  }
}

/** A usage error of a command that names no next step gets the step every such error has: the command's --schema. */
function withSchemaStep(error: unknown, scope: Scope): unknown {
  if (!isLayerError(error) || error.exitCode !== ExitCode.usage || error.next?.length) return error;
  const { code, message, cause, hint, retryable, exitCode, details } = error;
  return layerError({ code, message, cause, hint, retryable, exitCode, details, next: [scope.step([...scope.path, '--schema'], 'See the input schema')] });
}

/**
 * Runs `work` to the end, or until SIGINT: then it aborts the signal, waits up to SETTLE_LIMIT_MS for `work` to
 * settle, and fails with `interrupted` whatever `work` did after the abort.
 */
async function untilInterrupted<T>(controller: AbortController, work: () => Promise<T>): Promise<T> {
  const onSigint = (): void => controller.abort();
  process.on('SIGINT', onSigint);
  try {
    const task = work();
    const settled = task.then(() => true, () => true);
    const aborted = new Promise<false>((resolve) => controller.signal.addEventListener('abort', () => resolve(false), { once: true }));
    if (await Promise.race([settled, aborted])) return await task;
    let timer: ReturnType<typeof setTimeout>;
    const limit = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), SETTLE_LIMIT_MS);
    });
    const stopped = await Promise.race([settled, limit]);
    clearTimeout(timer);
    throw layerError({
      code: 'interrupted',
      message: 'The command was interrupted (SIGINT).',
      cause: stopped ? undefined : `The command did not stop within ${SETTLE_LIMIT_MS / 1000} s of the interrupt, so it may still be running.`,
      exitCode: ExitCode.interrupted
    });
  } finally {
    process.off('SIGINT', onSigint);
  }
}

const positionalsOf = (command: CommandDefinition): string[] => ('passthrough' in command ? [] : command.positionals ?? []);

export function createCli(definition: CliConfig): Cli {
  const reserved = definition.commands.find((command) => command.name === 'help' || command.name.startsWith('help '));
  if (reserved) {
    throw new Error(
      `The command "${reserved.name}" uses the name help, which is built into the command layer: it prints the help of the CLI, of a command or a group, and of a help topic. Rename the command.`
    );
  }
  const byName = new Map<string, CommandDefinition>();
  const kinds = new Map<CommandDefinition, Kind>();
  const groups = new Set<string>();
  const shown = new Map<CommandDefinition, Shown>();
  const topics = definition.topics ?? [];

  /** The page `help <words>` prints: of the CLI, a command, a group or a topic; any other words are unknown-topic. */
  function helpPage(words: string[], next: StepBuilder): HelpPage {
    const name = words.join(' ');
    if (!words.length) return { kind: 'cli', name: config.name, text: rootHelp(config, rootTable) };
    const command = byName.get(name);
    if (command) return { kind: 'command', name, text: commandHelp(config, command, shownOf(command)) };
    if (groups.has(name)) return { kind: 'group', name, text: groupHelp(config, name) };
    const topic = topics.find((item) => item.name === name);
    if (topic) return { kind: 'topic', name, text: topicPage(topic) };
    const named = [...config.commands.filter((item) => !item.hidden).map((item) => item.name), ...groups, ...topics.map((item) => item.name)];
    const suggestions = closest(name, named);
    throw usageError('unknown-topic', `"${name}" is not a command, a group of commands or a help topic of ${config.name}.`, {
      hint: suggestions.length ? `Did you mean ${orList(suggestions.map((item) => `"${item}"`))}?` : `Run "${config.name} help" to list the commands and the help topics.`,
      next: [next(['help'], 'List the commands and the help topics')],
      details: { suggestions }
    });
  }

  const help: ReadCommand<typeof HELP_INPUT, HelpPage> = {
    name: 'help',
    summary: 'Show the help of the CLI, a command, a group or a help topic',
    effect: 'read',
    positionals: ['name'],
    input: HELP_INPUT,
    output: HELP_PAGE,
    run: ({ name = [] }, ctx) => {
      const page = helpPage(name, ctx.next);
      return { data: page, text: page.text };
    }
  };
  const config: CliConfig = { ...definition, topics, commands: [...definition.commands, help] };
  const globalsJson = config.globals ? jsonSchemaOf(config.globals, 'input') : undefined;
  const globalSource = { scope: 'global' as const, schema: config.globals, json: globalsJson };
  const layerSource = { scope: 'layer' as const, schema: LAYER_INPUT, json: LAYER_FLAGS };
  const rootTable = buildFlagTable(`The CLI "${config.name}"`, [globalSource, layerSource]);

  for (const command of config.commands) {
    const owner = `The command "${command.name}"`;
    if (!COMMAND_NAME.test(command.name)) {
      throw new Error(`${owner} has an invalid name. Use words separated by single spaces, for example "table add".`);
    }
    if (byName.has(command.name)) throw new Error(`${owner} is defined twice. Give each command a unique name.`);
    kinds.set(command, kindOf(command, owner));
    const input = 'passthrough' in command ? undefined : command.input;
    const inputJson = input ? jsonSchemaOf(input, 'input') : undefined;
    for (const name of positionalsOf(command)) {
      if (!own(inputJson?.properties, name)) {
        throw new Error(`${owner} lists the positional "${name}", but its input schema has no such property. Add the property, or remove the positional.`);
      }
    }
    const output = 'passthrough' in command ? undefined : command.output;
    shown.set(command, {
      input: inputJson,
      output: output ? jsonSchemaOf(output, 'output') : undefined,
      table: buildFlagTable(owner, [{ scope: 'input', schema: input, json: inputJson }, globalSource, layerSource])
    });
    byName.set(command.name, command);
    const words = command.name.split(' ');
    for (let length = 1; length < words.length; length++) groups.add(words.slice(0, length).join(' '));
  }
  checkTopics(topics, new Set([...byName.keys(), ...groups]));

  const shownOf = (command: CommandDefinition): Shown => shown.get(command);
  const manifest = () => buildManifest(config, globalsJson, shownOf);

  function resolve(argv: string[]): Resolution {
    const words: Array<{ value: string; index: number }> = [];
    for (const token of tokenize(argv, rootTable)) {
      if (token.kind === 'positional') words.push(token);
      else if (token.kind !== 'flag') break;
    }
    const indexes = (length: number) => new Set(words.slice(0, length).map((word) => word.index));
    for (let length = words.length; length > 0; length--) {
      const command = byName.get(words.slice(0, length).map((word) => word.value).join(' '));
      if (command) return { kind: 'command', command, path: indexes(length) };
    }
    if (words.length === 0) return { kind: 'root' };
    const group = words.map((word) => word.value).join(' ');
    return groups.has(group)
      ? { kind: 'group', group, path: indexes(words.length) }
      : { kind: 'unknown', words: words.map((word) => word.value) };
  }

  function unknownCommand(words: string[], step: StepBuilder): CliError {
    let length = 1;
    while (length < words.length && groups.has(words.slice(0, length).join(' '))) length++;
    const attempted = words.slice(0, length).join(' ');
    const group = length > 1 ? words.slice(0, length - 1).join(' ') : undefined;
    const suggestions = config.commands
      .filter((command) => !command.hidden)
      .map((command) => ({ name: command.name, distance: nearness(words.slice(0, command.name.split(' ').length).join(' '), command.name) }))
      .filter(({ distance }) => distance !== undefined)
      .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
      .slice(0, 3)
      .map(({ name }) => name);
    const listingPath = group ? group.split(' ') : [];
    const listing = [config.name, ...listingPath].join(' ');
    return usageError('unknown-command', `"${attempted}" is not a ${config.name} command.`, {
      hint: suggestions.length
        ? `Did you mean ${orList(suggestions.map((name) => `"${name}"`))}?`
        : `Run "${listing} --help" to list the commands.`,
      next: [helpStep({ usage: listing, path: listingPath, step }, 'List the commands')],
      details: { suggestions }
    });
  }

  function showRegistry(resolution: Extract<Resolution, { kind: 'root' | 'group' }>, tokens: Token[], output: Output, cwd: string, step: StepBuilder): number {
    const path = resolution.kind === 'group' ? resolution.group.split(' ') : [];
    const scope: Scope = { usage: [config.name, ...path].join(' '), path, step };
    rejectUnknownFlags(tokens, rootTable, scope);
    rejectPositionals(tokens, scope);
    const layer = readLayerFlags(tokens, cwd);
    const help = resolution.kind === 'group' ? groupHelp(config, resolution.group) : rootHelp(config, rootTable);
    if (layer.help) return output.print(help);
    if (layer.version) return output.print(config.version);
    if (layer.llms) return layer.format === 'json' ? output.json(manifest()) : output.print(llmsIndex(config, shownOf));
    if (layer.schema) {
      const example = config.commands.find((command) => !command.hidden)?.name ?? '<command>';
      throw usageError('invalid-input', '--schema needs a command.', {
        hint: `Name the command first, for example "${config.name} ${example} --schema".`,
        details: { flag: '--schema' }
      });
    }
    return output.print(help);
  }

  /** The values of the CLI's global flags, parsed by its zod schema; `lenient` keeps what reads for a passthrough command. */
  function readGlobals(tokens: Token[], cwd: string, lenient: boolean): Record<string, unknown> {
    const values = readScope(tokens, 'global', cwd, lenient);
    if (!config.globals) return values;
    if (lenient) {
      const parsed = config.globals.safeParse(values);
      return parsed.success ? parsed.data : values;
    }
    const labels = new Map(Object.keys(values).map((property) => [property, `--${kebabCase(property)}`]));
    return parseInput(config.globals, globalsJson, values, labels, `Run "${config.name} --help" to see the global flags.`);
  }

  async function runCommand(
    command: CommandDefinition,
    tokens: Token[],
    rest: string[],
    line: CommandLine,
    step: StepBuilder,
    output: Output,
    io: CliIO & { stdout: Writable; stderr: Writable; env: NodeJS.ProcessEnv; cwd: string }
  ): Promise<number> {
    const kind = kinds.get(command);
    const { table, input: inputJson } = shownOf(command);
    const usage = `${config.name} ${command.name}`;
    const scope: Scope = { usage, path: command.name.split(' '), step };
    // A passthrough command owns its arguments, so the layer reads its own flags there without refusing any.
    const lenient = kind === 'passthrough';
    const layer = readLayerFlags(tokens, io.cwd, lenient);
    if (!lenient) {
      rejectUnknownFlags(tokens, table, scope);
      if (layer.help) return output.print(commandHelp(config, command, shownOf(command)));
      if (layer.version) return output.print(config.version);
      if (layer.llms) return layer.format === 'json' ? output.json(manifest()) : output.print(llmsIndex(config, shownOf));
      if (layer.schema) return output.json(commandSchema(command, shownOf(command)));
      if (kind === 'serve') rejectApprovalFlags(layer, scope);
      if (kind === 'immediate') rejectDryRun(layer, scope, 'it makes its change as soon as it runs');
    }

    const cwd = layer.cwd ? resolvePath(io.cwd, layer.cwd) : io.cwd;
    const stdin = (): Readable => io.stdin ?? process.stdin;
    const blocker = promptBlocker(io.stdin ? isTerminal(io.stdin) : isatty(0), isTerminal(io.stdout), layer, io.env);
    const interactive = blocker === undefined;
    const controller = new AbortController();
    const globals = readGlobals(tokens, cwd, lenient);
    let prompter: Inquirerer | undefined;
    const ctx: CommandContext = {
      cliName: config.name,
      invocation: line.invocation,
      followUp: (flags, options) => {
        if (options.command !== undefined && !byName.has(options.command)) {
          throw new Error(`followUp cannot use "${options.command}", because it is not a command of ${config.name}. Name a registered command.`);
        }
        return line.followUp(flags, options);
      },
      next: step,
      nextFor: (name, input, why, options) => {
        const target = byName.get(name);
        if (!target) throw new Error(`nextFor cannot build a step for "${name}", because it is not a command of ${config.name}. Name a registered command.`);
        return step([...name.split(' '), ...inputWords(positionalsOf(target), shownOf(target).table, input, `${config.name} ${name}`)], why, options);
      },
      cwd,
      interactive,
      format: output.format,
      yes: layer.yes,
      globals,
      signal: controller.signal,
      // A getter, so that process.stdin is only opened when the command reads it.
      get stdin(): Readable {
        return stdin();
      },
      stdout: io.stdout,
      stderr: io.stderr,
      env: io.env,
      get prompter(): Inquirerer {
        // A layer prompt keeps the output of earlier commands on the screen, and a prompt with no answer cancels the command.
        prompter ??= new Inquirerer({
          noTty: !interactive,
          input: stdin(),
          output: io.stderr,
          clearScreen: false,
          onCancel: (reason) => {
            switch (reason) {
            case 'interrupt':
              return layerError({
                code: 'cancelled',
                message: 'The command was cancelled at a prompt (Ctrl-C). Nothing was changed by this step.',
                exitCode: ExitCode.interrupted
              });
            case 'end-of-input':
              return layerError({
                code: 'cancelled',
                message: 'The input ended before the prompt got an answer. Nothing was changed by this step.',
                exitCode: ExitCode.failure
              });
            }
          }
        });
        return prompter;
      }
    };

    /** The input, read from --input, the arguments and the flags, asked for on a terminal, then parsed by zod once. */
    const readValues = async (): Promise<Record<string, unknown>> => {
      const schema = (command as { input?: InputSchema }).input;
      const { values, labels, missing } = await readInput({
        table,
        positionals: positionalsOf(command),
        tokens,
        input: layer.input,
        cwd,
        scope,
        readStdin: () => readAll(stdin())
      });
      if (missing.length && !interactive) throw missingInput(scope, missing, blocker);
      const answered = missing.length ? { ...values, ...(await askFor(missing, ctx.prompter, cwd)) } : values;
      if (!schema) return answered;
      return parseInput(schema, inputJson, answered, labels, `Run "${usage} --schema" to see the input.`);
    };

    const runIt = async (): Promise<CommandResult | undefined> => {
      if (kind === 'passthrough') return (command as PassthroughCommand).passthrough(parseArgv(['', '', ...rest]), ctx);
      const input = await readValues();
      output.useSecrets([...splitSecrets(input, inputJson).secrets, ...splitSecrets(globals, globalsJson).secrets]);
      switch (kind) {
      case 'read':
      case 'immediate':
        return (command as { run(input: unknown, ctx: CommandContext): Promise<CommandResult> }).run(input, ctx);
      case 'serve':
        return (command as { serve(input: unknown, ctx: CommandContext): Promise<CommandResult> }).serve(input, ctx);
      case 'change':
        return runChange(command as ChangeCommand, input, ctx, layer.dryRun);
      }
    };

    try {
      const result = await untilInterrupted(controller, runIt);
      if (lenient && result?.data === undefined) return ExitCode.ok;
      return output.success(result, lenient ? undefined : layer.fields, command.effect);
    } finally {
      prompter?.close();
    }
  }

  async function run(argv: string[] = process.argv.slice(2), io: CliIO = {}): Promise<number> {
    const stdout = io.stdout ?? process.stdout;
    const stderr = io.stderr ?? process.stderr;
    const env = io.env ?? process.env;
    const cwd = io.cwd ?? process.cwd();
    const resolution = resolve(argv);
    const command = resolution.kind === 'command' ? resolution.command : undefined;
    const restIndexes = argv.map((_, index) => index).filter((index) => !('path' in resolution && resolution.path.has(index)));
    const rest = restIndexes.map((index) => argv[index]);
    const table = command ? shownOf(command).table : rootTable;
    const tokens = tokenize(rest, table);
    // Every step of this run, the layer's own and the command's, keeps the flags that choose its target (x-carry),
    // right after the CLI name, and no flag that only describes this run.
    const step = stepBuilder(config.name, argv, tokens, (index) => restIndexes[index], table);
    const format = requestedFormat(tokens) ?? (isTerminal(stdout) ? 'text' : 'json');
    const results = command && 'stdout' in command && command.stdout === 'reserved' ? stderr : stdout;
    const output = new Output(format, stdout, stderr, results, Boolean(env.DEBUG), command?.name);
    try {
      switch (resolution.kind) {
      case 'unknown':
        throw unknownCommand(resolution.words, step);
      case 'root':
      case 'group':
        return showRegistry(resolution, tokens, output, cwd, step);
      case 'command': {
        const { command: resolved } = resolution;
        const path = [...resolution.path].sort((a, b) => a - b);
        const { input } = shownOf(resolved);
        const line = commandLine(config.name, `${config.name} ${resolved.name}`, argv, path, (index) => restIndexes[index], tokens, positionalsOf(resolved), input, table);
        try {
          return await runCommand(resolved, tokens, rest, line, step, output, { ...io, stdout, stderr, env, cwd });
        } catch (error) {
          throw withSchemaStep(error, { usage: `${config.name} ${resolved.name}`, path: resolved.name.split(' '), step });
        }
      }
      }
    } catch (error) {
      return output.error(error);
    }
  }

  return { run, manifest };
}
