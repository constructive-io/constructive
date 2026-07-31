import type { ConfirmPreview } from '@agentic-kit/harness';
import {
  type ConfirmGate as HarnessConfirmGate,
  createConfirmGate as createHarnessConfirmGate,
  type GateHost,
} from '@agentic-kit/harness';
import type {
  ExtensionContext,
  ToolCallEvent,
  ToolCallEventResult,
} from '@earendil-works/pi-coding-agent';

import type { resolveDataToken, resolveProjectContext } from './context';
import type { createTemplatePreviewTables } from './tools/templates';

// Hosts with a rich confirm surface (e.g. Constructive Desktop's extension-ui)
// extend pi's ExtensionUIContext with these members; when present they take
// precedence over pi's built-in ui.confirm dialog.
type RichConfirmUi = {
  confirmTool?: (
    toolCallId: string,
    title: string,
    message: string,
    preview?: ConfirmPreview,
  ) => Promise<boolean>;
  notifyToolSkipped?: (toolCallId: string) => void;
};

// Thin pi adapter over the host-neutral gate in @agentic-kit/harness: pi's
// ToolCallEvent/ExtensionContext are mapped onto the package's
// GateToolCallEvent/GateHost, and the host-backed resolvers below are
// wrapped into its ConfirmGateDeps. index.ts wires the real resolvers, tests
// substitute fakes.
export type ConfirmGateDeps = {
  resolveProjectContext: typeof resolveProjectContext;
  resolveDataToken: typeof resolveDataToken;
  createTemplatePreviewTables: typeof createTemplatePreviewTables;
};

export type ConfirmGate = {
  onAgentStart: () => void;
  onToolCall: (
    event: ToolCallEvent,
    ctx: ExtensionContext,
  ) => Promise<ToolCallEventResult | undefined>;
};

export function createConfirmGate(deps: ConfirmGateDeps): ConfirmGate {
  const gate: HarnessConfirmGate = createHarnessConfirmGate({
    isProjectRunnable: async (cwd) => {
      const resolved = await deps.resolveProjectContext(cwd);
      return resolved.context !== null;
    },
    hasDataToken: async (cwd) => {
      const resolved = await deps.resolveProjectContext(cwd);
      if (!resolved.context) return false;
      const token = await deps.resolveDataToken(resolved.context);
      return Boolean(token.token);
    },
    resolveTemplatePreview: async (cwd, blueprintName, displayName) => {
      const resolved = await deps.resolveProjectContext(cwd);
      if (!resolved.context) return undefined;
      const result = await deps.createTemplatePreviewTables(resolved.context, blueprintName);
      if (result.tables.length === 0) return undefined;
      return {
        kind: 'template',
        displayName,
        blueprintName: result.blueprintName || undefined,
        tables: result.tables,
      };
    },
  });

  return {
    onAgentStart: gate.onAgentStart,

    onToolCall: async (event, ctx) => {
      const ui = ctx.ui as ExtensionContext['ui'] & RichConfirmUi;
      const host: GateHost = {
        hasUI: ctx.hasUI,
        confirmTool: (toolCallId, title, message, preview) =>
          ui.confirmTool
            ? ui.confirmTool(toolCallId, title, message, preview)
            : ui.confirm(title, message),
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
