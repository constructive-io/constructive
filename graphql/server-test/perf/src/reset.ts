import { toRedactedErrorSample } from './artifacts';
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
  const { context, matrixCase, config } = input;
  if (!matrixCase.mutates) return { ok: true, skipped: true, errors: [] };

  const prefix = `${config.benchmarkOwnedPrefix}_${matrixCase.caseId}_%`;
  try {
    const result = await context.conn.pg.query(
      'DELETE FROM "simple-pets-pets-public".animals WHERE name LIKE $1',
      [prefix]
    );
    return { ok: true, skipped: false, deletedRows: result.rowCount ?? 0, errors: [] };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      errors: [
        toRedactedErrorSample(error, { operation: 'reset.benchmarkOwnedAnimals' }) as RedactedErrorSample,
      ],
    };
  }
};
