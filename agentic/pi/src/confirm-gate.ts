import { constructiveGateDeps, type ConstructiveGateResolvers } from '@agentic-kit/db-tools';
import { type ConfirmPreview, type PlanTarget, planTargetLines } from '@agentic-kit/harness';
import {
  type ConfirmGate as HarnessConfirmGate,
  createConfirmGate as createHarnessConfirmGate,
  type GateHost,
  type GatePolicy,
} from '@agentic-kit/harness';
import type {
  ExtensionContext,
  ToolCallEvent,
  ToolCallEventResult,
} from '@earendil-works/pi-coding-agent';

// Hosts with a rich confirm surface (e.g. Constructive Desktop's extension-ui)
// extend pi's ExtensionUIContext with these members; when present they take
// precedence over pi's built-in ui.confirm dialog.
type RichConfirmUi = {
  confirmTool?: (
    toolCallId: string,
    title: string,
    message: string,
    preview?: ConfirmPreview,
    target?: PlanTarget,
  ) => Promise<boolean>;
  notifyToolSkipped?: (toolCallId: string) => void;
};

// Thin pi adapter over the host-neutral gate in @agentic-kit/harness: pi's
// ToolCallEvent/ExtensionContext are mapped onto the package's
// GateToolCallEvent/GateHost, and the host-backed resolvers below become its
// deps through db-tools' `constructiveGateDeps`, which gates by the db tools'
// effects and blocks a call whose own first check fails. index.ts passes none,
// so the tools' own checks apply; tests substitute fakes.
export type ConfirmGateDeps = Partial<ConstructiveGateResolvers>;

/**
 * Constructive's database deps, or a `GatePolicy` of the host's own — a pi
 * host with no Constructive project (a remote coding job gating `bash`) has
 * nothing to give the former.
 */
export type ConfirmGateOptions = ConfirmGateDeps | { policy: GatePolicy };

export type ConfirmGate = {
  onAgentStart: () => void;
  onToolCall: (
    event: ToolCallEvent,
    ctx: ExtensionContext,
  ) => Promise<ToolCallEventResult | undefined>;
};

export function createConfirmGate(options: ConfirmGateOptions): ConfirmGate {
  const gate: HarnessConfirmGate = createHarnessConfirmGate(
    'policy' in options ? options : constructiveGateDeps(options),
  );

  return {
    onAgentStart: gate.onAgentStart,

    onToolCall: async (event, ctx) => {
      const ui = ctx.ui as ExtensionContext['ui'] & RichConfirmUi;
      const host: GateHost = {
        hasUI: ctx.hasUI,
        confirmTool: (toolCallId, title, message, preview, target) =>
          ui.confirmTool
            ? ui.confirmTool(toolCallId, title, message, preview, target)
            : ui.confirm(title, [...planTargetLines(target), '', message].join('\n')),
        notifyToolSkipped: (toolCallId) => ui.notifyToolSkipped?.(toolCallId),
      };
      return gate.onToolCall(
        {
          toolName: event.toolName,
          toolCallId: event.toolCallId,
          input: event.input as Record<string, unknown> | undefined,
        },
        host,
        ctx.cwd,
      );
    },
  };
}
