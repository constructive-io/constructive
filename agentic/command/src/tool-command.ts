import {
  type AnyHarnessTool,
  callChange,
  type GateDecision,
  type GatePolicy,
  type HarnessTool,
  type HarnessToolContent,
  type HarnessToolResult,
  recordApprovedTable,
  type ToolCallSuggestion,
  type ToolFailure,
  type ToolFailureCode
} from '@agentic-kit/harness';
import { randomUUID } from 'crypto';
import { z } from 'zod';

import {
  type ChangeCommand,
  CliError,
  type CommandContext,
  type CommandExample,
  type CommandResult,
  ExitCode,
  type InputSchema,
  type NextStep,
  type Planned,
  type ReadCommand,
  type StepOptions
} from './types';

interface ToolCommandBase<TParams, TDetails> {
  /** Space-separated command path, for example 'table add'. */
  name: string;
  /** Default: the tool's label. */
  summary?: string;
  /** Default: the tool's description. */
  description?: string;
  positionals?: string[];
  examples?: CommandExample[];
  notes?: string[];
  /** Default: the tool's text content. */
  text?(details: TDetails): string;
  /** The commands to run after a call that succeeded; build each with `ctx.next`. */
  next?(details: TDetails, params: TParams, ctx: CommandContext): NextStep[];
  /**
   * This command's input for a call of its tool that a tool suggests (the inverse of `mapInput`), or undefined when
   * this command cannot make that call. Without it, the call's params are the input when this command takes each of
   * them as an input property.
   */
  toInput?(params: Record<string, unknown>): Record<string, unknown> | undefined;
}

/** A command bound to a tool, for writing the calls a tool suggests as next steps. */
export interface ToolBinding {
  /** The command path, for example 'field update'. */
  command: string;
  /** Its input properties. */
  properties: ReadonlySet<string>;
  toInput?(params: Record<string, unknown>): Record<string, unknown> | undefined;
}

/** The command takes the tool's own params as its input, or a friendlier input that `mapInput` turns into them. */
type ToolCommandInput<TInput extends InputSchema, TParams> =
  | { input?: never; mapInput?: never }
  | { input: TInput; mapInput(input: z.output<TInput>, ctx: CommandContext): TParams | Promise<TParams> };

export type ToolCommandOptions<TInput extends InputSchema, TParams, TDetails> = ToolCommandBase<TParams, TDetails> & ToolCommandInput<TInput, TParams>;

export interface ToolCommandDeps {
  gate: GatePolicy;
  /** The next steps of a failed or blocked call, by its failure. */
  failureNext?: FailureNext;
  /** Tool name to every command bound to it, in the order a call of the tool is tried on them. */
  bindings?: ReadonlyMap<string, readonly ToolBinding[]>;
  /** Told about a suggested call no bound command can make: a bug in a tool or a binding, which a test should fail on. */
  onUnrenderedCall?(call: ToolCallSuggestion, reason: string): void;
}

/** One tool command, before the CLI is built; `toolCommand` keeps the tool's types for `mapInput`, `text` and `next`. */
export interface ToolCommandEntry {
  tool: AnyHarnessTool;
  options: ToolCommandOptions<any, any, any>;
}

/** The tool's params as a command input: a zod object, whose properties become flags. */
function paramsOf(tool: AnyHarnessTool): InputSchema {
  const params = tool.parameters as unknown;
  if (params instanceof z.ZodObject) return params;
  throw new Error(`The tool "${tool.name}" takes params that are not a zod object, so they cannot be a command's flags. Give the command an input and a mapInput.`);
}

const inputOf = (options: ToolCommandOptions<any, any, any>, tool: AnyHarnessTool): InputSchema => options.input ?? paramsOf(tool);

const propertiesOf = (schema: InputSchema): string[] => Object.keys(schema.shape);

const pathText = (path: readonly PropertyKey[]): string =>
  path.reduce<string>((text, key) => (typeof key === 'number' ? `${text}[${key}]` : text ? `${text}.${String(key)}` : String(key)), '');

function parseParams<TSchema extends z.ZodType>(schema: TSchema, raw: unknown, usage: string, schemaStep: NextStep): z.output<TSchema> {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const issues = parsed.error.issues.map((issue) => ({ path: pathText(issue.path), message: issue.message }));
  const listed = issues.map((issue) => `${issue.path || 'the input'}: ${issue.message}`).join('; ');
  throw new CliError({
    code: 'invalid-input',
    message: `The input of "${usage}" is not valid: ${listed}.`,
    hint: `Fix each listed value. Run "${usage} --schema" to see the input.`,
    next: [schemaStep],
    exitCode: ExitCode.usage,
    details: { issues }
  });
}

type Renderer = Pick<ToolCommandDeps, 'bindings' | 'onUnrenderedCall'>;

