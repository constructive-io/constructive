import { assertPerfBenchmarkAllowed } from './src/ci-guard';
import { loadPerfConfig } from './src/config';
import { runPerfMatrix } from './src/matrix';

const config = loadPerfConfig();

jest.setTimeout(config.testTimeoutMs);

describe('graphql-server-test perf matrix benchmark', () => {
  it('runs the selected opt-in benchmark matrix', async () => {
    assertPerfBenchmarkAllowed();
    const summary = await runPerfMatrix(config);
    // eslint-disable-next-line no-console
    console.log(`perf summary: ${summary.artifacts.summaryPath}`);
    expect(summary.pass).toBe(true);
  });
});
