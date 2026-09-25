import { pipeProcess } from '../src/process';

describe('pipeProcess', () => {
  it('reports a program that cannot start once: an error, then the exit it never had', async () => {
    const proc = pipeProcess({ command: '/nonexistent/program', args: [], cwd: process.cwd(), env: {} });
    const errors: string[] = [];
    proc.onError(err => errors.push(err.message));
    const exit = await new Promise(resolve => proc.onExit(resolve));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/ENOENT/);
    expect(exit).toEqual({ exitCode: -1 });
    // Nothing left to write to or kill; neither may throw or report again.
    proc.write('late\n');
    proc.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(errors).toHaveLength(1);
  });

  it('reports a normal exit with the code the program chose', async () => {
    const proc = pipeProcess({ command: process.execPath, args: ['-e', 'process.exit(3)'], cwd: process.cwd(), env: {} });
    const exit = await new Promise(resolve => proc.onExit(resolve));
    expect(exit).toEqual({ exitCode: 3 });
  });
});
