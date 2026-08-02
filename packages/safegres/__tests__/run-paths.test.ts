import type { ParsedArgs } from 'inquirerer';
import * as path from 'path';

import { resolveRunPaths } from '../src/cli/shared';
import type { SafegresConfig } from '../src/config/types';

const CONFIG_DIR = '/repo';
const argv = (values: Record<string, unknown> = {}): ParsedArgs => values as ParsedArgs;

describe('resolveRunPaths', () => {
  it('reads every path from the config file, resolved against it', () => {
    const config: SafegresConfig = {
      source: { pgpm: 'application/app' },
      perf: { baseline: 'ci/perf.json' },
      callGraph: { baseline: 'ci/boundaries.json' },
      outputs: {
        json: 'reports/safegres.json',
        markdown: 'reports/safegres.md',
        sarif: 'reports/safegres.sarif',
        sarifSources: '.',
        snapshot: 'reports/snapshot.json',
        githubComment: 'reports/comment.md'
      }
    };

    const paths = resolveRunPaths(argv(), config, CONFIG_DIR);

    expect(paths.usePgpm).toBe(true);
    expect(paths.pgpm).toBe(path.join(CONFIG_DIR, 'application/app'));
    expect(paths.perfBaseline).toBe(path.join(CONFIG_DIR, 'ci/perf.json'));
    expect(paths.callGraphBaseline).toBe(path.join(CONFIG_DIR, 'ci/boundaries.json'));
    expect(paths.outputs.json).toBe(path.join(CONFIG_DIR, 'reports/safegres.json'));
    expect(paths.outputs.sarifSources).toBe(CONFIG_DIR);
    expect(paths.outputs.githubComment).toBe(path.join(CONFIG_DIR, 'reports/comment.md'));
  });

  it('lets a flag win, and keeps it relative to cwd rather than to the config', () => {
    const config: SafegresConfig = {
      source: { pgpm: 'application/app' },
      perf: { baseline: 'ci/perf.json' },
      outputs: { json: 'reports/safegres.json' }
    };

    const paths = resolveRunPaths(
      argv({ pgpm: 'other/module', 'perf-baseline': 'tmp/perf.json', 'write-json': 'out.json' }),
      config,
      CONFIG_DIR
    );

    expect(paths.pgpm).toBe('other/module');
    expect(paths.perfBaseline).toBe('tmp/perf.json');
    expect(paths.outputs.json).toBe('out.json');
  });

  it('expands a directory into the conventional file names', () => {
    const paths = resolveRunPaths(argv(), { outputs: { dir: 'reports' } }, CONFIG_DIR);

    expect(paths.outputs.json).toBe(path.join(CONFIG_DIR, 'reports/safegres.json'));
    expect(paths.outputs.markdown).toBe(path.join(CONFIG_DIR, 'reports/safegres.md'));
    expect(paths.outputs.sarif).toBe(path.join(CONFIG_DIR, 'reports/safegres.sarif'));
    // The directory is the report set, not every artifact: a snapshot and a PR
    // comment are asked for by name or not at all.
    expect(paths.outputs.snapshot).toBeUndefined();
    expect(paths.outputs.githubComment).toBeUndefined();
  });

  it('lets a named file beat the directory, and --out beat the config', () => {
    const config: SafegresConfig = { outputs: { dir: 'reports', json: 'reports/full.json' } };
    const paths = resolveRunPaths(argv({ out: 'tmp' }), config, CONFIG_DIR);

    expect(paths.outputs.json).toBe(path.join(CONFIG_DIR, 'reports/full.json'));
    expect(paths.outputs.sarif).toBe(path.join('tmp', 'safegres.sarif'));
  });

  it('treats a bare --pgpm as "the nearest workspace"', () => {
    const paths = resolveRunPaths(argv({ pgpm: true }), {}, CONFIG_DIR);
    expect(paths.usePgpm).toBe(true);
    expect(paths.pgpm).toBeUndefined();
  });

  it('asks for nothing when neither side says anything', () => {
    const paths = resolveRunPaths(argv(), {}, CONFIG_DIR);
    expect(paths.usePgpm).toBe(false);
    expect(paths.perfBaseline).toBeUndefined();
    expect(paths.outputs).toEqual({
      json: undefined,
      markdown: undefined,
      sarif: undefined,
      sarifSources: undefined,
      snapshot: undefined,
      githubComment: undefined
    });
  });
});