/**
 * A suggested call as a next step of this CLI, made by the first command bound to its tool that takes its input
 * (`toInput`, or the same names), with a placeholder for each input left to choose. A call no command can make gives
 * no step, so a run never fails on it; `onUnrenderedCall` hears about it.
 */
function rendered(call: ToolCallSuggestion, ctx: CommandContext, deps: Renderer, options?: StepOptions): NextStep | undefined {
  const params = { ...call.input, ...Object.fromEntries((call.choose ?? []).map((name) => [name, { placeholder: name }])) };
  const reasons: string[] = [];
  for (const binding of deps.bindings?.get(call.tool) ?? []) {
    const input = binding.toInput
      ? binding.toInput(params)
      : Object.keys(params).every((key) => binding.properties.has(key))
        ? params
        : undefined;
    if (!input) {
      reasons.push(`"${binding.command}" does not take ${Object.keys(params).join(', ') || 'this call'}`);
      continue;
    }
    try {
      return ctx.nextFor(binding.command, input, call.why, options);
    } catch (error) {
      reasons.push(`"${binding.command}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  deps.onUnrenderedCall?.(call, reasons.join('; ') || `no command is bound to the tool ${call.tool}`);
  return undefined;
}

const stepsFor = (calls: readonly ToolCallSuggestion[] | undefined, ctx: CommandContext, deps: ToolCommandDeps): NextStep[] =>
  (calls ?? []).map((call) => rendered(call, ctx, deps)).filter((step): step is NextStep => step !== undefined);

/** The steps in order, each command once: the first one keeps its reason. */
function unique(...lists: NextStep[][]): NextStep[] {
  const seen = new Set<string>();
  return lists.flat().filter((step) => !seen.has(step.command) && Boolean(seen.add(step.command)));
}

function textOf(content: HarnessToolContent[]): string | undefined {
  const parts = content.flatMap((part) => (part.type === 'text' ? [part.text] : []));
  return parts.length ? parts.join('\n') : undefined;
}

const FAILURE_EXIT_CODES: Partial<Record<ToolFailureCode, number>> = {
  'signed-out': ExitCode.signInRequired,
  'step-up-required': ExitCode.signInRequired,
  'app-signed-out': ExitCode.signInRequired,
  'invalid-input': ExitCode.usage
};

/** The commands that follow a failure in this run: the CLI knows them, the tools do not. */
export type FailureNext = (failure: ToolFailure, ctx: CommandContext) => NextStep[];

// The failure's own record, which a CliError has no field for: the id to
// report for a masked error, and the backend's public context.
function withFailureRecord(failure: ToolFailure, details: unknown): unknown {
  const record = {
    ...(failure.errorId ? { errorId: failure.errorId } : {}),
    ...(failure.context ? { context: failure.context } : {})
  };
  if (Object.keys(record).length === 0) return details;
  if (details === undefined) return record;
  // Details that are not an object have no place for the keys, so they stay as they are.
  return typeof details === 'object' && details !== null && !Array.isArray(details) ? { ...details, ...record } : details;
}

/**
 * A tool's or the gate's failure as the error of the command. Its `details`
 * are the given details with the failure's `errorId` and `context`, when it
 * has them. `next` are the commands to run after it.
 */
export function failureError(failure: ToolFailure, details?: unknown, next: NextStep[] = []): CliError {
  return new CliError({
    code: failure.code,
    message: failure.message,
    hint: failure.hint,
    retryable: failure.retryable,
    exitCode: FAILURE_EXIT_CODES[failure.code] ?? ExitCode.failure,
    ...(next.length ? { next } : {}),
    details: withFailureRecord(failure, details)
  });
}

/** The plan of a tool change: the gate's plan, and the params `apply` calls the tool with. */
interface ToolPlanned<TParams> extends Planned {
  params: TParams;
}

/**
 * Binds `tool` to a command. A read runs the tool. A change plans with the gate (a blocked call stops with the gate's
 * failure, under --dry-run too), and the layer applies it only once the run approves that plan.
 */
export function toCliCommand<TSchema extends z.ZodType, TDetails, TInput extends InputSchema = InputSchema>(
  tool: HarnessTool<TSchema, TDetails>,
  options: ToolCommandOptions<TInput, z.output<TSchema>, TDetails>,
  deps: ToolCommandDeps
): ReadCommand | ChangeCommand<InputSchema, unknown, any> {
  const input = inputOf(options, tool);
  type Params = z.output<TSchema>;
  // Without mapInput the input is the tool's own params, which the layer has parsed already.
  const paramsFor = async (given: Record<string, unknown>, ctx: CommandContext): Promise<Params> => {
    if (!options.mapInput) return given as unknown as Params;
    const usage = `${ctx.cliName} ${options.name}`;
    return parseParams(tool.parameters, await options.mapInput(given as z.output<TInput>, ctx), usage, ctx.next([...options.name.split(' '), '--schema'], 'See every input property'));
  };
  // The calls a failure suggests come first, then the CLI's own steps for its code.
  const failureNext = (failure: ToolFailure, ctx: CommandContext): NextStep[] =>
    unique(stepsFor(failure.calls, ctx, deps), deps.failureNext?.(failure, ctx) ?? []);
  const finish = (result: HarnessToolResult<TDetails>, params: Params, ctx: CommandContext): CommandResult<unknown> => {
    if (result.failure) throw failureError(result.failure, result.details, failureNext(result.failure, ctx));
    const content = textOf(result.content);
    const next = unique(stepsFor(result.calls, ctx, deps), options.next?.(result.details, params, ctx) ?? []);
    return {
      data: result.details,
      text: options.text ? options.text(result.details) : content,
      ...(next.length ? { next } : {})
    };
  };
  const shape = {
    name: options.name,
    summary: options.summary ?? tool.label,
    description: options.description ?? tool.description,
    input,
    positionals: options.positionals,
    examples: options.examples,
    notes: options.notes
  };
  if (tool.effect === 'read') {
    const read: ReadCommand = {
      ...shape,
      effect: 'read',
      async run(given, ctx) {
        const params = await paramsFor(given, ctx);
        return finish(await tool.execute(params, { cwd: ctx.cwd, signal: ctx.signal }), params, ctx);
      }
    };
    return read;
  }
  const change: ChangeCommand<InputSchema, unknown, ToolPlanned<Params>> = {
    ...shape,
    effect: tool.effect,
    async plan(given, ctx) {
      const params = await paramsFor(given, ctx);
      const called = await callChange(tool, params as Record<string, unknown>, deps.gate, ctx.cwd);
      const decision = (called as { decision: GateDecision }).decision;
      if (decision.kind === 'blocked') throw failureError(decision.failure, undefined, failureNext(decision.failure, ctx));
      return { plan: decision.prompt, params };
    },
    async apply(_given, { params, plan }, ctx) {
      const toolCallId = randomUUID();
      recordApprovedTable(toolCallId, ctx.cwd, plan.target);
      return finish(await tool.execute(params, { cwd: ctx.cwd, toolCallId, signal: ctx.signal }), params, ctx);
    }
  };
  return change;
}

/** One entry for `toCliCommands`, typed by its tool. */
export function toolCommand<TSchema extends z.ZodType, TDetails, TInput extends InputSchema = InputSchema>(
  tool: HarnessTool<TSchema, TDetails>,
  options: ToolCommandOptions<TInput, z.output<TSchema>, TDetails>
): ToolCommandEntry {
  return { tool, options };
}

// A call of a tool bound to several commands is tried first on one that takes the tool's own params, which can make any call of it.
const inBindingOrder = (entries: readonly ToolCommandEntry[]): ToolCommandEntry[] =>
  [...entries.filter((entry) => !entry.options.input), ...entries.filter((entry) => entry.options.input)];

/** Tool name to every command bound to it, in the order a call of the tool is tried on them. */
function bindingsOf(entries: readonly ToolCommandEntry[]): Map<string, ToolBinding[]> {
  const bindings = new Map<string, ToolBinding[]>();
  for (const { tool, options } of inBindingOrder(entries)) {
    bindings.set(tool.name, [
      ...(bindings.get(tool.name) ?? []),
      {
        command: options.name,
        properties: new Set(propertiesOf(inputOf(options, tool))),
        ...(options.toInput ? { toInput: options.toInput } : {})
      }
    ]);
  }
  return bindings;
}

/** A tool call written as a next step of this CLI, or undefined when no command bound to its tool can make it. */
export type ToolCallStep = (call: ToolCallSuggestion, ctx: CommandContext, options?: StepOptions) => NextStep | undefined;

/**
 * Writes any tool call as a command of this CLI, from the same bindings and by the same rule as the next steps of
 * the commands `toCliCommands` builds from `entries`. `options` go on to `ctx.nextFor` (`{ drop: ['--as'] }`).
 */
export function toolCallStep(
  entries: readonly ToolCommandEntry[],
  deps: { onUnrenderedCall?(call: ToolCallSuggestion, reason: string): void } = {}
): ToolCallStep {
  const renderer: Renderer = { bindings: bindingsOf(entries), onUnrenderedCall: deps.onUnrenderedCall };
  return (call, ctx, options) => rendered(call, ctx, renderer, options);
}

/** Every tool command of a CLI, each of which writes a call any tool of the set suggests as a step of the command bound to that tool. */
export function toCliCommands(
  entries: readonly ToolCommandEntry[],
  deps: {
    gate: GatePolicy;
    failureNext?: FailureNext;
    onUnrenderedCall?(call: ToolCallSuggestion, reason: string): void;
  }
): Array<ReadCommand | ChangeCommand<InputSchema, unknown, any>> {
  const bindings = bindingsOf(entries);
  return entries.map(({ tool, options }) => toCliCommand(tool, options, { gate: deps.gate, bindings, failureNext: deps.failureNext, onUnrenderedCall: deps.onUnrenderedCall }));
}
