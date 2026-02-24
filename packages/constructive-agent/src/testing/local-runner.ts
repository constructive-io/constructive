import { HeadlessAgentService } from '../adapters/headless/service';
import {
  createAgentRunner,
  type AgentRunner,
} from '../runtime/create-agent-runner';
import { createPiRuntimeAdapter } from '../runtime/pi-runtime-adapter';
import type { ConstructiveAgentRunConfig } from '../types/config';

export interface LocalRunnerOptions {
  streamFn?: Parameters<typeof createPiRuntimeAdapter>[0]['streamFn'];
  getApiKey?: Parameters<typeof createPiRuntimeAdapter>[0]['getApiKey'];
}

export interface LocalRunner {
  runner: AgentRunner;
  service: HeadlessAgentService;
}

export function createLocalRunner(
  options: LocalRunnerOptions = {},
): LocalRunner {
  const runtimeAdapter = createPiRuntimeAdapter({
    streamFn: options.streamFn,
    getApiKey: options.getApiKey,
  });

  const runner = createAgentRunner({
    runtimeAdapter,
  });

  const service = new HeadlessAgentService(runner);

  return {
    runner,
    service,
  };
}

export async function runLocal(
  config: ConstructiveAgentRunConfig,
  options: LocalRunnerOptions = {},
): Promise<Awaited<ReturnType<HeadlessAgentService['startRun']>> & {
  events: Awaited<ReturnType<AgentRunner['getEvents']>>;
}> {
  const local = createLocalRunner(options);
  const run = await local.service.startRun(config);
  const events = await local.runner.getEvents(run.id);

  return {
    ...run,
    events,
  };
}
