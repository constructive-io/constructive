import type { BenchmarkContext, MatrixCase, PerfRunConfig, RedactedErrorSample } from './types';

export interface ResetResult {
  ok: boolean;
  skipped: boolean;
  deletedRows?: number;
  errors: RedactedErrorSample[];
}

export const resetBenchmarkOwnedData = async (input: {
  context: BenchmarkContext;
  matrixCase: MatrixCase;
  config: PerfRunConfig;
}): Promise<ResetResult> => {
  void input.context;
  void input.matrixCase;
  void input.config;

  // The current constructive-local DBPM public workload provisions case-scoped,
  // benchmark-owned tenant databases/tables and uses read/list operations only.
  // The temp database is dropped during context teardown, so no SQL reset is
  // required between cases.
  return { ok: true, skipped: true, errors: [] };
};
