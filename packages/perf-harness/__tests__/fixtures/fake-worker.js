'use strict';

const valueFor = (name) => {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1]) {
    throw new Error(`${flag} is required`);
  }
  return process.argv[index + 1];
};

valueFor('database-url');
const envelope = JSON.parse(
  Buffer.from(valueFor('worker-config'), 'base64url').toString('utf8')
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
