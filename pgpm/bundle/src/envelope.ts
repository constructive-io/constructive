/**
 * Bundle envelope: the versioned, shippable artifact container that wraps a
 * schema {@link MigrationBundle} together with data and fixture SQL parts —
 * the artifact `exportMigrationBundle` emits and snapshot/fork/apply consume.
 *
 * The envelope layer is deliberately payload-agnostic about how data/fixture
 * SQL is produced: callers build the scripts (e.g. with the `@pgpmjs/export`
 * data-dump builders) and hand in the text. This keeps the dependency
 * direction intact (`@pgpmjs/export` depends on core, which depends on this
 * package) while every byte remains digest-covered.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { hashString } from '@pgpmjs/ast';
import { readBundleFile, writeBundleFile } from './io';
import { MigrationBundle } from './types';
import { BundleIssue, verifyBundle } from './verify';

/** Current envelope format version. Bumped only on breaking artifact changes. */
export const ENVELOPE_FORMAT_VERSION = '1';

/** Default file name for a serialized envelope artifact. */
export const ENVELOPE_FILE_NAME = 'pgpm-envelope.json';

/** Manifest file name inside a materialized envelope directory. */
export const ENVELOPE_MANIFEST_FILE_NAME = 'envelope.json';

export type EnvelopePartKind = 'schema' | 'data' | 'fixtures';

/**
 * One data or fixtures part: a named deploy/revert/verify SQL triplet.
 * `deploy` is required; `revert`/`verify` are optional (null when absent).
 */
export interface EnvelopeScriptPart {
  name: string;
  /** SQL text, byte-exact. */
  deploy: string;
  revert: string | null;
  verify: string | null;
  /** sha256 over the part name + script digests (see `computePartDigest`). */
  digest: string;
}

/** Inventory entry for one part of the envelope. */
export interface EnvelopePartEntry {
  kind: EnvelopePartKind;
  name: string;
  digest: string;
}

/**
 * The envelope's self-describing header: identity, contents inventory with
 * per-part digests, an overall content digest, and source lineage.
 */
export interface EnvelopeManifest {
  formatVersion: string;
  /** Artifact name (typically the module/extension name). */
  name: string;
  /** Artifact version (caller-assigned, e.g. a semver or revision tag). */
  version: string;
  /** Tool that produced the envelope (informational; excluded from {@link digest}). */
  createdWith: string;
  /** Contents inventory in serialization order: schema first, then data, then fixtures. */
  parts: EnvelopePartEntry[];
  /**
   * sha256 over the identity (name, version) + ordered part digests. Merkle:
   * any byte change in any part changes a part digest and therefore this one.
   * Independent of `createdWith`/provenance so identical contents hash identically.
   */
  digest: string;
  /**
   * Optional caller-supplied lineage — e.g. source database/metaschema
   * revision, the slice spec that produced the schema bundle, a schema map.
   * Recorded but excluded from {@link digest}.
   */
  provenance?: Record<string, string>;
}

/**
 * A portable, content-addressed shipping container: schema (required) plus
 * ordered data and fixtures parts.
 */
export interface BundleEnvelope {
  manifest: EnvelopeManifest;
  schema: MigrationBundle;
  data: EnvelopeScriptPart[];
  fixtures: EnvelopeScriptPart[];
}

/**
 * Digest for one data/fixtures part: its name plus the digests of its scripts
 * in fixed deploy/revert/verify order; a missing script contributes an empty
 * slot so presence/absence changes the digest.
 */
export function computePartDigest(
  name: string,
  scripts: { deploy: string; revert?: string | null; verify?: string | null }
): string {
  return hashString(
    [
      name,
      hashString(scripts.deploy),
      scripts.revert != null ? hashString(scripts.revert) : '',
      scripts.verify != null ? hashString(scripts.verify) : ''
    ].join('\n')
  );
}

/**
 * Top-level envelope digest: identity + the ordered part digests.
 */
export function computeEnvelopeDigest(
  name: string,
  version: string,
  partDigests: string[]
): string {
  return hashString([name, version, ...partDigests].join('\n'));
}

