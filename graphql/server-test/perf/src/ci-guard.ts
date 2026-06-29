export class PerfGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PerfGuardError';
  }
}

const isCi = (value: string | undefined): boolean => {
  if (!value) return false;
  return !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
};

export const assertPerfBenchmarkAllowed = (env: NodeJS.ProcessEnv = process.env): void => {
  if (env.PERF_BENCHMARK !== '1') {
    throw new PerfGuardError(
      'Refusing to run graphql/server-test perf benchmarks: set PERF_BENCHMARK=1 to opt in.'
    );
  }

  if (isCi(env.CI) && env.ALLOW_PERF_IN_CI !== '1') {
    throw new PerfGuardError(
      'Refusing to run graphql/server-test perf benchmarks in CI: set ALLOW_PERF_IN_CI=1 for an explicit CI perf job.'
    );
  }
};
