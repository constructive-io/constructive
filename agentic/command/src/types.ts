import type { ConfirmPrompt } from '@agentic-kit/harness';
import type { Inquirerer } from 'inquirerer';
import type { Readable, Writable } from 'stream';
import type { z } from 'zod';

export type JSONSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

/** The JSON Schema the layer makes from zod: what it reads flags from and prints in help, --schema and the manifest. */
export interface JSONSchema {
  type?: JSONSchemaType | JSONSchemaType[];
  title?: string;
  description?: string;
  enum?: readonly unknown[];
  const?: unknown;
  default?: unknown;
  examples?: unknown[];
  properties?: Record<string, JSONSchema>;
  required?: readonly string[];
  additionalProperties?: boolean | JSONSchema;
  items?: JSONSchema;
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  allOf?: JSONSchema[];
  /** Set with `.meta({ 'x-secret': true })`: the value is never echoed. */
  'x-secret'?: boolean;
  /** On a global flag: the flag chooses the target of a run (a backend, a directory), so next steps repeat it. */
  'x-carry'?: boolean;
  /** The one-letter short form of a flag of the command layer (`-y`); a command or a CLI global cannot declare one. */
  'x-short'?: string;
  [keyword: string]: unknown;
}

export type Effect = 'read' | 'write' | 'destructive';

/** The input of a command: a zod object, strict or not, each property a flag. */
export type InputSchema = z.ZodObject<any, any>;

export interface NextStep {
  /** The line quoted for POSIX shells (sh, bash, zsh), for a person to read. fish reads it differently: run `argv`. */
  command: string;
  /** The exact words to run, the CLI name first. */
  argv: string[];
  /** The words of `argv` that a caller must replace before running it, for example `<name>`. */
  placeholders?: string[];
  why: string;
}

/** A word of a next step: a literal word, or a placeholder for the caller to fill (`{ placeholder: 'url' }` is `<url>`). */
export type NextWord = string | { placeholder: string };

export interface StepOptions {
  /** Carried global flags (x-carry) to leave out of this one step, in any spelling, for example `--as`. */
  drop?: string[];
}

export interface FollowUpOptions {
  why: string;
  /** Flags to remove, in any spelling and with their values, for example `--dry-run`. */
  drop?: string[];
  /** Another command path to run the same arguments with, for example 'api mutate'. */
  command?: string;
}

export interface CommandExample {
  command: string;
  description?: string;
}

export interface CommandContext {
  cliName: string;
  /** The command line as given, shell-quoted, with each secret value as ***. For display. */
  invocation: string;
  /**
   * The current command line as a next step: `flags` inserted before a `--` separator, each flag named in `drop`
   * removed, and the command path replaced by `command` when given. Each secret becomes a placeholder.
   */
  followUp(flags: string[], options: FollowUpOptions): NextStep;
  /** A next step that runs another command: the CLI name, then `words`. It does no redaction, so never pass a secret. */
  next(words: readonly NextWord[], why: string, options?: StepOptions): NextStep;
  /**
   * A next step that runs the command `command` (a command path of this CLI) with `input` as its input, written with
   * that command's flags so the parser reads `input` back. A `{ placeholder }` value and every secret become
   * placeholder words. Throws for an unknown command, or a key or a value its input schema refuses.
   */
  nextFor(command: string, input: Record<string, unknown>, why: string, options?: StepOptions): NextStep;
  cwd: string;
  /** Prompts are allowed. */
  interactive: boolean;
  format: 'text' | 'json';
  /** The run was given --yes: a change it plans is approved without a prompt. */
  yes: boolean;
  /** The run was given --approve <id>: a change it plans is applied only when its plan has that id. */
  approve?: string;
  /** Values of the CLI's own global flags. */
  globals: Record<string, unknown>;
  /** Use only when `interactive` is true. */
  prompter: Inquirerer;
  signal: AbortSignal;
  /** The stdin given to `run()` (default: the process's). The layer never reads it for the command. */
  stdin: Readable;
  stdout: Writable;
  stderr: Writable;
  /** The environment given to `run()` (default: the process's). */
  env: NodeJS.ProcessEnv;
}

export interface CommandResult<TData = unknown> {
  data: TData;
  /** Human rendering; a default renderer is used when omitted. */
  text?: string;
  next?: NextStep[];
  warnings?: string[];
}

interface CommandShape<TSchema extends InputSchema> {
  /** Space-separated path, for example 'table add'. */
  name: string;
  /** One line. */
  summary: string;
  description?: string;
  /** Each property is a flag. The layer parses the input with it once, so a command gets the parsed value. */
  input?: TSchema;
  /** Property names taken from positional args, in order. The last one, when it is a list, takes every argument left. */
  positionals?: string[];
  output?: z.ZodType;
  examples?: CommandExample[];
  /** Guidance for agents; shown in help and in the manifest. */
  notes?: string[];
  hidden?: boolean;
}

