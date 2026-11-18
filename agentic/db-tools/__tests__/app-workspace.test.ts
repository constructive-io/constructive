import { run } from '../src/app-workspace';

const printMode = ['-e', 'process.stdout.write(process.env.NODE_ENV ?? "unset")'];

describe('run', () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env.NODE_ENV;
    // A cloud Job's image runs with NODE_ENV=production.
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved;
  });

  it("never passes this process's NODE_ENV on, so pnpm install keeps the dev dependencies", async () => {
    expect(await run(process.execPath, printMode, process.cwd())).toEqual({ ok: true, out: 'unset' });
    expect(await run(process.execPath, printMode, process.cwd(), { PORT: '4321' })).toEqual({
      ok: true,
      out: 'unset'
    });
  });

  it('passes the rest of the environment, and a NODE_ENV the caller sets', async () => {
    process.env.DB_TOOLS_RUN_PROBE = 'kept';
    try {
      const probe = ['-e', 'process.stdout.write(process.env.DB_TOOLS_RUN_PROBE + " " + process.env.NODE_ENV)'];
      expect(await run(process.execPath, probe, process.cwd(), { NODE_ENV: 'development' })).toEqual({
        ok: true,
        out: 'kept development'
      });
    } finally {
      delete process.env.DB_TOOLS_RUN_PROBE;
    }
  });
});
