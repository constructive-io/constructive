import { PgConfig } from 'pg-env';
import { getPgPool } from 'pg-cache';

import {
  BundleEnvelope,
  EnvelopeIssue,
  EnvelopePartKind,
  EnvelopeScriptPart,
  verifyEnvelope
} from '@pgpmjs/bundle';

import {
  applyBundle,
  ApplyBundleOptions,
  ApplyBundlePreview,
  ApplyBundleResult,
  previewBundleApply,
  PreviewBundleApplyOptions
} from './apply';

/** One data/fixtures part in the envelope's replay order. */
export interface EnvelopePartRef {
  kind: Exclude<EnvelopePartKind, 'schema'>;
  name: string;
}

/** Pre-flight analysis of an envelope apply, computed without touching the database. */
export interface EnvelopeApplyPreview {
  name: string;
  version: string;
  envelopeDigest: string;
  /** Digest/inventory/tamper problems from `verifyEnvelope`. */
  envelopeIssues: EnvelopeIssue[];
  /** The schema bundle's own pre-flight (integrity, namespace, order, rollback). */
  schema: ApplyBundlePreview;
  /** Data then fixtures parts, in manifest replay order. */
  partOrder: EnvelopePartRef[];
  /**
   * How to undo this apply: part reverts in reverse replay order (parts
   * without a revert script are flagged), then the schema rollback plan.
   */
  rollbackPlan: {
    parts: (EnvelopePartRef & { hasRevert: boolean })[];
    schema: string[];
  };
}

/**
 * Analyze an envelope apply without executing it: verify the envelope's
 * digest chain (including the schema bundle), run the schema pre-flight, and
 * derive replay order + rollback plan. Pure — no database, no disk.
 */
export function previewEnvelopeApply(
  envelope: BundleEnvelope,
  options: PreviewBundleApplyOptions = {}
): EnvelopeApplyPreview {
  const { issues } = verifyEnvelope(envelope);
  const parts: (EnvelopePartRef & { part: EnvelopeScriptPart })[] = [
    ...envelope.data.map(part => ({ kind: 'data' as const, name: part.name, part })),
    ...envelope.fixtures.map(part => ({ kind: 'fixtures' as const, name: part.name, part }))
  ];
  const schema = previewBundleApply(envelope.schema, options);

  return {
    name: envelope.manifest.name,
    version: envelope.manifest.version,
    envelopeDigest: envelope.manifest.digest,
    envelopeIssues: issues,
    schema,
    partOrder: parts.map(({ kind, name }) => ({ kind, name })),
    rollbackPlan: {
      parts: [...parts]
        .reverse()
        .map(({ kind, name, part }) => ({ kind, name, hasRevert: part.revert !== null })),
      schema: schema.rollbackPlan
    }
  };
}

/** Context handed to {@link EnvelopeApplyOptions.transformPartSql}. */
export interface PartSqlContext {
  kind: Exclude<EnvelopePartKind, 'schema'>;
  name: string;
  script: 'deploy' | 'verify';
}

/** Status/rollback metadata for one replayed part. */
export interface EnvelopePartResult {
  kind: Exclude<EnvelopePartKind, 'schema'>;
  name: string;
  /** True when the part's deploy SQL ran against the database. */
  executed: boolean;
  /** Set only when `verifyParts` is enabled and the part has a verify script. */
  verified?: boolean;
  durationMs: number;
}

export interface EnvelopeApplyOptions extends ApplyBundleOptions {
  /** Run each part's verify script after its deploy. Default false. */
  verifyParts?: boolean;
  /**
   * Seam for pre-apply rewriting of part SQL (e.g. deterministic ID remap).
   * Applied to deploy and verify scripts just before execution; identity when
   * omitted. Never sees schema-bundle SQL.
   */
  transformPartSql?: (sql: string, ctx: PartSqlContext) => string;
}

