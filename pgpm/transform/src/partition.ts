/**
 * Partition dial wiring shared by `pgpm transform --partition` and
 * `pgpm export --partition`: parse a partition config file, run
 * `partitionUnits` (`@pgpmjs/transform`), and lift the emitted packages back
 * onto the PgpmRow seam with generated revert/verify per change.
 */
import { PgpmRow } from '@pgpmjs/ast';
import { PathStyle } from '@pgpmjs/naming-spec';
import * as fs from 'fs';
import { loadModule } from 'plpgsql-parser';

import { PartitionConfig, PartitionInputChange, partitionUnits } from './partition-driver';
import { regenerateScripts } from './regen';

export type { PartitionConfig } from './partition-driver';

const PATH_STYLES: readonly PathStyle[] = ['directory', 'flat'];

/**
 * Parse and validate a partition config file (JSON matching
 * `PartitionConfig`: rules, defaultPackage, optional style/splitRiders).
 * Throws with a message naming the offending field.
 */
export const parsePartitionConfig = (filePath: string): PartitionConfig => {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error(`Partition config not found: ${filePath}`);
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err: any) {
    throw new Error(`Partition config is not valid JSON (${filePath}): ${err?.message ?? err}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Partition config must be a JSON object (${filePath})`);
  }
  if (typeof parsed.defaultPackage !== 'string' || !parsed.defaultPackage) {
    throw new Error('Partition config: "defaultPackage" must be a non-empty string');
  }
  if (!Array.isArray(parsed.rules)) {
    throw new Error('Partition config: "rules" must be an array');
  }
  parsed.rules.forEach((rule: any, i: number) => {
    if (typeof rule !== 'object' || rule === null) {
      throw new Error(`Partition config: rules[${i}] must be an object`);
    }
    if (typeof rule.package !== 'string' || !rule.package) {
      throw new Error(`Partition config: rules[${i}].package must be a non-empty string`);
    }
    if (!Array.isArray(rule.select) || rule.select.length === 0) {
      throw new Error(`Partition config: rules[${i}].select must be a non-empty array of selectors`);
    }
  });
  if (parsed.style !== undefined && !PATH_STYLES.includes(parsed.style)) {
    throw new Error(`Partition config: "style" must be one of: ${PATH_STYLES.join(', ')}`);
  }
  if (parsed.splitRiders !== undefined && !Array.isArray(parsed.splitRiders)) {
    throw new Error('Partition config: "splitRiders" must be an array of statement kinds');
  }
  return parsed as PartitionConfig;
};

/** One partitioned package on the PgpmRow seam, ready to write to disk. */
export interface PartitionedPackageRows {
  name: string;
  /** Package names this package requires (cross-package edges). */
  requires: string[];
  rows: PgpmRow[];
}

export interface PartitionExportRowsResult {
  packages: PartitionedPackageRows[];
  warnings: string[];
}

/**
 * Partition changes into packages and generate revert/verify for every
 * emitted change. Cross-package dependencies keep the `<pkg>:<path>`
 * convention in `deps`. May throw `PartitionCycleError`.
 */
export const partitionExportRows = async (
  rows: PgpmRow[],
  config: PartitionConfig
): Promise<PartitionExportRowsResult> => {
  await loadModule();

  const input: PartitionInputChange[] = rows.map(row => ({
    name: row.deploy,
    dependencies: row.deps ?? [],
    deploy: row.content
  }));

  const { packages, warnings } = partitionUnits(input, config);

  const result: PartitionedPackageRows[] = packages.map(pkg => ({
    name: pkg.name,
    requires: pkg.requires,
    rows: pkg.changes.map(change => {
      const scripts = regenerateScripts(change.deploy);
      for (const warning of scripts.revert.warnings) {
        warnings.push(`${pkg.name}:${change.name}: ${warning}`);
      }
      for (const warning of scripts.verify.warnings) {
        warnings.push(`${pkg.name}:${change.name}: ${warning}`);
      }
      return {
        name: change.name,
        deploy: change.name,
        deps: change.dependencies,
        content: change.deploy,
        revert: scripts.revert.sql,
        verify: scripts.verify.sql
      };
    })
  }));

  return { packages: result, warnings };
};
