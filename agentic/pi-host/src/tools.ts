// Putting the harness gate in front of the agent's tools.
//
// `createConfirmGate` is the harness's, unchanged: its policy decides which calls
// are gated (by the effect its deps report), writes the prompt, and remembers
// declines so a retry is skipped rather than re-asked. All this adds is the seam — the gate
// runs inside `execute`, and a blocked call returns the gate's reason to the
// model as an ordinary tool result, which is how the model learns it was
// declined.

import type { AgentTool, AgentToolResult } from '@agentic-kit/agent';
import type { ConfirmGate, ConfirmGateDeps, GateHost } from '@agentic-kit/harness';
import { createConfirmGate } from '@agentic-kit/harness';

export interface GatedToolsetOptions {
  tools: AgentTool[];
  host: GateHost;
  /** The directory the gate's project checks are about. */
  cwd: string;
  /** Supply a gate to test against; defaults to the harness's. */
  gate?: ConfirmGate;
  /**
   * The harness gate's project questions. A coding lane whose cwd is a git
   * clone answers "not a Constructive project" — see `project-context.ts`.
   */
  deps?: ConfirmGateDeps;
}

export interface GatedToolset {
  tools: AgentTool[];
  /** Call before each run: clears the decline memory. */
  onAgentStart: () => void;
}

/**
 * The gate's deps for a workspace that is a git clone, not a Constructive
 * project. Its lane carries no Constructive db tool, so no tool has an effect
 * this policy gates.
 */
export const CLONE_GATE_DEPS: ConfirmGateDeps = {
  effectOf: () => undefined,
  // No tool has an effect here, so nothing is gated and this never runs.
  precondition: async () => ({
    kind: 'blocked',
    failure: { code: 'unsupported', message: 'A git clone workspace has no Constructive database to act on.' }
  }),
  resolveTemplatePreview: async () => undefined
};

export function createGatedToolset(options: GatedToolsetOptions): GatedToolset {
  const gate = options.gate ?? createConfirmGate(options.deps ?? CLONE_GATE_DEPS);
  const { host, cwd } = options;

  const tools = options.tools.map((tool): AgentTool => ({
    ...tool,
    execute: async (toolCallId, params, decision, signal, onUpdate) => {
      const blocked = await gate.onToolCall(
        { toolName: tool.name, toolCallId, input: params },
        host,
        cwd
      );
      if (blocked) return blockedResult(blocked.reason);
      return tool.execute(toolCallId, params, decision, signal, onUpdate);
    }
  }));

  return { tools, onAgentStart: gate.onAgentStart };
}

function blockedResult(reason: string): AgentToolResult {
  return { content: [{ type: 'text', text: reason }] };
}
