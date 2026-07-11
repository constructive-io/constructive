import fs from 'fs';
import path from 'path';

import {
  DEFAULT_TEMPLATE_REPO,
  PGLITE_TEMPLATE_REPO,
  PgpmPackage,
} from '@pgpmjs/core';

/**
 * A template/boilerplate source, recorded on a workspace so that modules
 * created inside it inherit the same repo without re-specifying flags.
 */
export interface BoilerplateSource {
  repo: string;
  branch?: string;
  dir?: string;
}

/**
 * Resolve the template repo for an `init` invocation from its flags.
 *
 * Precedence: explicit `--repo` wins, then `--pglite` (sugar for the pglite
 * boilerplates repo), otherwise the default repo.
 */
export function resolveInitTemplateRepo(flags: {
  repo?: unknown;
  pglite?: boolean;
}): { templateRepo: string; repoWasExplicit: boolean } {
  const pglite = Boolean(flags.pglite);
  const repoWasExplicit = typeof flags.repo === 'string' || pglite;
  const templateRepo =
    typeof flags.repo === 'string'
      ? flags.repo
      : pglite
        ? PGLITE_TEMPLATE_REPO
        : DEFAULT_TEMPLATE_REPO;
  return { templateRepo, repoWasExplicit };
}

/**
 * Record the boilerplate source on a freshly scaffolded workspace's `pgpm.json`
 * so that `pgpm init` (module) inside it inherits the same template repo.
 * Only writes into an existing pgpm.json (pgpm.config.js workspaces are skipped).
 */
export function persistBoilerplateSource(
  workspaceDir: string,
  source: BoilerplateSource
): void {
  const configPath = path.join(workspaceDir, 'pgpm.json');
  if (!fs.existsSync(configPath)) return;

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);
    config.boilerplates = {
      repo: source.repo,
      ...(source.branch ? { branch: source.branch } : {}),
      ...(source.dir ? { dir: source.dir } : {}),
    };
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  } catch {
    // Non-fatal: inheritance is a convenience, not a correctness requirement.
  }
}

/**
 * Read a previously recorded boilerplate source from the enclosing workspace's
 * config (see {@link persistBoilerplateSource}).
 */
export function readBoilerplateSource(cwd: string): BoilerplateSource | undefined {
  const project = new PgpmPackage(cwd);
  const recorded = project.config?.boilerplates;
  if (recorded?.repo) {
    return { repo: recorded.repo, branch: recorded.branch, dir: recorded.dir };
  }
  return undefined;
}
