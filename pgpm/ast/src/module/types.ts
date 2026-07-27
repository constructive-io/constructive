import { PgpmHeader } from '../files/sql/header';
import { Change, ExtendedPlanFile } from '../files/types';

/**
 * The three script directions a pgpm change is materialized into on disk.
 */
export type PgpmScriptKind = 'deploy' | 'revert' | 'verify';

/**
 * The parsed AST of a single pgpm SQL script (one of deploy/revert/verify for a
 * change). Carries the structured header (verb/project/change/requires) plus the
 * body, and retains the byte-exact `raw` source so a read→write cycle is lossless.
 */
export interface PgpmScriptAst {
  kind: PgpmScriptKind;
  /** Structured header block (see {@link PgpmHeader}). */
  header: PgpmHeader;
  /** Everything after the header block, byte-exact. */
  body: string;
  /** The original file content, byte-exact. */
  raw: string;
}

/**
 * The AST of a single pgpm change: its plan entry (identity + dependencies +
 * attribution) together with the deploy/revert/verify scripts that implement it.
 * A script is `null` when the corresponding file does not exist on disk.
 */
export interface PgpmChangeAst {
  /** Path identity / plan change name (e.g. `schemas/auth/tables/users`). */
  name: string;
  /** The plan entry for this change (dependencies, timestamp, planner, ...). */
  plan: Change;
  deploy: PgpmScriptAst | null;
  revert: PgpmScriptAst | null;
  verify: PgpmScriptAst | null;
}

/**
 * The parsed AST of a module's Postgres extension `.control` file.
 */
export interface PgpmControlAst {
  /** The control file name (`<name>.control`). */
  fileName: string;
  /** Extension name (control basename, equals the plan project). */
  name: string;
  /** Extensions this module requires (from the control `requires =` line). */
  requires: string[];
  /** `default_version` from the control file. */
  version: string;
  /** The original file content, byte-exact. */
  raw: string;
}

/**
 * The unified in-memory AST for an entire pgpm module ("AST for the migrations").
 *
 * It composes the existing file-level parsers — plan parser, control reader, SQL
 * header parser — into a single typed object addressed by plan-order changes.
 * Operators (rename, rebundle, slice, transpile) become transforms over this tree
 * instead of ad-hoc file/plan re-reads. Every leaf keeps its byte-exact `raw`, so
 * {@link readModule} → {@link writeModule} is a lossless copy.
 */
export interface PgpmModuleAst {
  /** Directory the module was read from. */
  dir: string;
  /** Project (extension) name, from the plan `%project=`. */
  name: string;
  /** Parsed plan (package/uri/changes/tags). */
  plan: ExtendedPlanFile;
  /** The original `pgpm.plan` content, byte-exact. */
  planRaw: string;
  /** Parsed `.control`, or `null` when the module has no control file. */
  control: PgpmControlAst | null;
  /** Changes in plan order, each with its deploy/revert/verify scripts. */
  changes: PgpmChangeAst[];
}
