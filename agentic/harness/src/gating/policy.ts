import type { ConfirmPrompt } from './preview';

/**
 * What the gate knows about a tool call. Hosts map their agent's event shape
 * onto this (pi's `ToolCallEvent`, an MCP request, …).
 */
export type GateToolCallEvent = {
  toolName: string;
  toolCallId: string;
  input?: Record<string, unknown>;
};

/**
 * The host's answer to "which calls need a human decision, and what do we show
 * the human?". Everything tool-specific lives here — which tool names are
 * gated, which arguments turn a gated name into a harmless read, and the
 * wording of the confirmation — so the gate itself stays host-neutral and only
 * owns the mechanics (decline memory, headless blocking, prompting).
 *
 * `createConstructiveGatePolicy` is the Constructive database policy the
 * Desktop/CLI hosts use; a remote coding host supplies its own.
 */
export type GatePolicy = {
  /**
   * Whether this call needs a human decision at all. Cheap and synchronous:
   * it runs before the decline memory and the headless block, so it must
   * decide from the tool name and arguments alone — no I/O.
   */
  isGated(event: GateToolCallEvent): boolean;
  /**
   * The prompt to put in front of the user, or `null` to let an already-gated
   * call through without one. Runs only for gated calls on a host with a
   * confirm surface, so it may do I/O to build a richer preview or to check a
   * precondition that makes the confirm pointless (e.g. the call is going to
   * fail with "sign in first" anyway).
   */
  resolvePrompt(event: GateToolCallEvent, cwd: string): Promise<ConfirmPrompt | null>;
};
