import { TOOL_FAILURE_CODES } from '@agentic-kit/harness';
import { readFileSync } from 'fs';
import path from 'path';

import { commands, createConstructiveCli } from '../src/cli';

const readme = readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');

describe('the README', () => {
  it.each(commands.map((command) => [command.name]))('names the command %s', (name) => {
    expect(readme).toContain(`\`${name}`);
  });

  it.each(TOOL_FAILURE_CODES.map((code) => [code]))('says what follows the failure code %s', (code) => {
    expect(readme).toContain(`\`${code}\``);
  });

  it.each(createConstructiveCli().manifest().topics.map((topic) => [topic.name]))('points to the help topic %s', (name) => {
    expect(readme).toContain(`\`constructive help ${name}\``);
  });

  it('points to the man page', () => {
    expect(readme).toContain('`man constructive`');
  });
});
