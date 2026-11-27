import {
  type AnyHarnessTool,
  callChange,
  type Change,
  type ConfirmPrompt,
  failureText,
  type GatePolicy,
  type HarnessToolContent,
  type HarnessToolResult,
  normalizeToolParams,
  renderPlan,
  type ToolCallSuggestion,
  type ToolFailure
} from '@agentic-kit/harness';
import {
  type CallToolResult,
  CLIENT_CAPABILITIES_META_KEY,
  type ClientCapabilities,
  inputRequired,
  type InputRequiredResult,
  inputResponse,
  McpServer,
  type ServerContext,
  type ToolAnnotations
} from '@modelcontextprotocol/server';
import { serveStdio as serveSdkStdio, type StdioServerHandle, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { Writable } from 'stream';
import { z } from 'zod';

export interface McpToolsOptions {
  /** The server's name and version, as `initialize` reports them. */
  name: string;
  version: string;
  tools: readonly AnyHarnessTool[];
  /** Makes the plan of each write call, and stops a call that cannot run. */
  gate: GatePolicy;
  /** The project directory the tools act on. */
  cwd: string;
  /**
   * true serves the tools whose effect is `read`. false serves those and the tools whose effect is `write`, each marked
   * for the host to ask the person before every call. A tool whose effect is `destructive` is served in neither mode.
   */
  readOnly: boolean;
  /** The host's own guidance for the agent (who it acts as, for example), sent after the server's instructions. */
  instructions?: string;
}

const READ_ANNOTATIONS: ToolAnnotations = { readOnlyHint: true };
// MCP reads destructiveHint: false as "only adds" and idempotentHint: true as "a second call changes nothing more". A
// write may change or replace what exists (set_access replaces a table's rules), and the tool object promises neither.
const WRITE_ANNOTATIONS: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: false };
// Claude Code asks the person before every call of a tool with this key, in every permission mode, and denies the call where no one can answer.
const WRITE_META = { 'anthropic/requiresUserInteraction': true };

const isServed = (tool: AnyHarnessTool, readOnly: boolean): boolean => tool.effect === 'read' || (tool.effect === 'write' && !readOnly);

/**
 * The schema the SDK checks a call with: the tool's parameters behind the
 * harness's null rule (null for an optional key that does not take null is not
 * given). A preprocess step has no JSON Schema of its own, so tools/list shows
 * the parameters as they are.
 */
function inputSchemaOf(tool: AnyHarnessTool): z.ZodType<Record<string, unknown>, unknown> {
  if (tool.parameters._zod.def.type !== 'object') {
    throw new Error(`The tool "${tool.name}" takes parameters that are not an object, and an MCP tool's input must be one. Wrap them in z.object().`);
  }
  const parameters = tool.parameters as z.ZodObject;
  return z.preprocess((value) => normalizeToolParams(parameters, value), parameters);
}

