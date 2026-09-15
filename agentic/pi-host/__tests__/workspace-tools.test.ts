import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createWorkspaceTools } from '../src/workspace-tools';

/** A real directory, because the tools' whole subject is a real checkout. */
let cwd: string;
let tools: ReturnType<typeof createWorkspaceTools>;

const tool = (name: string) => {
  const found = tools.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`no tool named ${name}`);
  return found;
};

const run = async (name: string, params: Record<string, unknown>): Promise<string> => {
  const result = await tool(name).execute('call-1', params, undefined);
  return result.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
};

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'workspace-tools-'));
  tools = createWorkspaceTools({ cwd });
  await writeFile(path.join(cwd, 'README.md'), '# title\n\nbody\n', 'utf-8');
});

describe('workspace tools', () => {
  it('reads, writes and lists inside the workspace', async () => {
    expect(await run('read_file', { path: 'README.md' })).toBe('# title\n\nbody\n');
    expect(await run('write_file', { path: 'src/index.ts', content: 'export {};\n' })).toBe(
      'wrote src/index.ts'
    );
    expect(await readFile(path.join(cwd, 'src/index.ts'), 'utf-8')).toBe('export {};\n');
    expect(await run('list_files', {})).toBe('README.md\nsrc/');
  });

  it('edits a unique string, and refuses an ambiguous or absent one', async () => {
    expect(await run('edit_file', { path: 'README.md', old_string: '# title', new_string: '# heading' })).toBe(
      'edited README.md'
    );
    expect(await readFile(path.join(cwd, 'README.md'), 'utf-8')).toBe('# heading\n\nbody\n');

    await writeFile(path.join(cwd, 'dup.txt'), 'a\na\n', 'utf-8');
    expect(await run('edit_file', { path: 'dup.txt', old_string: 'a', new_string: 'b' })).toMatch(
      /occurs 2 times/
    );
    expect(await run('edit_file', { path: 'dup.txt', old_string: 'zzz', new_string: 'b' })).toMatch(
      /does not contain that text/
    );
  });

  it('keeps every path inside the clone the Job was given', async () => {
    expect(await run('read_file', { path: '../escape.txt' })).toMatch(/outside the workspace/);
    expect(await run('write_file', { path: '/etc/passwd', content: 'no' })).toMatch(
      /outside the workspace/
    );
  });

  it('answers a command with its output and exit status, failures included', async () => {
    expect(await run('run_command', { command: 'echo hi' })).toBe('stdout:\nhi\n\nexit: 0');

    const failed = await run('run_command', { command: 'exit 3' });
    expect(failed).toContain('exit: 3');
  });

  it('reports a missing file as a tool result the model can recover from', async () => {
    expect(await run('read_file', { path: 'nope.md' })).toMatch(/^error: /);
  });
});
