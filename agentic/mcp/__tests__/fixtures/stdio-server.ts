import { defineHarnessTool } from '@agentic-kit/harness';
import { z } from 'zod';

import { serveStdio } from '../../src';

// A read that writes to stdout the ways a tool or a library might.
const noisyRead = defineHarnessTool({
  name: 'noisy_read',
  label: 'Noisy read',
  description: 'A read that writes to stdout.',
  parameters: z.object({}),
  effect: 'read',
  async execute() {
    console.log('console noise');
    console.info('info noise');
    process.stdout.write('direct noise\n');
    return { content: [{ type: 'text', text: 'read done' }], details: { done: true } };
  }
});

const server = serveStdio({
  name: 'fixture',
  version: '1.0.0',
  tools: [noisyRead],
  gate: {
    isGated: () => true,
    resolvePrompt: async () => ({ kind: 'blocked', failure: { code: 'unsupported', message: 'The fixture changes nothing.' } })
  },
  cwd: process.cwd(),
  readOnly: true
});

void server.closed.then(() => process.stderr.write('server closed\n'));
