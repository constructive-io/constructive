import type { BenchmarkContext, MatrixCase, PerfRunConfig } from './types';

export const resetBenchmarkOwnedState = async (_input: {
  context: BenchmarkContext;
  matrixCase: MatrixCase;
  config: PerfRunConfig;
}): Promise<{ ok: boolean; hardGateFailures: string[] }> => {
  return { ok: true, hardGateFailures: [] };
};
