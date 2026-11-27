import { randomUUID } from 'crypto';

import type { AnyHarnessTool, ToolFailure } from '../tools/tool';
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
 * What happens to a gated call. `ask` puts the prompt in front of a human,
 * and the call runs only if they approve. `blocked` stops the call with the
 * failure, which says what is missing and the next step; the tool is not
 * called. No decision lets a gated call run unasked.
 */
export type GateDecision =
  | { kind: 'ask'; prompt: ConfirmPrompt }
  | { kind: 'blocked'; failure: ToolFailure };

/**
 * The host's answer to "which calls need a human decision, and what do we show
 * the human?". Everything tool-specific lives here — which calls are gated
 * and the wording of the confirmation — so the gate itself stays host-neutral
 * and only owns the mechanics (decline memory, headless blocking, prompting).
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
   * The decision on a gated call. It may do I/O: it checks what the tool
   * checks before it changes anything, so a call that cannot run is blocked
   * with the tool's own failure instead of asking the human first.
   */
  resolvePrompt(event: GateToolCallEvent, cwd: string): Promise<GateDecision>;
};

/** A call's effect and, for a change, the gate policy's decision on it. A change never comes without a decision. */
export type Change = { effect: 'read' } | { effect: 'write' | 'destructive'; decision: GateDecision };

/**
 * What one call of `tool` with `params` is, for a host to apply its own approval to: a read runs, and any other
 * call carries the gate's decision (ask, or blocked with the tool's own failure). The effect comes from the tool
 * object, and the gate is asked about that tool, never about a name a host parsed.
 */
export async function callChange(tool: AnyHarnessTool, params: Record<string, unknown>, gate: GatePolicy, cwd: string): Promise<Change> {
  const { effect } = tool;
  if (effect === 'read') return { effect };
  return { effect, decision: await gate.resolvePrompt({ toolName: tool.name, toolCallId: randomUUID(), input: params }, cwd) };
}