/** Input shape for a data/fixtures part (digest computed by createEnvelope). */
export interface EnvelopeScriptPartInput {
  name: string;
  deploy: string;
  revert?: string | null;
  verify?: string | null;
}

export interface CreateEnvelopeOptions {
  /** Artifact name; defaults to the schema bundle's manifest name. */
  name?: string;
  /** Artifact version (caller-assigned). */
  version: string;
  /** The schema bundle (required). */
  schema: MigrationBundle;
  /** Data parts, in replay order. */
  data?: EnvelopeScriptPartInput[];
  /** Fixture parts, in replay order. */
  fixtures?: EnvelopeScriptPartInput[];
  /** Tool identifier recorded in the manifest (default `@pgpmjs/bundle`). */
  createdWith?: string;
  /** Lineage recorded in the manifest (excluded from the digest). */
  provenance?: Record<string, string>;
}

const toPart = (input: EnvelopeScriptPartInput): EnvelopeScriptPart => ({
  name: input.name,
  deploy: input.deploy,
  revert: input.revert ?? null,
  verify: input.verify ?? null,
  digest: computePartDigest(input.name, input)
});

/**
 * Build a content-addressed {@link BundleEnvelope}. Pure and deterministic:
 * no disk I/O, no clock, no version noise in the digest. The schema part's
 * digest is the bundle's own manifest digest, so the envelope Merkle chain
 * extends down through every change and script.
 */
export function createEnvelope(options: CreateEnvelopeOptions): BundleEnvelope {
  const name = options.name ?? options.schema.manifest.name;
  const data = (options.data ?? []).map(toPart);
  const fixtures = (options.fixtures ?? []).map(toPart);

  const parts: EnvelopePartEntry[] = [
    { kind: 'schema' as const, name, digest: options.schema.manifest.digest },
    ...data.map(p => ({ kind: 'data' as const, name: p.name, digest: p.digest })),
    ...fixtures.map(p => ({ kind: 'fixtures' as const, name: p.name, digest: p.digest }))
  ];

  const manifest: EnvelopeManifest = {
    formatVersion: ENVELOPE_FORMAT_VERSION,
    name,
    version: options.version,
    createdWith: options.createdWith ?? '@pgpmjs/bundle',
    parts,
    digest: computeEnvelopeDigest(name, options.version, parts.map(p => p.digest))
  };
  if (options.provenance) manifest.provenance = options.provenance;

  return { manifest, schema: options.schema, data, fixtures };
}

/**
 * A single envelope integrity discrepancy found by {@link verifyEnvelope}.
 */
export interface EnvelopeIssue {
  kind:
    | 'part-digest'
    | 'part-inventory'
    | 'envelope-digest'
    | 'schema-bundle';
  part?: string;
  message: string;
}

/**
 * Recompute every digest in an envelope and confirm it matches the recorded
 * values: each part digest, the inventory, the top-level digest, and (via
 * {@link verifyBundle}) the full schema bundle chain. Read-only; returns the
 * issues rather than throwing.
 */
export function verifyEnvelope(
  envelope: BundleEnvelope
): { issues: EnvelopeIssue[]; schemaIssues: BundleIssue[] } {
  const issues: EnvelopeIssue[] = [];
  const { manifest, schema, data, fixtures } = envelope;

  const expectParts: EnvelopePartEntry[] = [
    { kind: 'schema', name: manifest.name, digest: schema.manifest.digest },
    ...data.map(p => ({ kind: 'data' as const, name: p.name, digest: computePartDigest(p.name, p) })),
    ...fixtures.map(p => ({ kind: 'fixtures' as const, name: p.name, digest: computePartDigest(p.name, p) }))
  ];

  for (const part of [...data, ...fixtures]) {
    const recomputed = computePartDigest(part.name, part);
    if (recomputed !== part.digest) {
      issues.push({
        kind: 'part-digest',
        part: part.name,
        message: `part ${part.name}: recorded digest ${part.digest} != recomputed ${recomputed}`
      });
    }
  }

  const inventory = manifest.parts.map(p => `${p.kind}:${p.name}:${p.digest}`).join('\n');
  const expected = expectParts.map(p => `${p.kind}:${p.name}:${p.digest}`).join('\n');
  if (inventory !== expected) {
    issues.push({
      kind: 'part-inventory',
      message: 'manifest.parts does not match the envelope contents'
    });
  }

  const digest = computeEnvelopeDigest(
    manifest.name,
    manifest.version,
    expectParts.map(p => p.digest)
  );
  if (digest !== manifest.digest) {
    issues.push({
      kind: 'envelope-digest',
      message: `recorded envelope digest ${manifest.digest} != recomputed ${digest}`
    });
  }

  const schemaIssues = verifyBundle(schema);
  if (schemaIssues.length > 0) {
    issues.push({
      kind: 'schema-bundle',
      message: `schema bundle failed verification with ${schemaIssues.length} issue(s)`
    });
  }

  return { issues, schemaIssues };
}

