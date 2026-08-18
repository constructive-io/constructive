// `provision.json` overlay manifest.
//
// A pure-data overlay, distributed the same way skills are: written into a
// config/app directory (locally, or materialized there from appstash / a pinned
// git ref) and read at provision time. It NEVER installs or executes a package
// — the base preset is a pinned build-time dependency; this file only selects a
// preset and layers add/remove on top.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import type { ProvisionOverlay } from './resolve';

export const PROVISION_MANIFEST_FILE = 'provision.json';

const ModuleSchema = z.union([
  z.string(),
  z.tuple([z.string(), z.record(z.string(), z.unknown())]),
]);

const ProvisionManifestSchema = z
  .object({
    preset: z.string().optional(),
    add: z.array(ModuleSchema).optional(),
    remove: z.array(z.string()).optional(),
  })
  .strict();

export type ProvisionManifest = ProvisionOverlay;

/** Validate an untrusted value as a provision manifest, throwing on bad shape. */
export function parseProvisionManifest(value: unknown): ProvisionManifest {
  return ProvisionManifestSchema.parse(value) as ProvisionManifest;
}

/**
 * Load `<dir>/provision.json` as an overlay, or `null` when absent. A malformed
 * file throws so a broken overlay is surfaced rather than silently ignored.
 */
export async function loadProvisionManifest(dir: string): Promise<ProvisionManifest | null> {
  const file = path.join(dir, PROVISION_MANIFEST_FILE);
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Invalid ${PROVISION_MANIFEST_FILE} at ${file}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return parseProvisionManifest(parsed);
}
