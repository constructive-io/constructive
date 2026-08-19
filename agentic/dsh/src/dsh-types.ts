/**
 * The DeepSeek Harness surface this adapter binds to, declared structurally.
 *
 * Nothing here imports `@deepseek-ai/dsh-*`, and the package has no dependency
 * on it. That is deliberate rather than lazy: dsh is a developer preview whose
 * packages promise breaking changes, and its published rc's trail its own
 * source. A structural declaration of the four things we actually touch — a
 * tool definition, a tool's run context, a content block, a plugin's `apply` —
 * binds to the *shape* dsh asks for, so a host on any rc can register our tools
 * without this package tracking their release train. It also keeps the adapter
 * free of dsh's ESM-only graph: a CJS consumer imports it like any other
 * agentic-kit package.
 *
 * Mirrored from dsh `0.1.0-rc.7` (`packages/core/tools`, `packages/core/session`,
 * `packages/llm/llm`). Where dsh brands a string (`CallId`, `SessionId`) this
 * uses `string` — a brand is theirs to enforce, and ours to carry.
 */

/** dsh's supported JSON Schema subset, as a tool declares its parameters. */
export interface DshJsonSchema {
  type?: string;
  properties?: Record<string, DshJsonSchema>;
  required?: string[];
  items?: DshJsonSchema;
  oneOf?: DshJsonSchema[];
  enum?: unknown[];
  const?: unknown;
  additionalProperties?: boolean;
  description?: string;
  title?: string;
  default?: unknown;
  examples?: unknown[];
}

/** A model-facing content block. dsh names reasoning `reasoning`, not `thinking`. */
export type DshContentBlock =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: string; [key: string]: unknown };

/**
 * What dsh hands a tool body: call identity, the caller's cancellation, and
 * the agent the call runs for. Notably *not* a working directory — dsh keeps
 * that on the session header and its filesystem service — so an adapter has to
 * supply one (see `ConstructivePluginOptions.cwd`).
 */
export interface DshToolRunContext {
  readonly callId: string;
  readonly name: string;
  readonly signal: AbortSignal;
  readonly agent?: unknown;
}

/** A tool's canonical-output contract: a schema for the value, and its rendering. */
export interface DshToolOutputDefinition {
  readonly schema: DshJsonSchema;
  render(args: unknown, value: unknown): DshContentBlock[];
}

/** A dsh tool, as `tools.register()` takes it. */
export interface DshToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: DshJsonSchema;
  readonly output: DshToolOutputDefinition;
  execute(args: unknown, exec: DshToolRunContext): Promise<unknown>;
}

/** The pending call a `tools/pre-execute` listener decides on. */
export interface DshToolExecution {
  readonly callId: string;
  readonly name: string;
  readonly arguments: unknown;
  readonly agent?: unknown;
}

/** dsh's pre-dispatch decision. `ask` defers to its approval answerers. */
export type DshPreToolDecision =
  | { kind: 'allow' }
  | { kind: 'deny'; reason: string }
  | { kind: 'ask'; reason?: string };

/** dsh's approval outcomes; only `allowed-once` is an approval. */
export type DshApprovalOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable';

/**
 * dsh's approval service, as much of it as a gate needs. Present on the plugin
 * context only when the host composed `@deepseek-ai/dsh-user-approval`.
 */
export interface DshApprovalService {
  request(request: {
    toolName: string;
    callId?: string;
    reason?: string;
    agent?: unknown;
  }): Promise<DshApprovalOutcome>;
}

/** The tool registry service (`ctx.tools`). */
export interface DshToolRuntime {
  register(definition: DshToolDefinition): () => void;
}

/**
 * The plugin context, narrowed to the services this adapter uses. dsh's own
 * `Context` carries every composed service and a cordis event bus; a plugin
 * only ever needs the parts it declared.
 */
export interface DshPluginContext {
  tools: DshToolRuntime;
  approval?: DshApprovalService;
  on(
    event: 'tools/pre-execute',
    listener: (
      exec: DshToolExecution,
      next: () => Promise<DshPreToolDecision>
    ) => Promise<DshPreToolDecision>
  ): unknown;
}

/** A cordis plugin in its object form, which is how dsh bundles load one. */
export interface DshPlugin {
  readonly name: string;
  readonly inject?: readonly string[];
  apply(ctx: DshPluginContext): void;
}
