import {
  configureHost,
  constructiveDbTools,
  constructiveGateDeps,
  type ToolsHost
} from '@agentic-kit/db-tools';
import type { AnyHarnessTool, ConfirmGateOptions, GateHost } from '@agentic-kit/harness';
import { createConfirmGate } from '@agentic-kit/harness';

import { toDshTools } from './dsh-tool';
import type {
  DshApprovalService,
  DshPlugin,
  DshPluginContext,
  DshPreToolDecision
} from './dsh-types';

export interface ConstructivePluginOptions {
  /** Tools to register. Defaults to the whole `constructiveDbTools` set. */
  tools?: readonly AnyHarnessTool[];
  /**
   * The directory the run is rooted at — the project a tool resolves its
   * context and credentials from. Defaults to `process.cwd()`.
   */
  cwd?: () => string;
  /**
   * The gate in front of a mutating call. Defaults to Constructive's database
   * policy; pass `false` for a host that gates elsewhere (its own
   * `tools/pre-execute` listener, a hook, an approval preset).
   */
  gate?: ConfirmGateOptions | false;
  /** The db tools' host contract, when it is not configured already. */
  host?: ToolsHost;
}

export const DSH_PLUGIN_NAME = 'constructive-tools';

/**
 * Constructive's tools as a dsh plugin.
 *
 * The sibling of `@agentic-kit/pi`'s `dbTools` extension: the same neutral
 * tools, registered through dsh's own registry, with the same host-neutral
 * confirm gate wired to dsh's `tools/pre-execute` waterfall instead of pi's
 * `tool_call` event. Nothing Constructive-specific is duplicated — the tools,
 * the gate policy and the decline memory all come from the neutral packages.
 *
 * A `deny` decision is dsh's own vocabulary for "this call does not run, and
 * here is what to tell the model", which is exactly what the gate returns; an
 * approval question goes to dsh's approval service when the host composed one,
 * so a headless dsh run refuses a gated call rather than performing it
 * unasked.
 */
export function createConstructivePlugin(options: ConstructivePluginOptions = {}): DshPlugin {
  const cwd = options.cwd ?? (() => process.cwd());
  const tools = options.tools ?? constructiveDbTools;

  if (options.host) configureHost(options.host);

  return {
    name: DSH_PLUGIN_NAME,
    inject: ['tools'],
    apply(ctx: DshPluginContext): void {
      for (const definition of toDshTools(tools, { cwd })) {
        ctx.tools.register(definition);
      }

      if (options.gate === false) return;

      const gate = createConfirmGate(options.gate ?? constructiveGateDeps());

      ctx.on('tools/pre-execute', async (exec, next): Promise<DshPreToolDecision> => {
        const result = await gate.onToolCall(
          {
            toolName: exec.name,
            toolCallId: exec.callId,
            input: (exec.arguments ?? undefined) as Record<string, unknown> | undefined
          },
          approvalHost(ctx.approval, exec),
          cwd()
        );
        if (result?.block) return { kind: 'deny', reason: result.reason };
        return next();
      });
    }
  };
}

/**
 * dsh's approval service as the gate's host. `allowed-once` is the only
 * outcome that approves — `rejected`, `cancelled` and the fail-closed
 * `unavailable` all decline — and a host with no approval service composed has
 * no confirm surface at all, which the gate answers by blocking.
 */
function approvalHost(
  approval: DshApprovalService | undefined,
  exec: { callId: string; name: string; agent?: unknown }
): GateHost {
  return {
    hasUI: approval !== undefined,
    confirmTool: async (_toolCallId, title, message) => {
      if (!approval) return false;
      const outcome = await approval.request({
        toolName: exec.name,
        callId: exec.callId,
        reason: `${title}\n\n${message}`,
        ...(exec.agent === undefined ? {} : { agent: exec.agent })
      });
      return outcome === 'allowed-once';
    },
    // dsh records the ask and its outcome itself (`approval/asked`,
    // `approval/decided`), so an auto-skipped retry needs no separate notice.
    notifyToolSkipped: () => undefined
  };
}
