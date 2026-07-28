import * as path from 'path';

import { appstash, AppStashResult } from 'appstash';

export interface HarnessDirs {
  /** appstash root layout for the tool (config/cache/data/logs/tmp). */
  stash: AppStashResult;
  /** Root for downloaded skill releases: `<data>/skills`. */
  skillsRoot: string;
  /** Directory for one resolved skills release: `<data>/skills/<version>`. */
  skillsVersionDir(version: string): string;
  /** Materialized (merged) skill tree consumed by the agent session. */
  materializedDir: string;
  /** Cached update-check metadata: `<cache>/skills-update-check.json`. */
  updateCheckFile: string;
}

/**
 * Resolve the harness's on-disk layout via appstash.
 *
 * Defaults to `~/.constructive/…` with XDG/tmp fallbacks; hosts that need an
 * app-specific root (e.g. Electron userData) can pass `baseDir`.
 */
export function harnessDirs(tool = 'constructive', baseDir?: string): HarnessDirs {
  const stash = appstash(tool, { ensure: true, baseDir });
  const skillsRoot = path.join(stash.data, 'skills');
  return {
    stash,
    skillsRoot,
    skillsVersionDir: (version: string) => path.join(skillsRoot, version),
    materializedDir: path.join(stash.cache, 'skills-materialized'),
    updateCheckFile: path.join(stash.cache, 'skills-update-check.json'),
  };
}
