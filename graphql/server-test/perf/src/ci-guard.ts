export const enforcePerfOptIn = (env: NodeJS.ProcessEnv = process.env): void => {
  if (env.PERF_BENCHMARK !== '1') {
    throw new Error('Refusing to run perf benchmarks. Set PERF_BENCHMARK=1 to opt in.');
  }

  if (env.CI === 'true' && env.ALLOW_PERF_IN_CI !== '1') {
    throw new Error(
      'Refusing to run perf benchmarks in CI. Set ALLOW_PERF_IN_CI=1 only for an explicit perf CI job.'
    );
  }
};