/** Explicit outcome of an {@link applyEnvelope} call. */
export interface EnvelopeApplyResult {
  preview: EnvelopeApplyPreview;
  dryRun: boolean;
  /** True when anything ran against the database. */
  executed: boolean;
  /** The schema half's own result (undefined on dry-run). */
  schema?: ApplyBundleResult;
  /** Per-part status metadata, in replay order (parts reached so far). */
  parts: EnvelopePartResult[];
  durationMs: number;
  timedOut: boolean;
}

/** Thrown when an envelope apply is refused pre-flight or fails mid-replay. */
export class EnvelopeApplyError extends Error {
  constructor(
    message: string,
    readonly preview: EnvelopeApplyPreview,
    /** Parts completed before the failure (for status recording). */
    readonly parts: EnvelopePartResult[] = [],
    readonly timedOut = false
  ) {
    super(message);
    this.name = 'EnvelopeApplyError';
  }
}

/**
 * Apply a {@link BundleEnvelope} into a target database: the generic
 * `applyMigrationBundle` primitive.
 *
 * Order of operations:
 * 1. Pre-flight: {@link previewEnvelopeApply} — refuse on any envelope digest
 *    issue unless `allowUnverified` (schema-bundle integrity and namespace
 *    gating are then enforced again by {@link applyBundle}).
 * 2. Schema: {@link applyBundle} on `envelope.schema` (atomic transaction,
 *    timeout, dry-run all handled there).
 * 3. Parts: replay each data then fixtures part's deploy SQL in manifest
 *    order, inside a single transaction so a failing part rolls back all part
 *    data (the schema stays applied; the preview's rollback plan describes the
 *    full undo). Optional per-part verify. The `transformPartSql` seam runs
 *    just before execution.
 */
export async function applyEnvelope(
  envelope: BundleEnvelope,
  options: EnvelopeApplyOptions
): Promise<EnvelopeApplyResult> {
  const started = Date.now();
  const preview = previewEnvelopeApply(envelope, options);

  if (!options.allowUnverified && preview.envelopeIssues.length > 0) {
    throw new EnvelopeApplyError(
      `Refusing to apply envelope "${preview.name}@${preview.version}": failed integrity ` +
        `verification (${preview.envelopeIssues.length} issue(s): ` +
        `${preview.envelopeIssues.map(i => i.kind).join(', ')})`,
      preview
    );
  }

  if (options.dryRun) {
    return {
      preview,
      dryRun: true,
      executed: false,
      parts: [],
      durationMs: Date.now() - started,
      timedOut: false
    };
  }

  const schema = await applyBundle(envelope.schema, options);

  const transform = options.transformPartSql ?? ((sql: string) => sql);
  const orderedParts: (EnvelopePartRef & { part: EnvelopeScriptPart })[] = [
    ...envelope.data.map(part => ({ kind: 'data' as const, name: part.name, part })),
    ...envelope.fixtures.map(part => ({ kind: 'fixtures' as const, name: part.name, part }))
  ];

  const parts: EnvelopePartResult[] = [];
  if (orderedParts.length > 0) {
    const pool = getPgPool(options.config as PgConfig);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { kind, name, part } of orderedParts) {
        const partStarted = Date.now();
        try {
          await client.query(transform(part.deploy, { kind, name, script: 'deploy' }));
          const result: EnvelopePartResult = {
            kind,
            name,
            executed: true,
            durationMs: Date.now() - partStarted
          };
          if (options.verifyParts && part.verify !== null) {
            await client.query(transform(part.verify, { kind, name, script: 'verify' }));
            result.verified = true;
          }
          parts.push(result);
        } catch (e) {
          await client.query('ROLLBACK');
          throw new EnvelopeApplyError(
            `Part ${kind}/${name} of envelope "${preview.name}@${preview.version}" failed: ` +
              `${e instanceof Error ? e.message : String(e)} — all part data rolled back ` +
              `(schema remains applied; see preview.rollbackPlan)`,
            preview,
            parts
          );
        }
      }
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  }

  return {
    preview,
    dryRun: false,
    executed: true,
    schema,
    parts,
    durationMs: Date.now() - started,
    timedOut: schema.timedOut
  };
}