const toolList = (tools: readonly AnyHarnessTool[]): string => {
  const names = tools.map((tool) => tool.name);
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/** What the agent reads when it connects: which tools read and which change things, how a change is approved, then the host's own guidance. */
function serverInstructions(served: readonly AnyHarnessTool[], readOnly: boolean, host: string | undefined): string {
  const reads = toolList(served.filter((tool) => tool.effect === 'read'));
  const own = readOnly
    ? [
      `This server serves only tools that read, so nothing changes through it: ${reads}.`,
      'For a change, tell the person what to change, so that they can make it themselves.'
    ]
    : [
      `Call the read tools first, to learn the current state before you change anything: ${reads}.`,
      `These tools change things: ${toolList(served.filter((tool) => tool.effect === 'write'))}.`,
      'In hosts that support it, the host asks the person to approve each call of them before it runs, so tell the person what a call will change before you make it.',
      'A call the host lets through runs once, and its result says what changed and gives the plan it applied.',
      'Tools that can lose data or delete what the person set up are not served here: the person makes those changes themselves.'
    ];
  return [own.join(' '), host].filter(Boolean).join('\n\n');
}

/** What a failed call returns as data: the failure without its calls, which sit beside it. */
type ErrorData = Pick<ToolFailure, 'message' | 'hint' | 'retryable' | 'errorId' | 'context'> & { code: string };

const errorData = (failure: ErrorData): ErrorData => Object.fromEntries(
  (['code', 'message', 'hint', 'retryable', 'errorId', 'context'] as const).flatMap((key) => (failure[key] === undefined ? [] : [[key, failure[key]]]))
) as ErrorData;

const callsData = (calls: ToolCallSuggestion[] | undefined) => (calls?.length ? { calls } : {});

const content = (parts: HarnessToolContent[]): CallToolResult['content'] => parts.map((part) => ({ ...part }));

/** A result of this server: its envelope `{ ok, data?, error?, plan?, calls? }` is always an object. */
type ToolCallResult = CallToolResult & { structuredContent: Record<string, unknown> };

function failed(failure: ErrorData & { calls?: ToolCallSuggestion[] }, data?: unknown, parts?: HarnessToolContent[]): ToolCallResult {
  return {
    content: parts?.length ? content(parts) : [{ type: 'text', text: failureText(failure as ToolFailure) }],
    structuredContent: { ok: false, error: errorData(failure), ...(data === undefined ? {} : { data }), ...callsData(failure.calls) },
    isError: true
  };
}

function toolResult(result: HarnessToolResult): ToolCallResult {
  if (result.failure) return failed(result.failure, result.details, result.content);
  return { content: content(result.content), structuredContent: { ok: true, data: result.details, ...callsData(result.calls) } };
}

/** The id the server logged a GraphQL error under, from the errors a thrown client error keeps. */
function errorIdOf(error: unknown): string | undefined {
  const errors = (error as { errors?: unknown } | null)?.errors;
  if (!Array.isArray(errors)) return undefined;
  return errors.map((entry) => (entry as { extensions?: { errorId?: unknown } } | null)?.extensions?.errorId).find((id): id is string => typeof id === 'string');
}

/** A tool that threw: its text can carry the server's own words, so the result says only which tool failed, with the logged error's id. */
function thrown(tool: AnyHarnessTool, error: unknown): ToolCallResult {
  const errorId = errorIdOf(error);
  const again = tool.effect === 'read' ? 'Call it again once' : 'Read the current state before you call it again, since part of the change may have been made';
  const after = errorId ? 'give the error id to the backend operator: it names the logged error' : 'tell the person which tool failed';
  return failed({
    code: 'failed',
    message: `The tool ${tool.name} failed with an unexpected error, whose text is not shown.${errorId ? ` Error id: ${errorId}.` : ''}`,
    hint: `${again}; if it fails again, ${after}.`,
    ...(errorId ? { errorId } : {})
  });
}

/** A write's result with the plan it was made from: as text after the tool's own, and as data beside the envelope's. */
const withPlan = (result: ToolCallResult, plan: ConfirmPrompt): ToolCallResult => ({
  ...result,
  content: [...result.content, { type: 'text', text: `The plan of this call:\n${renderPlan(plan)}` }],
  structuredContent: { ...result.structuredContent, plan }
});

const APPLY = 'apply';
// The host's own prompt is the approval, so the preview starts ticked and an accepted form applies the change.
const APPLY_FIELD = { type: 'boolean', title: 'Apply this change', default: true } as const;

type PreviewAnswer = { action: 'accept' | 'decline' | 'cancel'; apply: boolean };

const NOT_APPLIED: Record<PreviewAnswer['action'], string> = {
  accept: 'The person unticked "Apply this change" when its plan was shown, so nothing was changed.',
  decline: 'The person declined the change when its plan was shown, so nothing was changed.',
  cancel: 'The plan was closed without an answer, so nothing was changed.'
};

function previewQuestion(plan: ConfirmPrompt): InputRequiredResult {
  return inputRequired({
    inputRequests: {
      [APPLY]: inputRequired.elicit({
        mode: 'form',
        message: renderPlan(plan),
        requestedSchema: {
          type: 'object',
          properties: { [APPLY]: APPLY_FIELD },
          required: [APPLY]
        }
      })
    }
  });
}

function previewAnswer(ctx: ServerContext): PreviewAnswer | null {
  const view = inputResponse(ctx.mcpReq.inputResponses, APPLY);
  if (view.kind !== 'elicit') return null;
  return { action: view.action, apply: view.action === 'accept' && (view.content?.[APPLY] ?? APPLY_FIELD.default) === true };
}

/** The client's capabilities for this request: its envelope on the 2026 era, its `initialize` on a 2025-era connection. */
function clientCapabilities(server: McpServer, ctx: ServerContext): ClientCapabilities | undefined {
  const envelope = ctx.mcpReq.envelope as Record<string, unknown> | undefined;
  return envelope ? (envelope[CLIENT_CAPABILITIES_META_KEY] as ClientCapabilities | undefined) : server.server.getClientCapabilities();
}

// A bare `elicitation: {}` is the 2025 form of declaring form mode, as the SDK reads it.
function supportsFormElicitation(capabilities: ClientCapabilities | undefined): boolean {
  const elicitation = capabilities?.elicitation as { form?: unknown; url?: unknown } | undefined;
  return elicitation !== undefined && (elicitation.form !== undefined || elicitation.url === undefined);
}

/**
 * A read runs. A write runs on the call the host let through, because the host
 * is the one that asks the person (WRITE_META). The gate makes its plan first
 * and stops a call that cannot run. A client that can show questions is shown
 * the plan once, as a preview: a decline there changes nothing. A client that
 * cannot gets no question.
 */
function handlerFor(tool: AnyHarnessTool, server: McpServer, options: McpToolsOptions) {
  return async (params: Record<string, unknown>, ctx: ServerContext): Promise<CallToolResult | InputRequiredResult> => {
    const run = async (): Promise<ToolCallResult> => {
      try {
        return toolResult(await tool.execute(params, { cwd: options.cwd, signal: ctx.mcpReq.signal }));
      } catch (error) {
        return thrown(tool, error);
      }
    };
    let change: Change;
    try {
      change = await callChange(tool, params, options.gate, options.cwd);
    } catch (error) {
      return thrown(tool, error);
    }
    if (change.effect === 'read') return run();
    if (change.decision.kind === 'blocked') return failed(change.decision.failure);
    const plan = change.decision.prompt;
    if (supportsFormElicitation(clientCapabilities(server, ctx))) {
      const answer = previewAnswer(ctx);
      if (!answer) return previewQuestion(plan);
      if (!answer.apply) {
        const hint = 'Do not make this change again unless the person asks for it.';
        return withPlan(failed({ code: 'cancelled', message: NOT_APPLIED[answer.action], hint }), plan);
      }
    }
    return withPlan(await run(), plan);
  };
}

/** A factory of MCP servers that serve `tools`, one server per connection (or per request on HTTP). */
export function createMcpServerFactory(options: McpToolsOptions): () => McpServer {
  const served = options.tools.filter((tool) => isServed(tool, options.readOnly));
  const schemas = served.map(inputSchemaOf);
  const instructions = serverInstructions(served, options.readOnly, options.instructions);
  return () => {
    const server = new McpServer({ name: options.name, version: options.version }, { capabilities: { tools: {} }, instructions });
    served.forEach((tool, index) => {
      const write = tool.effect === 'write';
      server.registerTool(
        tool.name,
        {
          title: tool.label,
          description: tool.description,
          annotations: write ? WRITE_ANNOTATIONS : READ_ANNOTATIONS,
          ...(write ? { _meta: WRITE_META } : {}),
          inputSchema: schemas[index]
        },
        handlerFor(tool, server, options)
      );
    });
    return server;
  };
}

/**
 * The process's stdout, for the protocol alone. Every other write to
 * `process.stdout` (console.log among them) goes to stderr from here on. A
 * child process that inherits file descriptor 1 still writes past this.
 */
function protocolStdout(): Writable {
  const stdout = process.stdout;
  const write = stdout.write.bind(stdout) as (chunk: unknown, encoding: BufferEncoding, callback: (error?: Error | null) => void) => boolean;
  stdout.write = process.stderr.write.bind(process.stderr) as typeof stdout.write;
  const protocol = new Writable({
    write(chunk, encoding, callback) {
      write(chunk, encoding, callback);
    }
  });
  stdout.on('error', (error) => protocol.destroy(error));
  return protocol;
}

/** A server on this process's stdio. `closed` settles when the client closes stdin or `close()` ends the connection. */
export interface McpStdioServer {
  close(): Promise<void>;
  closed: Promise<void>;
}

/** Serves `tools` over this process's stdin and stdout, on both protocol eras. */
export function serveStdio(options: McpToolsOptions): McpStdioServer {
  let ended: () => void;
  const closed = new Promise<void>((resolve) => {
    ended = resolve;
  });
  process.stdin.once('end', () => ended()).once('close', () => ended());
  const handle: StdioServerHandle = serveSdkStdio(createMcpServerFactory(options), {
    transport: new StdioServerTransport(process.stdin, protocolStdout())
  });
  return {
    close: async () => {
      await handle.close();
      ended();
    },
    closed
  };
}