/**
 * Serialize an envelope to a single JSON artifact file (stable 2-space formatting).
 */
export function writeEnvelopeFile(envelope: BundleEnvelope, filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(envelope, null, 2) + '\n');
}

/**
 * Read an envelope artifact JSON file back into memory.
 */
export function readEnvelopeFile(filePath: string): BundleEnvelope {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as BundleEnvelope;
}

const writePartDir = (part: EnvelopeScriptPart, dir: string): void => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'deploy.sql'), part.deploy);
  if (part.revert !== null) writeFileSync(join(dir, 'revert.sql'), part.revert);
  if (part.verify !== null) writeFileSync(join(dir, 'verify.sql'), part.verify);
};

/**
 * Materialize an envelope as a deterministic directory layout — trivially
 * tarred/shipped by callers:
 *
 * ```
 * envelope.json                 # manifest only
 * schema/pgpm-bundle.json       # the schema MigrationBundle artifact
 * data/<name>/{deploy,revert,verify}.sql
 * fixtures/<name>/{deploy,revert,verify}.sql
 * ```
 */
export function materializeEnvelope(envelope: BundleEnvelope, outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, ENVELOPE_MANIFEST_FILE_NAME),
    JSON.stringify(envelope.manifest, null, 2) + '\n'
  );
  writeBundleFile(envelope.schema, join(outDir, 'schema', 'pgpm-bundle.json'));
  for (const part of envelope.data) writePartDir(part, join(outDir, 'data', part.name));
  for (const part of envelope.fixtures) writePartDir(part, join(outDir, 'fixtures', part.name));
}

const readOptional = (path: string): string | null => {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
};

const readPartsDir = (dir: string, order: string[]): EnvelopeScriptPart[] => {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const ordered = order.filter(n => names.includes(n));
  return ordered.map(name => {
    const partDir = join(dir, name);
    const deploy = readFileSync(join(partDir, 'deploy.sql'), 'utf-8');
    const revert = readOptional(join(partDir, 'revert.sql'));
    const verify = readOptional(join(partDir, 'verify.sql'));
    return {
      name,
      deploy,
      revert,
      verify,
      digest: computePartDigest(name, { deploy, revert, verify })
    };
  });
};

/**
 * Read a materialized envelope directory back into memory — the inverse of
 * {@link materializeEnvelope}. Part order is restored from the manifest
 * inventory; run {@link verifyEnvelope} afterwards to prove integrity.
 */
export function envelopeFromDirectory(dir: string): BundleEnvelope {
  const manifest = JSON.parse(
    readFileSync(join(dir, ENVELOPE_MANIFEST_FILE_NAME), 'utf-8')
  ) as EnvelopeManifest;
  const schema = readBundleFile(join(dir, 'schema', 'pgpm-bundle.json'));
  const dataOrder = manifest.parts.filter(p => p.kind === 'data').map(p => p.name);
  const fixturesOrder = manifest.parts.filter(p => p.kind === 'fixtures').map(p => p.name);
  return {
    manifest,
    schema,
    data: readPartsDir(join(dir, 'data'), dataOrder),
    fixtures: readPartsDir(join(dir, 'fixtures'), fixturesOrder)
  };
}
