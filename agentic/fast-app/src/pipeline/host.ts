// What the app pipeline takes from the process it runs in. The pipeline and its
// tools never import Electron, the desktop's stores or its services: they ask
// the host. The desktop configures its host in bootstrap
// (fast-app-desktop/host.ts). A process with no UI, such as the cloud Job,
// gives its own: the optional members say what such a host can leave out, and
// the pipeline then skips that part.
//
// Like the db tools' host (@agentic-kit/db-tools/host), it is set once at
// startup and read at call time, so it can be set before the host's own
// services exist.

import type { AppPlanPrompt, AppReprovisionPrompt } from './app-plan';
import type { BuildPlan } from './build-plan';
import type { DevServerManager } from './dev-server';
import type { PhaseReporter } from './progress';
import type { ProjectLocks } from './project-lock';
import type { ProvisionedBinding } from './provisioned-binding';

/** A line on the running step's card. */
export type Note = (text: string) => void;

/** The signed-in platform account: whose password the card asks for, and who owns the app. */
export type FastAppAccount = { userId: string; email: string };

/** Why the project's database can't be used, as the host keeps it on the project. */
export type ProjectDatabaseState = {
  status: 'missing' | 'suspended' | 'other-account';
  /** Epoch ms of the check that first saw it. */
  since: number;
};

/** The project as the pipeline reads it; the host's record may hold more. */
export type FastAppProject = {
  id: string;
  name: string;
  cwd: string;
  databaseId?: string;
  databaseState?: ProjectDatabaseState;
  previewUrl?: string;
  /** The last address the app's dev server answered on, which its next server keeps. */
  devServerUrl?: string;
};

/**
 * The host's records of its projects. The pipeline passes back only the
 * projects it got here. Desktop: the project store. Headless: the run's
 * project, given as values, or none.
 */
export type ProjectRecords = {
  get(projectId: string): FastAppProject | undefined;
  /** The project whose folder is `cwd`. */
  at(cwd: string): FastAppProject | undefined;
  /**
   * The database the project is bound to; null when it has none. Desktop
   * makes its store and `.env` agree first. Headless: the run's database.
   */
  binding(cwd: string, project: FastAppProject | undefined): Promise<ProvisionedBinding | null>;
  /** Keeps why the database can't be used (null clears it); the project when it changed. */
  saveDatabaseState?(
    projectId: string,
    state: ProjectDatabaseState | null,
  ): Promise<FastAppProject | undefined>;
  /** Keeps where the app's dev server answers; the project when it changed. */
  saveDevServer?(projectId: string, url: string): Promise<FastAppProject | undefined>;
};

/**
 * The app template a build puts in `packages/app`. Desktop: the golden
 * snapshot (snapshot.ts). Headless: the app is in the clone already, so
 * `materialize` only installs its packages.
 */
export type AppTemplate = {
  /** Whether this host can give a project the app at all; app building is off without it. */
  available(): boolean;
  /** Puts the app in the project's `packages/app`, with its packages installed. */
  materialize(projectDir: string, signal?: AbortSignal): Promise<void>;
  /** The template's AppSpec schema, for a project whose app has no copy yet; null without one. */
  schemaFile(): Promise<string | null>;
};

/** The services the pipeline runs on. */
export type FastAppServices = {
  template: AppTemplate;
  devServers: DevServerManager;
  /** One build or check at a time in a project. */
  locks: ProjectLocks;
};

/** What a build asks of the host before its schema: the project's database. */
export type DatabaseRequest = {
  cwd: string;
  projectId: string | undefined;
  /** A rebuild names the gone database it replaces (`rebuildOf`). */
  plan: BuildPlan;
  signal: AbortSignal;
  note: Note;
};

/**
 * What the plan card's answer carries for the owner's sign-in. Desktop: the
 * account email and the password the user typed. Headless: the email alone.
 */
export type OwnerCredential = { email: string; password?: string };

/** The owner's session on the app database's own plane. */
export type OwnerSession = {
  databaseId: string;
  databaseName: string;
  /** The app plane, `api-<db>`. */
  endpoint: string;
  token: string;
  userId: string;
};

/**
 * The owner's session on the app database. Platform credentials don't work
 * there: only a token of the database's own realm does. Desktop: a password
 * sign-in through its data-auth broker. Headless: an API key of that realm.
 */
export type OwnerSessions = {
  /** Opens the session for a build, with what the card's answer carried. */
  signIn(cwd: string, credential: OwnerCredential): Promise<OwnerSession>;
  /**
   * The session without asking the user: one the host holds, else one it can
   * open on its own (desktop: with a password kept for the app). Null when
   * there is none.
   */
  resume(cwd: string, projectId: string | undefined): Promise<OwnerSession | null>;
};

/** What the plan card or the rebuild card shows. */
export type BuildCard =
  | { kind: 'app-plan'; plan: AppPlanPrompt }
  | { kind: 'app-reprovision'; plan: AppReprovisionPrompt };

