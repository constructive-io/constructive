import * as fs from 'fs';
import type { ParsedArgs } from 'inquirerer';
import * as os from 'os';
import * as path from 'path';

import { resolveRunPaths } from '../src/cli/shared';
import { configPathBase, loadConfig } from '../src/config/loader';
import { resolveRules } from '../src/config/resolve';
import type { SafegresConfig } from '../src/config/types';

const argv = (values: Record<string, unknown> = {}): ParsedArgs => values as ParsedArgs;

/** A repo whose shared rules live in one file and whose jobs each extend it. */
function repo(base: SafegresConfig, job: SafegresConfig): { root: string; jobDir: string } {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'safegres-extends-')));
  const jobDir = path.join(root, 'ci', 'nightly');
  fs.mkdirSync(jobDir, { recursive: true });
  fs.writeFileSync(path.join(root, 'safegres.base.json'), JSON.stringify(base));
  fs.writeFileSync(
    path.join(jobDir, '.safegresrc.json'),
    JSON.stringify({ extends: '../../safegres.base.json', ...job })
  );
  return { root, jobDir };
}

describe('extends a local file', () => {
  it('inherits through the file, and through the file to a preset', () => {
    const { jobDir } = repo(
      { extends: 'safegres:constructive', failOn: { grade: 'B' }, public: { read: ['app_public.posts'] } },
      { failOn: { grade: 'D' } }
    );

    const { config } = loadConfig({ cwd: jobDir });

    expect(config.public?.read).toEqual(['app_public.posts']); // from the base file
    expect(config.failOn?.grade).toBe('D'); // the job's own gate wins
    expect(resolveRules(config).rules.get('A2')!.severity).toBe('critical'); // from the preset
  });

  it('unions overrides rather than replacing them, as a preset chain does', () => {
    const { jobDir } = repo(
      { overrides: [{ tables: ['app_public.audit'], rules: { A1: 'off' } }] },
      { overrides: [{ tables: ['app_public.jobs'], rules: { A5: 'off' } }] }
    );

    const { config } = loadConfig({ cwd: jobDir });

    expect(config.overrides).toEqual([
      { tables: ['app_public.audit'], rules: { A1: 'off' } },
      { tables: ['app_public.jobs'], rules: { A5: 'off' } }
    ]);
  });

  it('resolves each path against the file that declared it', () => {
    const { root, jobDir } = repo(
      { perf: { baseline: 'ci/perf.json' }, source: { pgpm: 'application/app' } },
      { outputs: { dir: 'reports' } }
    );

    const loaded = loadConfig({ cwd: jobDir });
    const paths = resolveRunPaths(argv(), loaded.config, configPathBase(loaded));

    // Inherited: the base file's directory, not the one that inherited it.
    expect(paths.perfBaseline).toBe(path.join(root, 'ci/perf.json'));
    expect(paths.pgpm).toBe(path.join(root, 'application/app'));
    // Declared here: this file's directory.
    expect(paths.outputs.json).toBe(path.join(jobDir, 'reports', 'safegres.json'));
  });

  it('names the mistake when the target cannot be read', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'safegres-extends-'));
    fs.writeFileSync(path.join(cwd, '.safegresrc.json'), JSON.stringify({ extends: './nope.json' }));

    expect(() => loadConfig({ cwd })).toThrow(/an "extends" target could not be read/);
  });

  it('cannot reach a sealed run: no discovery, so no file to extend from', () => {
    const { jobDir } = repo(
      { extends: 'safegres:minimal', failOn: { grade: 'F' } },
      {}
    );

    const { config, isEmpty } = loadConfig({ cwd: jobDir, sealed: true, preset: 'recommended' });

    expect(isEmpty).toBe(true);
    expect(config.failOn?.grade).toBeUndefined();
  });
});
