import { toRedactedErrorSample } from './artifacts';
import type {
  BenchmarkContext,
  MatrixCase,
  PerfRunConfig,
  RedactedErrorSample,
  RequestProfile,
} from './types';

export const preparePublicBusinessWorkload = async (input: {
  context: BenchmarkContext;
  matrixCase: MatrixCase;
  config: PerfRunConfig;
  requestProfiles: RequestProfile[];
}): Promise<{
  ok: boolean;
  requestProfiles: RequestProfile[];
  touchedNonBenchmarkObjects: boolean;
  errors: RedactedErrorSample[];
}> => {
  const errors: RedactedErrorSample[] = [];
  for (const profile of input.requestProfiles) {
    if (!profile.benchmarkOwned || profile.metadata.source !== 'constructive-local-dbpm-graphql') {
      errors.push(toRedactedErrorSample(`Public workload profile is not benchmark-owned: ${profile.id}`, {
        operation: 'public.setup.scopeGuard',
        requestProfileId: profile.id,
      }) as RedactedErrorSample);
    }
  }

  return {
    ok: errors.length === 0,
    requestProfiles: input.requestProfiles,
    touchedNonBenchmarkObjects: errors.length > 0,
    errors,
  };
};