/** A command that changes nothing: the layer runs it at once. */
export interface ReadCommand<TSchema extends InputSchema = InputSchema, TData = unknown> extends CommandShape<TSchema> {
  effect: 'read';
  run(input: z.output<TSchema>, ctx: CommandContext): Promise<CommandResult<TData>> | CommandResult<TData>;
}

/**
 * What a change will do. `plan` is what a person approves: the layer prints it for --dry-run, puts it in
 * `error.details.plan` when the run stops for approval, and shows it before it asks. Any other key is what `apply`
 * needs to make exactly that change, and the layer never prints it.
 */
export interface Planned {
  plan: ConfirmPrompt;
  /**
   * Flags the run that applies this plan must add when it has no terminal, for example `--password-stdin` for a
   * secret a terminal would ask for. The layer adds them to the step it gives after --dry-run and after exit 3.
   */
  needs?: string[];
}

/**
 * A command that changes something. The layer calls `plan`, then decides: --dry-run returns the plan, --approve <id>
 * approves it while it is the plan with that id, --yes approves any plan, a terminal asks, and anything else stops with
 * exit 3. Only then does it call `apply`.
 */
export interface ChangeCommand<TSchema extends InputSchema = InputSchema, TData = unknown, TPlanned extends Planned = Planned> extends CommandShape<TSchema> {
  effect: 'write' | 'destructive';
  plan(input: z.output<TSchema>, ctx: CommandContext): Promise<TPlanned> | TPlanned;
  apply(input: z.output<TSchema>, planned: TPlanned, ctx: CommandContext): Promise<CommandResult<TData>> | CommandResult<TData>;
}

/**
 * A change that runs at once, with no plan: one the person makes to their own local session (sign in, sign out, choose
 * a context), or one that only narrows what an agent may do. The person typed it, and a script must be able to run it
 * as it is, so the layer refuses --dry-run, needs no --yes, and never asks. Only a write can be one, and a CLI keeps the
 * list of these short and fixed: every other change has a plan.
 */
export interface ImmediateCommand<TSchema extends InputSchema = InputSchema, TData = unknown> extends CommandShape<TSchema> {
  effect: 'write';
  immediate: true;
  run(input: z.output<TSchema>, ctx: CommandContext): Promise<CommandResult<TData>> | CommandResult<TData>;
}

/**
 * A command that speaks a protocol on its stdin and stdout (an MCP server), whose client approves each change it
 * makes, so the layer has no plan to show and refuses --dry-run and --yes. `effect` is the strongest effect its
 * client can reach. The layer writes none of its results, errors or warnings on stdout; they go to stderr in the run's
 * format. Help, --version, --schema and --llms, which a person asks for, still go to stdout.
 */
export interface ServeCommand<TSchema extends InputSchema = InputSchema> extends CommandShape<TSchema> {
  effect: Effect;
  stdout: 'reserved';
  serve(input: z.output<TSchema>, ctx: CommandContext): Promise<CommandResult<unknown>>;
}

/**
 * A command that keeps its own flags: `passthrough` gets every word after the command path, parsed by `parseArgv`, and
 * the layer reads none of them, --help and --schema included, so it has no plan either. Returning no data prints nothing.
 */
export interface PassthroughCommand {
  name: string;
  summary: string;
  description?: string;
  examples?: CommandExample[];
  notes?: string[];
  hidden?: boolean;
  effect: Effect;
  passthrough(argv: Record<string, unknown>, ctx: CommandContext): Promise<CommandResult<unknown> | undefined>;
}

export type CommandDefinition = ReadCommand<any, any> | ChangeCommand<any, any, any> | ImmediateCommand<any, any> | ServeCommand<any> | PassthroughCommand;

export const ExitCode = { ok: 0, failure: 1, usage: 2, approvalRequired: 3, signInRequired: 4, interrupted: 130 } as const;

/**
 * Every failure code the command layer answers, with one sentence: what it means for the caller, and the kind of
 * step that follows. The layer builds its errors only with these codes, so a new one needs its sentence to compile.
 */
