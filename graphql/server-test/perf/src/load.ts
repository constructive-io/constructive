import { executeOperation, compatibleOperationsFor } from './operations';
import { summarizeOutcomes } from './stats';
import type {
  BenchmarkContext,
  LoadReport,
  MatrixCase,
  PerfRunConfig,
  RequestOutcome,
  RequestProfile,
  RuntimeOperationProfile,
} from './types';

const shouldFailFast = (outcomes: RequestOutcome[]): string | undefined => {
  const failed = outcomes.filter((outcome) => !outcome.ok).length;
  const graphqlErrors = outcomes.reduce((sum, outcome) => sum + outcome.unexpectedGraphqlErrors, 0);
  const httpFailures = outcomes.filter((outcome) => outcome.status != null && (outcome.status < 200 || outcome.status >= 300)).length;
  const networkFailures = outcomes.filter((outcome) => outcome.status == null && !outcome.ok).length;
  const total = outcomes.length;

  if (networkFailures >= 5) return `network failures reached ${networkFailures}`;
  if (httpFailures >= 5) return `HTTP failures reached ${httpFailures}`;
  if (graphqlErrors >= 5) return `unexpected GraphQL errors reached ${graphqlErrors}`;
  if (total >= 10 && failed / total > 0.5) return `failure rate exceeded 50% (${failed}/${total})`;
  return undefined;
};

export const runLoad = async (input: {
  context: BenchmarkContext;
  matrixCase: MatrixCase;
  config: PerfRunConfig;
  requestProfiles: RequestProfile[];
  operationProfiles: RuntimeOperationProfile[];
}): Promise<LoadReport> => {
  const { context, matrixCase, config, requestProfiles, operationProfiles } = input;
  const durationSeconds = matrixCase.scaleProfile.durationSeconds;
  const workers = Math.max(1, matrixCase.scaleProfile.workers);
  const stopAt = Date.now() + durationSeconds * 1000;
  const outcomes: RequestOutcome[] = [];
  let sequence = 0;
  let failFast: { triggered: boolean; reason?: string } = { triggered: false };

  const worker = async (workerId: number): Promise<void> => {
    while (Date.now() < stopAt && !failFast.triggered) {
      const current = sequence++;
      const requestProfile = requestProfiles[current % requestProfiles.length];
      const compatible = compatibleOperationsFor(requestProfile, operationProfiles);
      const bag = compatible.flatMap((operation) => Array(Math.max(1, Math.floor(operation.weight))).fill(operation));
      const operation = bag[(current + workerId) % bag.length];
      if (!operation) break;
      const outcome = await executeOperation({
        context,
        requestProfile,
        operation,
        sequence: current,
        config,
        matrixCase,
      });
      outcomes.push(outcome);

      if (config.failFast) {
        const reason = shouldFailFast(outcomes);
        if (reason) failFast = { triggered: true, reason };
      }
    }
  };

  await Promise.all(Array.from({ length: workers }, (_, index) => worker(index)));

  return summarizeOutcomes({
    outcomes,
    durationSeconds,
    workers,
    failFast,
    errorSampleLimit: config.errorSampleLimit,
  });
};
