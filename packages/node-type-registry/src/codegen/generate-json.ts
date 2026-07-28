/**
 * Emit the registry as pure-data JSON artifacts.
 *
 * First-party, trusted consumers (the dashboard, `@agentic-kit/pi`) import this
 * package over npm and get the presets/node types as pinned code. Untrusted or
 * distributed consumers (appstash, third-party agents) should NOT execute an
 * installed package — they consume these JSON files as DATA instead, fetched
 * from a pinned + verified source. Same content, no code path.
 *
 * The files carry `registryVersion` so a consumer can range-check the data
 * against the tool code it was built for (mirrors the skills manifest's
 * `compatibleSkillsRange`) and refuse data that runs ahead of its code.
 *
 * Usage:
 *   ts-node src/codegen/generate-json.ts [--outdir <dir>]   (default: dist)
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { allNodeTypes } from '../index';
import { allModulePresets } from '../module-presets';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../../package.json') as { version: string };

export interface JsonArtifacts {
  'presets.json': { registryVersion: string; presets: typeof allModulePresets };
  'node-types.json': { registryVersion: string; nodeTypes: typeof allNodeTypes };
}

/** Pure: assemble the JSON payloads from the in-code registry. No I/O. */
export function buildJsonArtifacts(registryVersion: string = version): JsonArtifacts {
  return {
    'presets.json': { registryVersion, presets: allModulePresets },
    'node-types.json': { registryVersion, nodeTypes: allNodeTypes },
  };
}

function outdirFromArgs(argv: string[]): string {
  const i = argv.indexOf('--outdir');
  return i !== -1 && argv[i + 1] ? argv[i + 1] : 'dist';
}

function main(): void {
  const outdir = outdirFromArgs(process.argv.slice(2));
  mkdirSync(outdir, { recursive: true });
  const artifacts = buildJsonArtifacts();
  for (const [file, payload] of Object.entries(artifacts)) {
    const path = join(outdir, file);
    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
    // eslint-disable-next-line no-console
    console.log(`[node-type-registry] wrote ${path}`);
  }
}

if (require.main === module) main();
