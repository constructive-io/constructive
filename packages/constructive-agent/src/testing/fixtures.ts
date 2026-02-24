import type { ConstructiveAgentRunConfig } from '../types/config';

export function createRunConfigFixture(
  overrides: Partial<ConstructiveAgentRunConfig> = {},
): ConstructiveAgentRunConfig {
  return {
    model: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      systemPrompt: 'You are a safe assistant.',
      thinkingLevel: 'off',
    },
    identity: {
      actorId: 'actor-test',
      accessToken: 'test-token',
      tenantId: 'tenant-test',
    },
    prompt: 'Test prompt',
    tools: [],
    metadata: {
      source: 'fixture',
    },
    ...overrides,
  };
}
