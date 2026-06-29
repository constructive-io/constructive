import { enforcePerfOptIn } from './src/ci-guard';
import { loadPerfConfig } from './src/config';
import { runPerfMatrix } from './src/matrix';

const config = loadPerfConfig();

jest.setTimeout(config.testTimeoutMs);

describe('graphql-server-test perf matrix', () => {
  it(`runs ${config.configGroup}`, async () => {
    enforcePerfOptIn();
    const summary = await runPerfMatrix(config);
    if (!summary.pass) {
      throw new Error(
        `Perf matrix failed: ${summary.totals.failed} failed, ${summary.totals.skipped} skipped. ` +
        `Summary: ${summary.artifacts.summaryPath}`
      );
    }
  });
});
