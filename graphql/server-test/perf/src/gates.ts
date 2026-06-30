import type { LoadReport, MemoryCaseArtifacts, RouteProbeSummary } from './types';

export const collectHardGateFailures = (input: {
  setupFailures?: string[];
  routeProbe?: RouteProbeSummary;
  load?: LoadReport;
  memory?: MemoryCaseArtifacts;
  captureMemory: boolean;
  reportsWritten?: boolean;
}): string[] => {
  const failures = [...(input.setupFailures || [])];

  if (input.routeProbe) {
    if (!input.routeProbe.ok) failures.push('route probe failed');
    if (input.routeProbe.unexpectedGraphqlErrors !== 0) failures.push('route probe returned unexpected GraphQL errors');
  }

  if (input.load) {
    if (input.load.failedRequests !== 0) failures.push(`measured load had ${input.load.failedRequests} failed requests`);
    if (input.load.unexpectedGraphqlErrors !== 0) {
      failures.push(`measured load had ${input.load.unexpectedGraphqlErrors} unexpected GraphQL errors`);
    }
    if (input.load.failFast?.triggered) failures.push(input.load.failFast.reason || 'fail-fast triggered');
  }

  if (input.captureMemory && input.memory) {
    if (!input.memory.beforeOk) failures.push('memory before capture failed');
    if (!input.memory.afterOk) failures.push('memory after capture failed');
  }

  if (input.reportsWritten === false) failures.push('case report write failed');

  return failures;
};