export const COMMAND_ERROR_CODES = {
  'unknown-command': 'No command has these words, so nothing ran: the hint names the nearest one.',
  'unknown-topic': 'No command, group or help topic has this name, so nothing ran: the hint names the nearest one.',
  'unknown-flag': 'The command has no such flag, so nothing ran: the hint names the nearest one.',
  'unexpected-argument': 'The command takes fewer arguments, so nothing ran: pass the other values as flags.',
  'missing-input': 'A required value is missing and no prompt could ask, so nothing ran: error.details.missing names the flags.',
  'invalid-input': "A flag, an --input key or a value does not fit the command's schema, so nothing ran: see the command's --schema.",
  'dry-run-unsupported': 'The command changes at once or serves a protocol, so it has no plan and no dry run: run it without --dry-run.',
  'approval-required': 'There is no approval and no terminal to ask, so nothing changed: show error.details.plan to the person, then run the --approve step.',
  'plan-changed': 'The plan is no longer the one the --approve id names, so nothing changed: show the new error.details.plan to the person, then run its --approve step.',
  cancelled: 'A prompt got no answer (Ctrl-C exits 130, the end of input exits 1), or the person declined: nothing changed.',
  interrupted: 'The run got SIGINT, so a change may be partly made: check the state before you rerun.',
  failed: 'An unexpected error: the message is its own, and DEBUG=1 adds the stack to error.details.'
} as const satisfies Record<string, string>;

export type CommandErrorCode = keyof typeof COMMAND_ERROR_CODES;

/** `Code` is the code union of whoever throws the error: the layer's `CommandErrorCode`, or a host's own. */
export interface CliErrorInit<Code extends string = string> {
  code: Code;
  message: string;
  cause?: string;
  hint?: string;
  next?: NextStep[];
  retryable?: boolean;
  exitCode?: number;
  details?: unknown;
}

// A registered symbol, so that two installed copies of this package recognize each other's errors.
const CLI_ERROR_BRAND = Symbol.for('agentic-kit.CliError');

/** True for a CliError from any copy of this package: the brand plus the shape, never `instanceof`. */
export function isCliError(value: unknown): value is CliError {
  if (typeof value !== 'object' || value === null) return false;
  const error = value as Record<PropertyKey, unknown>;
  return error[CLI_ERROR_BRAND] === true && typeof error.code === 'string' && typeof error.message === 'string' && typeof error.exitCode === 'number';
}

export class CliError<Code extends string = string> extends Error {
  readonly code: Code;
  declare readonly cause?: string;
  readonly hint?: string;
  readonly next?: NextStep[];
  readonly retryable?: boolean;
  readonly exitCode: number;
  readonly details?: unknown;

  constructor(init: CliErrorInit<Code>) {
    super(init.message);
    Object.defineProperty(this, CLI_ERROR_BRAND, { value: true });
    this.name = 'CliError';
    this.code = init.code;
    this.cause = init.cause;
    this.hint = init.hint;
    this.next = init.next;
    this.retryable = init.retryable;
    this.exitCode = init.exitCode ?? ExitCode.failure;
    this.details = init.details;
  }
}

/** A section every reference has, which a topic can fill in place of a section of its own. */
export type ReferenceSection = 'EXIT STATUS' | 'ENVIRONMENT' | 'FILES';

/**
 * A page of help that is not a command: `<cli> help <name>` prints it, root help and --llms list it, the manifest
 * carries it, and the reference has it as a section. `body` is Markdown (paragraphs, lists and code, no headings), so
 * it reads the same on a terminal and in the reference.
 */
export interface HelpTopic {
  /** Lower-case words joined by "-", for example "exit-codes"; never the name of a command or of a group. */
  name: string;
  /** One line. */
  summary: string;
  body: string;
  section?: ReferenceSection;
}

export interface CliConfig {
  name: string;
  version: string;
  description?: string;
  commands: CommandDefinition[];
  /** The CLI's own global flags, for example --context. */
  globals?: InputSchema;
  /** The agent guidance block of the root help. */
  notes?: string[];
  topics?: HelpTopic[];
}

export interface CliIO {
  stdin?: Readable;
  stdout?: Writable;
  stderr?: Writable;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export interface CommandManifest {
  name: string;
  summary: string;
  description?: string;
  effect: Effect;
  positionals: string[];
  input?: JSONSchema;
  output?: JSONSchema;
  examples: CommandExample[];
  notes: string[];
  /** It keeps its own flags, and has no plan. */
  passthrough?: true;
  /** It changes at once, with no plan, and refuses --dry-run. */
  immediate?: true;
  /** It speaks a protocol on stdout, and has no plan: its client approves each change. */
  stdout?: 'reserved';
}

export interface CliManifest {
  name: string;
  version: string;
  description?: string;
  notes: string[];
  /** Flags every command accepts: the layer's own and the CLI's globals. Each property is a kebab-case flag. */
  globals: JSONSchema;
  commands: CommandManifest[];
  topics: HelpTopic[];
}

export interface Cli {
  run(argv?: string[], io?: CliIO): Promise<number>;
  manifest(): CliManifest;
}
