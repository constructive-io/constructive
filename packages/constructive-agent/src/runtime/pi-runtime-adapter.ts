import type { StreamFn } from '@mariozechner/pi-agent-core';

import { DEFAULT_CAPABILITY_POLICY } from '../policy/default-policy';
import { StaticPolicyEngine } from '../policy/policy-engine';
import {
  DEFAULT_REDACTION_CONFIG,
  hashValue,
  redactValue,
  type RedactionConfig,
} from '../policy/redaction';
import {
  ensureMetricsRecorder,
  type MetricsRecorder,
} from '../observability/metrics';
import {
  ensureTraceSink,
  type TraceSink,
} from '../observability/tracing';
import type { PolicyEngine } from '../types/policy';
import type { AgentRunRecord } from '../types/run-state';
import type {
  AgentToolDefinition,
  ToolExecutionResult,
} from '../types/tools';
import type { ConstructiveAgentRunConfig } from '../types/config';
import type { RunController } from './run-controller';
import type { AgentRuntimeAdapter } from './create-agent-runner';

type PiModel = unknown;

type PiAiModule = {
  getModel: (provider: string, modelId: string) => PiModel | null;
  Type: {
    Object: (
      properties: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => unknown;
  };
};

type PiAgentCoreModule = {
  Agent: new (options: Record<string, unknown>) => PiAgent;
};

type PiToolResult = {
  content: Array<
    | {
        type: 'text';
        text: string;
      }
    | {
        type: 'image';
        data: string;
        mimeType: string;
      }
  >;
  details: Record<string, unknown>;
};

type PiToolDefinition = {
  name: string;
  label: string;
  description: string;
  parameters: unknown;
  execute: (
    toolCallId: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
    onUpdate?: (partialResult: PiToolResult) => void,
  ) => Promise<PiToolResult>;
};

type PiAgentEvent = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  partialResult?: Record<string, unknown>;
  isError?: boolean;
  result?: Record<string, unknown>;
  message?: {
    stopReason?: string;
  };
};

type PiAgent = {
  setTools(tools: PiToolDefinition[]): void;
  subscribe(listener: (event: PiAgentEvent) => void | Promise<void>): () => void;
  prompt(input: string): Promise<void>;
  abort(): void;
};

type CreatePiAgentInput = {
  model: PiModel;
  systemPrompt: string;
  thinkingLevel?: string;
  streamFn?: StreamFn;
  getApiKey?: (provider: string) => Promise<string | undefined> | string | undefined;
};

export interface PiRuntimeLoader {
  getModel(provider: string, modelId: string): PiModel | null;
  createAgent(input: CreatePiAgentInput): PiAgent;
  createAnyParametersSchema(): unknown;
}

const toPiTextContent = (value: unknown): PiToolResult['content'] => {
  if (Array.isArray(value)) {
    const isValidContentArray = value.every((item) => {
      if (!item || typeof item !== 'object') return false;
      if ((item as { type?: string }).type === 'text') {
        return typeof (item as { text?: unknown }).text === 'string';
      }
      if ((item as { type?: string }).type === 'image') {
        return (
          typeof (item as { data?: unknown }).data === 'string' &&
          typeof (item as { mimeType?: unknown }).mimeType === 'string'
        );
      }
      return false;
    });

    if (isValidContentArray) {
      return value as PiToolResult['content'];
    }
  }

  if (typeof value === 'string') {
    return [{ type: 'text', text: value }];
  }

  return [
    {
      type: 'text',
      text: JSON.stringify(value, null, 2),
    },
  ];
};

const toPiToolResult = (
  result: ToolExecutionResult,
): PiToolResult => {
  return {
    content: toPiTextContent(result.content),
    details:
      (result.details as Record<string, unknown> | undefined) ||
      { result: result.content },
  };
};

const stopReasonToTurnReason = (
  stopReason?: string,
): 'completed' | 'tool_use' | 'error' | 'aborted' => {
  if (stopReason === 'toolUse') return 'tool_use';
  if (stopReason === 'aborted') return 'aborted';
  if (stopReason === 'error') return 'error';
  return 'completed';
};

const dynamicImport = async <T>(
  specifier: string,
): Promise<T> => {
  const loader = Function(
    'modulePath',
    'return import(modulePath);',
  ) as (modulePath: string) => Promise<T>;
  return loader(specifier);
};

let defaultLoaderPromise: Promise<PiRuntimeLoader> | null = null;

