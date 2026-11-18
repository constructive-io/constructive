// The plan_app approval card and the build progress it turns into. The
// pipeline builds both; the renderer only draws them (src/types/app-plan.ts
// re-exports them).

/** What the plan card shows before anything runs. */
export type AppPlanPrompt = {
  name: string;
  tagline?: string;
  /** The project the app is in, as the sidebar names it. */
  project?: string;
  databaseName: string;
  /** A first build into the database that the project's .env names already. A follow-up always uses its own. */
  databaseBound?: true;
  backend:
    | { kind: 'blueprint'; slug: string; extend?: AppPlanExtension }
    | { kind: 'custom'; entities: AppPlanEntity[]; links: Array<[string, string]> };
  /** The sample rows the build inserts: all of the spec's on a first build, the new ones on a follow-up. */
  seedRows: number;
  /** Some of them go in only while their table is empty, so up to `seedRows` land. */
  seedOnlyIfEmpty?: true;
  nav: string[];
  account: {
    email: string;
    /** A remembered password exists, so the field can be left empty. */
    savedPassword: boolean;
    /** OS encryption is available, so "Remember" can be offered. */
    canRemember: boolean;
  };
  warnings: string[];
  /** A follow-up on a built app: what it adds, and what it would remove if the user ticks it. */
  changes?: AppPlanChanges;
  /** A follow-up: the parts it leaves as they were, which the card names in one line. */
  unchanged?: Array<'tables' | 'seed' | 'nav'>;
  /** What changed in the database outside the app since its last build; the build keeps it. */
  outside?: OutsideChange[];
};

type AppPlanKey = { field: string; to: string };

/** Who sees a table's rows: every app member, each row's creator, or the members of each row's entity. */
export type AppPlanAccess = 'shared' | 'private' | { scope: string };

export type AppPlanEntity = {
  name: string;
  label?: string;
  access: AppPlanAccess;
  fields: number;
  belongsTo: string[];
  /** Plans recorded before the schema diff only carry a count. */
  columns?: AppPlanField[];
  keys?: AppPlanKey[];
};

type AppPlanExtension = {
  entities: AppPlanEntity[];
  links: Array<[string, string]>;
  tables: Array<{ name: string; columns: AppPlanField[]; keys: AppPlanKey[] }>;
};

/** A field as the schema diff shows it. */
export type AppPlanField = {
  name: string;
  /** The type in the user's words ("text", "money", "date and time"), or "one of" with `values`. */
  type: string;
  required?: true;
  /** The values a field allows, each shown as a chip. */
  values?: string[];
};

/** The plan as the build card keeps it once approved: the destructive changes are the ticked ones. */
export type AppBuildPlan = Omit<AppPlanPrompt, 'account'>;

/** A change made to the database outside the app, by name, so a rename reads as a rename. */
export type OutsideChange =
  | { kind: 'table_added' | 'table_removed'; table: string }
  | { kind: 'table_renamed'; from: string; to: string }
  | { kind: 'column_added' | 'column_removed'; table: string; column: string; viaSql?: true }
  | { kind: 'column_renamed'; table: string; from: string; to: string }
  | {
      kind: 'column_changed';
      table: string;
      column: string;
      what: 'type' | 'required' | 'default' | 'values' | 'key';
      from: string;
      to: string;
    }
  | { kind: 'access_changed'; table: string; from: string; to: string };

/**
 * The card plan_app shows instead of the plan when the project's database is
 * gone: approving rebuilds the app in a new database from app-spec.json.
 */
export type AppReprovisionPrompt = {
  name: string;
  /** The project the app is in, as the sidebar names it. */
  project?: string;
  /** The database that is gone; its name when the project knew it. */
  oldDatabase: { name?: string };
  newDatabaseName: string;
  /** What app-spec.json brings back: its tables, and its sample rows. */
  rebuilds: { tables: number; seedRows: number };
  /** What the old database had that app-spec.json can't describe, one line each. */
  notRebuilt: string[];
  account: AppPlanPrompt['account'];
};

/** What a follow-up's change does, as the planner names it. */
export type AppPlanChangeKind =
  | 'add_table'
  | 'add_link'
  | 'add_field'
  | 'add_key'
  | 'widen_enum'
  | 'relax_required'
  | 'change_default'
  | 'change_access'
  | 'restrict_values'
  | 'narrow_enum'
  | 'change_type'
  | 'require_field'
  | 'rename_field'
  | 'drop_key'
  | 'drop_field'
  | 'drop_link'
  | 'drop_table';

/** One change of a follow-up: what it does, the table and the field it touches, and its line. */
export type AppPlanChange = {
  id: string;
  kind: AppPlanChangeKind;
  table: string;
  column?: string;
  title: string;
};

/** A change that loses data. It runs only when the user ticks it on the card. */
export type AppPlanDestructive = AppPlanChange & {
  /** What goes, in the user's words: "the 12 values in volunteers.notes". */
  lost: string;
  /** The rows the table had when the plan was made. */
  rows?: number;
  /** A rename's new name. */
  to?: string;
  /** Items that only make sense together with this one. */
  requires?: string[];
};

export type AppPlanChanges = {
  /** Applied with the build. */
  additions: AppPlanChange[];
  destructive: AppPlanDestructive[];
};

/** The build's steps, in the order they run; the card lists them. */
export type PipelinePhase =
  | 'provision'
  | 'schema'
  | 'codegen'
  | 'seed'
  | 'gen'
  | 'dev'
  | 'verify'
  | 'commit';

/** A step a card can name: the build's, the wait on the plan card, or the checks before either. */
export type PhaseName = 'setup' | 'approval' | PipelinePhase;

/** `cancelled`: the step ran beside one that failed, which stopped it before it finished. */
export type AppBuildPhaseStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';

