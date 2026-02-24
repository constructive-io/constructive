import type { ThinkingLevel } from '@mariozechner/pi-agent-core';

import type { AgentToolDefinition } from './tools';

export interface AgentModelConfig {
  provider: string;
  model: string;
  thinkingLevel?: ThinkingLevel;
  systemPrompt: string;
}

export interface AgentIdentityContext {
  actorId: string;
  accessToken: string;
  graphqlEndpoint?: string;
  tenantId?: string;
  databaseId?: string;
  apiName?: string;
  metaSchema?: string;
  ipAddress?: string;
  origin?: string;
  userAgent?: string;
}

export interface RunLimits {
  maxTurns?: number;
  maxToolCalls?: number;
  maxRuntimeMs?: number;
}

export interface ConstructiveAgentRunConfig {
  runId?: string;
  model: AgentModelConfig;
  identity: AgentIdentityContext;
  prompt: string;
  tools: AgentToolDefinition<any, any>[];
  metadata?: Record<string, unknown>;
  limits?: RunLimits;
}