const getDefaultPiRuntimeLoader = (): Promise<PiRuntimeLoader> => {
  if (defaultLoaderPromise) {
    return defaultLoaderPromise;
  }

  defaultLoaderPromise = (async () => {
    const ai = await dynamicImport<PiAiModule>('@mariozechner/pi-ai');
    const agentCore = await dynamicImport<PiAgentCoreModule>(
      '@mariozechner/pi-agent-core',
    );

    return {
      getModel(provider: string, modelId: string): PiModel | null {
        return ai.getModel(provider, modelId);
      },

      createAgent(input: CreatePiAgentInput): PiAgent {
        return new agentCore.Agent({
          initialState: {
            model: input.model,
            systemPrompt: input.systemPrompt,
            thinkingLevel: input.thinkingLevel || 'off',
            messages: [],
            tools: [],
          },
          streamFn: input.streamFn,
          getApiKey: input.getApiKey,
        });
      },

      createAnyParametersSchema(): unknown {
        return ai.Type.Object({}, { additionalProperties: true });
      },
    };
  })();

  return defaultLoaderPromise;
};

const toMetricTags = (
  input: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> | undefined => {
  const tags: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }
    tags[key] = value;
  }

  return Object.keys(tags).length > 0 ? tags : undefined;
};

export interface CreatePiRuntimeAdapterOptions {
  policyEngine?: PolicyEngine;
  loader?: PiRuntimeLoader;
  streamFn?: StreamFn;
  getApiKey?: (provider: string) => Promise<string | undefined> | string | undefined;
  redactionConfig?: RedactionConfig;
  metrics?: MetricsRecorder;
  traceSink?: TraceSink;
}

