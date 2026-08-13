'use strict';

const envelope = JSON.parse(
  Buffer.from(process.env.CPERF_WORKER_CONFIG, 'base64url').toString('utf8')
);
const value = envelope.workerConfig.value;
const memory = {
  rss: value,
  heapTotal: value,
  heapUsed: value,
  external: value,
  arrayBuffers: value,
};
const result = {
  status: 'ok',
  pid: process.pid,
  caseName: envelope.caseName,
  buildMs: value,
  schemaHash: envelope.workerConfig.schemaHash,
  schemaTypeCount: 10,
  runtimeVerified: true,
  caseValidation: { passed: true, errors: [] },
  memory: {
    baseline: memory,
    afterBuild: memory,
    delta: memory,
    processPeakRss: value,
  },
};
process.stdout.write(`CPERF_RESULT ${JSON.stringify(result)}\n`);
