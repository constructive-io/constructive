import type { ResetResult } from './reset';
import type {
  LoadReport,
  MemoryCaptureResult,
  PublicPreflightResult,
  RouteProbeSummary,
} from './types';

export const evaluateCaseGates = (input: {
  preflight?: PublicPreflightResult;
  routeProbe: RouteProbeSummary;
  load?: LoadReport;
  memoryBefore?: MemoryCaptureResult;
  memoryAfter?: MemoryCaptureResult;
  resetBefore?: ResetResult;
  resetAfter?: ResetResult;
  reportWritten?: boolean;
  captureMemory: boolean;
}): { hardGateFailures: string[]; observations: Record<string, unknown> } => {
  const failures: string[] = [];
  const { preflight, routeProbe, load, memoryBefore, memoryAfter, resetBefore, resetAfter } = input;

  if (preflight && !preflight.ok) {
    failures.push(...preflight.hardGateFailures.map((failure) => `preflight: ${failure}`));
  }
  if (!routeProbe.ok) failures.push('route probes failed');
  if (routeProbe.unexpectedGraphqlErrors !== 0) failures.push('route probes returned unexpected GraphQL errors');

  if (load) {
    if (load.failedRequests !== 0) failures.push(`measured load had ${load.failedRequests} failed requests`);
    if (load.unexpectedGraphqlErrors !== 0) {
      failures.push(`measured load had ${load.unexpectedGraphqlErrors} unexpected GraphQL errors`);
    }
    if (load.failFast?.triggered) failures.push(`fail-fast triggered: ${load.failFast.reason || 'unknown reason'}`);
  }

  if (input.captureMemory) {
    if (memoryBefore && !memoryBefore.ok) failures.push(`memory before snapshot ${memoryBefore.status}`);
    if (memoryAfter && !memoryAfter.ok) failures.push(`memory after snapshot ${memoryAfter.status}`);
  }

  if (resetBefore && !resetBefore.ok) failures.push('benchmark-owned reset before load failed');
  if (resetAfter && !resetAfter.ok) failures.push('benchmark-owned reset after load failed');
  if (input.reportWritten === false) failures.push('case report was not written');

  return {
    hardGateFailures: failures,
    observations: {
      qps: load?.qps,
      latencyMs: load?.latencyMs,
      totalRequests: load?.totalRequests,
      failedRequests: load?.failedRequests,
      memoryBeforeStatus: memoryBefore?.status,
      memoryAfterStatus: memoryAfter?.status,
      resetBeforeDeletedRows: resetBefore?.deletedRows,
      resetAfterDeletedRows: resetAfter?.deletedRows,
    },
  };
};