export function createPiRuntimeAdapter(
  options: CreatePiRuntimeAdapterOptions = {},
): AgentRuntimeAdapter {
  const policyEngine =
    options.policyEngine ||
    new StaticPolicyEngine(DEFAULT_CAPABILITY_POLICY, {
      action: 'deny',
      reason: 'No matching policy rule for capability.',
      riskClass: 'high',
    });
  const redactionConfig = options.redactionConfig || DEFAULT_REDACTION_CONFIG;
  const metrics = ensureMetricsRecorder(options.metrics);
  const traceSink = ensureTraceSink(options.traceSink);

  return {
    async execute(
      run: AgentRunRecord,
      controller: RunController,
      config: ConstructiveAgentRunConfig,
      signal?: AbortSignal,
    ): Promise<void> {
      const loader = options.loader || (await getDefaultPiRuntimeLoader());

      const model = loader.getModel(
        config.model.provider,
        config.model.model,
      );

      if (!model) {
        throw new Error(
          `Unable to resolve model ${config.model.provider}/${config.model.model}`,
        );
      }

      const runtimeStartedAt = Date.now();
      metrics.increment(
        'constructive_agent.runtime.execute.started',
        1,
        toMetricTags({
          model_provider: config.model.provider,
          model_name: config.model.model,
        }),
      );
      traceSink.record({
        type: 'run_start',
        timestamp: runtimeStartedAt,
        context: {
          runId: run.id,
        },
        attributes: {
          modelProvider: config.model.provider,
          modelName: config.model.model,
        },
      });

      let turnIndex = 0;
      const turnIds = new Map<number, string>();
      let toolCallCount = 0;
      const toolCallStartedAt = new Map<string, number>();

      const failRun = async (
        code: string,
        message: string,
      ): Promise<void> => {
        const currentRun = await controller.getRun(run.id);
        if (!currentRun) {
          return;
        }

        if (
          currentRun.status === 'failed' ||
          currentRun.status === 'aborted' ||
          currentRun.status === 'completed'
        ) {
          return;
        }

        metrics.increment(
          'constructive_agent.runtime.failures',
          1,
          toMetricTags({
            code,
          }),
        );
        await controller.recordError(run.id, code, message);
      };

      const buildPiTool = (
        tool: AgentToolDefinition,
      ): PiToolDefinition => {
        return {
          name: tool.name,
          label: tool.label,
          description: tool.description,
          parameters:
            tool.parameters || loader.createAnyParametersSchema(),
          execute: async (
            _toolCallId: string,
            args: Record<string, unknown>,
            abortSignal?: AbortSignal,
            onUpdate?: (partialResult: PiToolResult) => void,
          ): Promise<PiToolResult> => {
            const startedAt = Date.now();
            toolCallCount += 1;

            if (
              config.limits?.maxToolCalls &&
              toolCallCount > config.limits.maxToolCalls
            ) {
              const message = `Tool call limit exceeded (${config.limits.maxToolCalls})`;
              await failRun('TOOL_LIMIT_EXCEEDED', message);
              throw new Error(message);
            }

            const currentRun = await controller.getRun(run.id);

            if (!currentRun) {
              throw new Error(`Run ${run.id} not found`);
            }

            const decision = await policyEngine.evaluate({
              run: currentRun,
              tool,
              invocation: {
                toolName: tool.name,
                args,
              },
            });

            metrics.increment(
              'constructive_agent.policy.decision',
              1,
              toMetricTags({
                action: decision.action,
                capability: tool.capability,
                risk_class: decision.riskClass,
              }),
            );
            traceSink.record({
              type: 'policy_decision',
              timestamp: Date.now(),
              context: {
                runId: run.id,
              },
              attributes: {
                toolName: tool.name,
                action: decision.action,
                reason: decision.reason,
                riskClass: decision.riskClass,
              },
            });

            await controller.appendEvent(run.id, 'policy_decision', {
              toolName: tool.name,
              decision,
            });

            if (decision.action === 'deny') {
              const message = `Policy denied tool ${tool.name}: ${decision.reason}`;
              await failRun('POLICY_DENY', message);
              metrics.increment(
                'constructive_agent.tool.denied',
                1,
                toMetricTags({
                  tool_name: tool.name,
                }),
              );
              throw new Error(message);
            }

            if (decision.action === 'needs_approval') {
              const argsHash = hashValue(args);
              const existingApproval = await controller.findApprovalByInvocation(
                run.id,
                tool.name,
                argsHash,
              );

              if (existingApproval?.status === 'rejected') {
                const message = `Approval rejected for ${tool.name}`;
                await failRun('APPROVAL_REJECTED', message);
                throw new Error(message);
              }

              if (existingApproval?.status === 'applied') {
                const message = `Approval for ${tool.name} already applied`;
                await failRun('APPROVAL_ALREADY_APPLIED', message);
                throw new Error(message);
              }

              if (existingApproval?.status === 'approved') {
                await controller.markApprovalApplied(run.id, existingApproval.id);
              } else {
                if (!existingApproval) {
                  await controller.requestApproval({
                    runId: run.id,
                    toolName: tool.name,
                    capability: tool.capability,
                    riskClass: decision.riskClass,
                    argsHash,
                    argsRedacted: (redactValue(
                      args,
                      redactionConfig,
                    ) || {}) as Record<string, unknown>,
                    reason: decision.reason,
                  });
                  metrics.increment(
                    'constructive_agent.approval.requested',
                    1,
                    toMetricTags({
                      tool_name: tool.name,
                      capability: tool.capability,
                      risk_class: decision.riskClass,
                    }),
                  );
                }

                await controller.transitionStatus(run.id, 'needs_approval');
                throw new Error(
                  `Tool ${tool.name} requires approval: ${decision.reason}`,
                );
              }
            }

            try {
              const result = await tool.execute(
                args,
                {
                  runId: run.id,
                  actorId: run.actorId,
                  tenantId: run.tenantId,
                  identity: config.identity,
                  metadata: config.metadata,
                },
                abortSignal,
                (partialResult) => {
                  if (onUpdate) {
                    onUpdate(toPiToolResult(partialResult));
                  }
                },
              );

              metrics.increment(
                'constructive_agent.tool.executions',
                1,
                toMetricTags({
                  tool_name: tool.name,
                  status: 'success',
                }),
              );

              return toPiToolResult(result);
            } catch (error) {
              metrics.increment(
                'constructive_agent.tool.executions',
                1,
                toMetricTags({
                  tool_name: tool.name,
                  status: 'failure',
                }),
              );
              throw error;
            } finally {
              metrics.timing(
                'constructive_agent.tool.duration_ms',
                Date.now() - startedAt,
                toMetricTags({
                  tool_name: tool.name,
                }),
              );
            }
          },
        };
      };

      const piTools = config.tools.map(buildPiTool);

      const agent = loader.createAgent({
        model,
        systemPrompt: config.model.systemPrompt,
        thinkingLevel: config.model.thinkingLevel,
        streamFn: options.streamFn,
        getApiKey: options.getApiKey,
      });

      agent.setTools(piTools);

      const unsubscribe = agent.subscribe(async (event) => {
        if (event.type === 'turn_start') {
          turnIndex += 1;

          if (config.limits?.maxTurns && turnIndex > config.limits.maxTurns) {
            const message = `Turn limit exceeded (${config.limits.maxTurns})`;
            await failRun('TURN_LIMIT_EXCEEDED', message);
            agent.abort();
            return;
          }

          const turnId = `turn-${turnIndex}`;
          turnIds.set(turnIndex, turnId);
          await controller.appendEvent(run.id, 'turn_start', {
            turnId,
          });
          traceSink.record({
            type: 'turn_start',
            timestamp: Date.now(),
            context: {
              runId: run.id,
              turnId,
            },
          });
          return;
        }

        if (event.type === 'turn_end') {
          const turnId = turnIds.get(turnIndex) || `turn-${turnIndex}`;
          await controller.appendEvent(run.id, 'turn_end', {
            turnId,
            reason: stopReasonToTurnReason(event.message?.stopReason),
          });
          traceSink.record({
            type: 'turn_end',
            timestamp: Date.now(),
            context: {
              runId: run.id,
              turnId,
            },
            attributes: {
              reason: stopReasonToTurnReason(event.message?.stopReason),
            },
          });
          return;
        }

        if (event.type === 'tool_execution_start') {
          const toolCallId = event.toolCallId || 'unknown';
          toolCallStartedAt.set(toolCallId, Date.now());
          const tool = config.tools.find(
            (entry) => entry.name === event.toolName,
          );

          await controller.appendEvent(run.id, 'tool_call_start', {
            toolCallId,
            toolName: event.toolName || 'unknown',
            capability: tool?.capability || 'unknown',
            args: (redactValue(
              event.args || {},
              redactionConfig,
            ) || {}) as Record<string, unknown>,
          });
          traceSink.record({
            type: 'tool_execution_start',
            timestamp: Date.now(),
            context: {
              runId: run.id,
              toolCallId,
            },
            attributes: {
              toolName: event.toolName || 'unknown',
            },
          });
          return;
        }

        if (event.type === 'tool_execution_update') {
          await controller.appendEvent(run.id, 'tool_call_update', {
            toolCallId: event.toolCallId || 'unknown',
            update: (redactValue(
              event.partialResult || {},
              redactionConfig,
            ) || {}) as Record<string, unknown>,
          });
          return;
        }

        if (event.type === 'tool_execution_end') {
          const toolCallId = event.toolCallId || 'unknown';
          await controller.appendEvent(run.id, 'tool_call_end', {
            toolCallId,
            toolName: event.toolName || 'unknown',
            success: event.isError !== true,
            result: (redactValue(
              event.result || {},
              redactionConfig,
            ) || {}) as Record<string, unknown>,
          });

          traceSink.record({
            type: 'tool_execution_end',
            timestamp: Date.now(),
            context: {
              runId: run.id,
              toolCallId,
            },
            attributes: {
              toolName: event.toolName || 'unknown',
              success: event.isError !== true,
            },
          });

          const startedAt = toolCallStartedAt.get(toolCallId);
          if (startedAt) {
            metrics.timing(
              'constructive_agent.runtime.tool_event.duration_ms',
              Date.now() - startedAt,
              toMetricTags({
                tool_name: event.toolName || 'unknown',
                success: event.isError !== true,
              }),
            );
            toolCallStartedAt.delete(toolCallId);
          }
        }
      });

      let timeoutHandle: NodeJS.Timeout | undefined;
      let timedOut = false;

      if (config.limits?.maxRuntimeMs && config.limits.maxRuntimeMs > 0) {
        timeoutHandle = setTimeout(() => {
          timedOut = true;
          agent.abort();
        }, config.limits.maxRuntimeMs);
      }

      if (signal) {
        signal.addEventListener('abort', () => agent.abort(), {
          once: true,
        });
      }

      try {
        await agent.prompt(config.prompt);

        const currentRun = await controller.getRun(run.id);
        if (!currentRun) {
          return;
        }

        if (currentRun.status === 'needs_approval') {
          metrics.increment('constructive_agent.runtime.status.needs_approval');
          return;
        }

        if (timedOut) {
          await controller.transitionStatus(run.id, 'aborted');
          metrics.increment('constructive_agent.runtime.status.aborted');
          return;
        }

        if (currentRun.status === 'running') {
          await controller.transitionStatus(run.id, 'completed');
          metrics.increment('constructive_agent.runtime.status.completed');
        }
      } catch (error) {
        const currentRun = await controller.getRun(run.id);

        if (
          currentRun?.status === 'needs_approval' ||
          currentRun?.status === 'failed' ||
          currentRun?.status === 'aborted'
        ) {
          return;
        }

        if (timedOut || signal?.aborted) {
          if (currentRun?.status === 'running') {
            await controller.transitionStatus(run.id, 'aborted');
            metrics.increment('constructive_agent.runtime.status.aborted');
          }
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Unknown PI runtime error';
        metrics.increment('constructive_agent.runtime.errors', 1, toMetricTags({
          code: 'PI_RUNTIME_ERROR',
        }));
        await controller.recordError(run.id, 'PI_RUNTIME_ERROR', message);
      } finally {
        const finalRun = await controller.getRun(run.id);
        metrics.increment(
          'constructive_agent.runtime.execute.finished',
          1,
          toMetricTags({
            status: finalRun?.status || 'unknown',
          }),
        );
        metrics.timing(
          'constructive_agent.runtime.execute.duration_ms',
          Date.now() - runtimeStartedAt,
          toMetricTags({
            status: finalRun?.status || 'unknown',
          }),
        );

        if (finalRun?.status === 'completed' || finalRun?.status === 'failed' || finalRun?.status === 'aborted') {
          traceSink.record({
            type: 'run_end',
            timestamp: Date.now(),
            context: {
              runId: run.id,
            },
            attributes: {
              status: finalRun.status,
            },
          });
        }

        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        unsubscribe();
      }
    },
  };
}
