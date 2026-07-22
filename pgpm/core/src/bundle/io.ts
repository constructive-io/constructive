import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { readModule } from '../ast/reader';
import { createBundle, CreateBundleOptions } from './create';
import { MigrationBundle } from './types';

/** Default file name for a serialized bundle artifact. */
export const BUNDLE_FILE_NAME = 'pgpm-bundle.json';

/**
 * Build a bundle straight from a module directory on disk (readModule → createBundle).
 */
export function bundleFromModule(
  moduleDir: string,
  options?: CreateBundleOptions
): MigrationBundle {
  return createBundle(readModule(moduleDir), options);
}

/**
 * Serialize a bundle to a single JSON artifact file (stable 2-space formatting).
 */
export function writeBundleFile(bundle: MigrationBundle, filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(bundle, null, 2) + '\n');
}

/**
 * Read a bundle artifact JSON file back into memory.
 */
export function readBundleFile(filePath: string): MigrationBundle {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as MigrationBundle;
}

/**
 * Materialize a bundle back into a real, deployable pgpm module directory:
 * `pgpm.plan`, the `.control` file (when present), and each change's
 * deploy/revert/verify script at its `deploy/<change>.sql` path.
 *
 * The inverse of {@link bundleFromModule}; the emitted directory can be read
 * back with `readModule` or deployed with `PgpmMigrate`.
 */
export function materializeBundle(bundle: MigrationBundle, outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'pgpm.plan'), bundle.plan);
  if (bundle.control) {
    writeFileSync(join(outDir, bundle.control.fileName), bundle.control.content);
  }
  for (const change of bundle.changes) {
    for (const script of [change.deploy, change.revert, change.verify]) {
      if (!script) continue;
      const file = join(outDir, script.kind, `${change.name}.sql`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, script.sql);
    }
  }
}