export type CardRequest = {
  chatId: string;
  toolCallId: string;
  projectId: string | undefined;
  account: FastAppAccount;
  /** The card's title, such as "Build Food bank". */
  title: string;
  message: string;
  card: BuildCard;
  /** The destructive changes the user can tick, each with the ones it needs; a rebuild has none. */
  destructive: ReadonlyArray<{ id: string; requires?: string[] }>;
  /** The call's signal: a stop answers the card as declined. */
  signal: AbortSignal | undefined;
};

export type CardAnswer =
  | { approved: false; reason: string | undefined }
  | {
      approved: true;
      /** The ids of the destructive changes the user ticked. */
      destructive: string[];
      credential: OwnerCredential;
      /** Runs once the build ended, well or not (desktop: keeps the password when its box stayed ticked). */
      afterBuild?(): Promise<void>;
    };

/**
 * The plan card and the rebuild card. Desktop: the card in the chat, with
 * the password field. Headless: approval rows in the run log, with no
 * password.
 */
export type PlanCards = {
  /** The card's account line: the email, and whether a password is kept or can be kept. */
  account(
    projectId: string | undefined,
    account: FastAppAccount,
  ): Promise<AppPlanPrompt['account']>;
  /** Shows the card and waits for the user's answer. */
  ask(request: CardRequest): Promise<CardAnswer>;
};

export type RenderFailure = { route: string; message: string };

/** The failures, the pages opened (and their paths), and why the check didn't run when it didn't. */
export type RenderCheckResult = {
  failures: RenderFailure[];
  pages: number;
  opened?: string[];
  skipped?: string;
};

/** Opens each page as the owner in a browser and reports what failed to load. */
export type RenderCheck = (
  devUrl: string,
  routes: readonly string[],
  session: OwnerSession,
  signal?: AbortSignal,
) => Promise<RenderCheckResult>;

/** A side step of a build that never fails it: the warnings for the card. */
export type SideStep = (projectId: string | undefined, note: Note) => Promise<string[]>;

/** What changed in the project's database. */
export type DbChange =
  | { kind: 'schema'; cwd: string }
  | { kind: 'records'; tableName: string; cwd: string };

/** Appends a custom entry to the tool call's session; it never enters the model's context. */
export type AppendEntry = (customType: string, data: unknown) => void;

/**
 * Where a build's progress goes besides the tool's own updates and the phase
 * marks in the session: called once per tool call, with what it reports.
 * Headless: progress entries in the run log, flushed as they are written.
 */
export type ProgressWatch = (toolCallId: string, append: AppendEntry) => Partial<PhaseReporter>;

/** What the host's UI hears. */
export type FastAppEvents = {
  dbChanged(change: DbChange): void;
  projectUpdated(project: FastAppProject): void;
  /** The app's dev server answers on `url` now. */
  devServerUp(projectId: string, url: string): void;
  /** A build or verify_app checked the app, so the host's own last check of it is old. */
  appVerified(cwd: string): void;
};

export interface FastAppHost {
  /** The signed-in account; null when signed out. */
  account(): FastAppAccount | null;
  /** The chat a pi session belongs to; null when it has none. */
  chatId(sessionFile: string | undefined): string | null;
  /** The pipeline's services; null until the host has started them. */
  services(): FastAppServices | null;
  projects: ProjectRecords;
  /**
   * Makes sure the project has its database, before the schema step; the
   * name of the database it is bound to after. Throws a PhaseError of the
   * provision phase when it can't. Desktop: db-tools provisioning, with its
   * pending, name-taken, adopt and replace paths, and the binding saved.
   * Headless: checks that the database it was given is alive, and never
   * creates one.
   */
  ensureDatabase(request: DatabaseRequest): Promise<{ databaseName: string }>;
  owner: OwnerSessions;
  card: PlanCards;
  /** Without one, verify reports the render check as skipped, with the reason. */
  renderCheck?: RenderCheck;
  /** Adds the app's origins to the database's CORS lists. Skipped without one. */
  appOrigins?: SideStep;
  /** Sets up the site the database's emails link to. Skipped without one. */
  appSite?: SideStep;
  /** The host's remembered passwords, which a database found gone takes with it. */
  passwords?: { forgetProject(projectId: string): Promise<void> };
  /** Without them, nothing hears the pipeline's changes. */
  events?: FastAppEvents;
  /** Without one, the progress reaches only the tool's updates and the session's phase marks. */
  progress?: ProgressWatch;
  /** The blocks registry search_blocks reads in place of the one the app names. */
  blocksRegistryUrl?(): string | undefined;
  /**
   * Whether the host's UI can open the app's dev server. Default true. A
   * headless host sets false: the pipeline then leaves `previewUrl` out of the
   * card details and the tool results, because nobody can open a pod's dev
   * server.
   */
  preview?: boolean;
}

let current: FastAppHost | null = null;

export function configureFastAppHost(host: FastAppHost): void {
  current = host;
}

export function hostPreviews(): boolean {
  return getFastAppHost().preview !== false;
}

export function getFastAppHost(): FastAppHost {
  if (!current) {
    throw new Error(
      'The fast-app host is not configured. Call configureFastAppHost() before the app tools run.',
    );
  }
  return current;
}