/**
 * How an item in a step's details draws: a command as a code block, a
 * db-tools or API call as a row that opens to its arguments, a check as a
 * row that opens to its list, the files gen touched, a commit, or a fact in
 * one line.
 */
export type StepActivityKind = 'command' | 'call' | 'check' | 'files' | 'commit' | 'fact';

/** One line of a check: a route and its HTTP status, a page, a table and its CRUD. */
export type StepCheck = {
  name: string;
  status: string;
  failed?: true;
  /** What went wrong, or why it was skipped, under the line. */
  note?: string;
};

/**
 * One thing a build step ran, for the card's details. Labels, arguments,
 * details and excerpts are redacted in main before they get here, and the
 * card's copy buttons copy only these.
 */
export type StepActivity = {
  kind: StepActivityKind;
  /**
   * A command's line ("pnpm --silent lint:types"), a call's name
   * ("create_field"), a commit's message, or a sentence ("Fetched 14 routes").
   */
  label: string;
  /** A call's arguments in a few words: "shifts.status · text". */
  args?: string;
  /** A call's arguments in full, as JSON, redacted; or their first `paramsCutAt` characters. */
  params?: string;
  /** Where `params` was cut, so it is an excerpt and not JSON. */
  paramsCutAt?: number;
  /** Where a command ran, relative to the project: "packages/app". */
  cwd?: string;
  /** How a command exited, when it did. */
  exit?: number;
  /** Quiet words after it: a call's result, "timed out", "8 rows in one request". */
  detail?: string;
  /** How long it took; absent while it runs, and on a fact noted with no wait. */
  ms?: number;
  /** Still running: the building card shows it under the step. */
  running?: true;
  failed?: true;
  /** A check's lines, in order. */
  checks?: StepCheck[];
  /** A commit's short SHA. */
  sha?: string;
  /** Groups of paths, such as the files gen wrote; `more` counts the ones left out. */
  lists?: Array<{ label: string; items: string[]; more?: number }>;
  /** A command's last lines; a failed call's error. */
  output?: string;
};

export type AppBuildPhase = {
  phase: PipelinePhase;
  status: AppBuildPhaseStatus;
  ms?: number;
  note?: string;
  /** What the step ran, in order; a session from before it has none. */
  activity?: StepActivity[];
};

export type AppBuildFailure = {
  phase: PhaseName;
  cause: string;
  /** The cause's first line, for the card when the checks below it list the rest. */
  summary: string;
  fix: string;
};

/** What verify's render check did: the pages it opened, or why it didn't run. */
export type RenderCheckSummary = {
  pages: number;
  skipped?: string;
};

/** What a verify that passed didn't check: the card says "Verified with gaps" and names them. */
export type VerifyGaps = {
  /** Why the render check didn't run, so no page was opened in a browser. */
  renderSkipped?: string;
  /** Tables the CRUD check only read: the app can't delete from them, so it made no test row there. */
  readOnly?: string[];
  /**
   * The screens' detail pages: how many were opened, how many of those on the
   * CRUD check's test rows (their tables were empty), and the screens still
   * not opened, since their table had no row and the check made none there.
   */
  detailPages?: {
    rendered: number;
    noRow: string[];
    onTestRows?: number;
    /** Screen → why the CRUD check made no test row there, in its own words. */
    why?: Record<string, string>;
  };
  /** Test rows the CRUD check made and couldn't delete. */
  leftoverRows?: Array<{ table: string; id: string }>;
};

export type AppBuildStage =
  | 'invalid'
  | 'unavailable'
  | 'refreshed'
  | 'approval'
  | 'declined'
  | 'building'
  | 'done'
  | 'stopped'
  | 'failed';

/** plan_app / verify_app tool details, streamed while the build runs. */
export type AppBuildDetails = {
  kind: 'app-build' | 'app-verify';
  name: string;
  /**
   * Where the call is. It starts in `approval` (plan_app, before and while its
   * card waits) or `building` (verify_app), and ends in one of the others;
   * BuildProgress.enter is the only way it moves (main/fast-app/progress.ts).
   * `unavailable`: the project's database is gone, suspended or unreachable, so nothing ran.
   * `refreshed`: the database changed outside the app, so app-spec.json was written again and nothing was planned.
   * `stopped`: the user stopped the call. A session from before it says `failed`, with the STOPPED cause.
   */
  stage: AppBuildStage;
  phases: AppBuildPhase[];
  databaseName?: string;
  previewUrl?: string;
  failure?: AppBuildFailure;
  /** verify_app failures, one per check that failed. */
  checks?: Array<{ check: string; where?: string; message: string }>;
  renderCheck?: RenderCheckSummary;
  /** What a verify that passed left unchecked; only set when something was. */
  gaps?: VerifyGaps;
  timings?: { backendMs?: number; appMs?: number };
  /** `invalid`: one line per problem in the spec. `unavailable`: why, in one line. */
  errors?: string[];
  /** `done`: what the build left as it was or couldn't do, one line each. */
  warnings?: string[];
  /** `refreshed`: what changed outside the app. */
  outside?: OutsideChange[];
  /** `refreshed`: no build record described the database, so app-spec.json was written from it alone. */
  adopted?: true;
  /** The database was gone, and this call rebuilds the app in a new one. */
  rebuild?: true;
  /** The plan card said the build uses the project's database, so the database step says so too. */
  existingDatabase?: true;
  /** plan_app: the plan the user approved, with only the destructive changes they ticked. */
  plan?: AppBuildPlan;
  /** When the build started, in epoch ms, for the card's clock. */
  startedAt?: number;
  /** What the verify that passed covered: the routes it fetched and the tables it wrote to. */
  verified?: { routes: number; tables: number };
};
