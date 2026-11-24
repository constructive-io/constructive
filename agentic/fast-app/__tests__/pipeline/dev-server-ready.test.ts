import assert from 'node:assert/strict';

import { devServerUrl, INITIAL_DEV_OUTPUT, parseDevOutput } from '../../src/pipeline/dev-server-ready';

const feed = (chunks: string[]) => chunks.reduce(parseDevOutput, INITIAL_DEV_OUTPUT);

test('a Next.js start is ready on the URL it prints, even when lines split across chunks', () => {
  const state = feed([
    '   \u001b[1m\u001b[35m▲ Next.js 15.5.4\u001b[39m\u001b[22m (Turbopack)\n   - Local:        http://loc',
    'alhost:4123\n   - Network:      http://192.168.1.5:4123\n\n ✓ Starting...\n',
    ' \u001b[32m✓\u001b[39m Ready in 1388ms\n',
  ]);
  assert.equal(state.ready, true);
  assert.equal(state.error, null);
  assert.equal(devServerUrl(state, 4123), 'http://localhost:4123');
});

test('a port the server moved off is read from its own Local line', () => {
  const state = feed([
    ' ⚠ Port 4123 is in use, using available port 4124 instead.\n',
    '   - Local:        http://localhost:4124\n',
    ' ✓ Ready in 900ms\n',
  ]);
  assert.equal(devServerUrl(state, 4123), 'http://localhost:4124');
});

test('a failure before ready is reported and later output does not replace it', () => {
  const state = feed([
    'Error: listen EADDRINUSE: address already in use :::4123\n',
    ' ⨯ Failed to start server\n',
  ]);
  assert.equal(state.ready, false);
  assert.equal(state.error, 'EADDRINUSE: address already in use :::4123');
});

test('an error logged after ready (a compile error on one route) does not mark the start failed', () => {
  const state = feed([' ✓ Ready in 1s\n', 'Error: Cannot find module "./missing"\n']);
  assert.equal(state.ready, true);
  assert.equal(state.error, null);
  assert.equal(devServerUrl(state, 3000), 'http://localhost:3000');
});
