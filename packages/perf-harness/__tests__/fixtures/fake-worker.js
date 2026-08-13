'use strict';

const config = JSON.parse(
  Buffer.from(process.env.CPERF_WORKER_CONFIG, 'base64url').toString('utf8')
);
const scoped = config.arm === 'scoped' || config.arm === 'scoped-retire';
const retire = config.arm === 'retire' || config.arm === 'scoped-retire';
const value = { stock: 40, scoped: 30, retire: 20, 'scoped-retire': 10 }[
  config.arm
];
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
  arm: config.arm,
  definition: {
    name: config.arm,
    scopedIntrospection: scoped,
    retireBuildState: retire,
    introspectionMode: scoped ? 'scoped-required' : 'stock',
    scopedCatalogTypes: scoped ? 'dependency-closure' : null,
    introspectionClientReleaseMode: scoped ? 'destroy' : 'reuse',
  },
  buildMs: value,
  schemaHash: 'fixture-schema-hash',
  schemaTypeCount: 10,
  queryVerified: true,
  buildStateReleased: retire,
  memory: {
    baseline: memory,
    afterBuild: memory,
    delta: memory,
    processPeakRss: value,
  },
};
process.stdout.write(`CPERF_RESULT ${JSON.stringify(result)}\n`);
