// The shape of a follow-up build's difference: what the plan card lists and
// what the pipeline calls. See delta.ts.

import type {
  createFieldTool,
  deleteFieldTool,
  deleteTableTool,
  updateFieldTool,
} from '@agentic-kit/db-tools/tools/mutations';
import type { Blueprint } from '@agentic-kit/harness';

import type { CuratedBlueprint } from '../blueprints/curated';
import type { SchemaSkew } from './live-model';
import type { ScopeInfo } from './scope-tree';
import type { SpecModel } from './spec-model';
import type { BlueprintNode, BlueprintPolicy } from './translate';
import type { AppSpecError, LiveSchema, SpecEntity, SpecField } from './types';

// The params a db-tools tool parses, so a change to its parameters is a compile
// error here rather than a failed build. They're the parsed type; these schemas
// have no defaults or transforms, so it's also what the tool accepts.
type ParamsOf<T extends { execute(...args: never[]): unknown }> = Parameters<T['execute']>[0];

type BelongsToRelation = Extract<
  NonNullable<Blueprint['definition']['relations']>[number],
  { $type: 'RelationBelongsTo' }
>;

/** provision_blueprint's parameters as the delta writes them: a link is a table, so every relation is a belongs-to. */
export type DeltaBlueprint = Omit<Blueprint, 'definition'> & {
  definition: Omit<Blueprint['definition'], 'relations'> & { relations?: BelongsToRelation[] };
};

/** One call of the db-tools tool it names, or a secure_table_provision row. */
export type DeltaCall =
  | { tool: 'provision_blueprint'; params: DeltaBlueprint }
  | { tool: 'create_field'; params: ParamsOf<typeof createFieldTool> }
  | { tool: 'update_field'; params: ParamsOf<typeof updateFieldTool> }
  | { tool: 'delete_field'; params: ParamsOf<typeof deleteFieldTool> }
  | { tool: 'delete_table'; params: ParamsOf<typeof deleteTableTool> }
  | {
      tool: 'secure_table_provision';
      params: {
        table_name: string;
        nodes?: BlueprintNode[];
        owns?: Array<'policies'>;
        policies?: BlueprintPolicy[];
      };
    };

export type AdditionKind =
  | 'add_table'
  | 'add_link'
  | 'add_field'
  | 'add_key'
  | 'widen_enum'
  | 'relax_required'
  | 'change_default';

/** The destructive changes in the order the card lists them: changes first, then removals, a key before its table. */
export const DESTRUCTIVE_KINDS = [
  'change_access',
  'restrict_values',
  'narrow_enum',
  'change_type',
  'require_field',
  'rename_field',
  'drop_key',
  'drop_field',
  'drop_link',
  'drop_table',
] as const;

export type DestructiveKind = (typeof DESTRUCTIVE_KINDS)[number];

/** A line on the card. `path` is in the new spec. */
export type Addition = { id: string; kind: AdditionKind; path: string; title: string };

/**
 * What an unticked removal puts back into the spec, so the spec matches the
 * database it stays in: a column (`hide`: off the screens, unless new rows
 * need a value for it), or a table, off the sidebar.
 */
export type KeptRemoval =
  | { table: string; field: SpecField; hide: boolean }
  | { entity: SpecEntity };

/**
 * A change the user opts into on the card, unticked at first. `path` is in the
 * spec that has the thing: the new one for a change, the previous one for a
 * removal. `requires` names the changes it can't run without; `fallback` runs
 * when it stays unticked, and `kept` is what it puts back into the spec then.
 */
export type DestructiveChange = {
  id: string;
  kind: DestructiveKind;
  path: string;
  title: string;
  loses: string;
  rows?: number;
  /** A rename's new name. */
  to?: string;
  call: DeltaCall;
  /** A drop_key's target table: deleting that table requires this change. */
  target?: string;
  requires?: string[];
  fallback?: DeltaCall;
  kept?: KeptRemoval;
};

export type AppSpecDelta = {
  additions: Addition[];
  /** What the additions run, in order. */
  calls: DeltaCall[];
  destructive: DestructiveChange[];
  warnings: string[];
  seed: {
    /** Per seeded table, the index of the first row to insert. */
    from: Record<string, number>;
    /** Tables whose earlier rows changed in the spec; the rows in the database stay. */
    kept: string[];
    rows: number;
  };
  /** Nothing for the database to do: regenerate the screens and verify. */
  uiOnly: boolean;
};

/** What planDelta returns: a refused change carries no calls, so it can't be run by mistake. */
export type DeltaPlan =
  | { ok: false; refused: AppSpecError[]; warnings: string[] }
  | { ok: true; delta: AppSpecDelta };

/**
 * What the database has that app-spec.json can't describe (live-spec.ts). The
 * planner keeps each as it is and refuses a spec that would take it over.
 */
export type ProtectedSchema = {
  /** Table → column → why the spec can't describe it. */
  columns: ReadonlyMap<string, ReadonlyMap<string, string>>;
  /** Tables whose policies are neither shared nor private. */
  access: ReadonlySet<string>;
  /** A curated blueprint's tables that were deleted outside the app. */
  curatedGone: ReadonlySet<string>;
};

export type DeltaOptions = {
  live?: LiveSchema;
  /** What the live database has that the spec can't describe; see ProtectedSchema. */
  protect?: ProtectedSchema;
  /** The columns raw SQL added outside metaschema; calls on them are skipped (delta-skew.ts). */
  skew?: SchemaSkew;
  /** The curated registry; the shipped blueprints unless a test passes its own. */
  blueprints?: Readonly<Record<string, CuratedBlueprint>>;
  /** The next spec's model, when the caller built it already (validateAppSpec's). */
  model?: SpecModel;
  /** Row counts per table, when they're known, for what a destructive change loses. */
  rows?: Readonly<Record<string, number>>;
  /**
   * The entity types' tables, with the columns each has now (`entityTableColumns`;
   * empty when unknown). The backend made them, so a spec entity that names one
   * only adds its missing columns.
   */
  entityTables?: ReadonlyMap<string, ReadonlySet<string>>;
  /** The entity types' tables were just made (a rebuild), so they have no rows yet. */
  freshEntityTables?: boolean;
  /** The database's membership scopes, or the ones a first build makes: a scope access needs them. */
  scopes?: readonly ScopeInfo[];
};
