// AppSpec v1 as the harness reads it. The types are the template's own
// (`contract/`, vendored by `pnpm sync:app-spec`); the JSON Schema beside them
// is the source of truth for the shape, and `validateAppSpec` checks a spec
// against it before anything here runs. Below are the names only the desktop
// uses.

import type { AppSpec, BackendExtend, SpecEntity } from './contract/app-spec.types';

export type * from './contract/app-spec.types';

export type AccessMode = NonNullable<SpecEntity['access']>;

export type CustomBackend = Extract<AppSpec['backend'], { kind: 'custom' }>;

/**
 * Additions beside a curated blueprint, for follow-up changes: new tables, new
 * columns and keys on the blueprint's tables (by table name), and links. The
 * blueprint's own tables and columns stay as they are.
 */
export type BlueprintExtend = BackendExtend;

export type BlueprintBackend = Extract<AppSpec['backend'], { kind: 'blueprint' }>;

/** One seed row: column → value, a "@<table>[<index>]" reference for a key. */
export type SeedRow = NonNullable<AppSpec['seed']>[string][number];

/** A problem in a spec: where it is (`backend.entities[0].name`) and what to do. */
export type AppSpecError = { path: string; message: string };

/** Table name → its column names, as the database has them now. */
export type LiveSchema = ReadonlyMap<string, ReadonlySet<string>>;
