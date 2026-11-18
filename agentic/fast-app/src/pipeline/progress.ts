// Tracks a build's phases, writes the `constructive.phase` marks, and streams
// the card's details, all from the same calls, so the marks and the card can
// never disagree.

import { type StepLog, withStepLog } from './activity';
import type {
  AppBuildDetails,
  AppBuildFailure,
  AppBuildPhase,
  AppBuildStage,
  OutsideChange,
  PhaseName,
  PipelinePhase,
  RenderCheckSummary,
  VerifyGaps,
} from './app-plan';
import type { PhaseMark } from './phases';
import { isNotReady, STILL_STARTING } from './transient';
import { hasGaps } from './verify-gaps';

export type PhaseReporter = {
  /** Appends a `constructive.phase` entry to the pi session. */
  mark(mark: PhaseMark): void;
  /** Streams the current details to the tool card. */
  update(details: AppBuildDetails): void;
};

// A failure the model can act on: the phase, what went wrong, what to change.
export class PhaseError extends Error {
  readonly phase: PhaseName;
  readonly cause: string;
  readonly fix: string;
  readonly checks?: AppBuildDetails['checks'];

  constructor(phase: PhaseName, cause: string, fix: string, checks?: AppBuildDetails['checks']) {
    super(`${phase}: ${cause}`);
    this.phase = phase;
    this.cause = cause;
    this.fix = fix;
    this.checks = checks;
  }

  toFailure(): AppBuildFailure {
    return {
      phase: this.phase,
      cause: this.cause,
      summary: this.cause.split('\n')[0],
      fix: this.fix,
    };
  }
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err ?? 'failed');

// The phases that talk to the backend; only their errors can be its "not ready".
const ASKS_BACKEND: ReadonlySet<PipelinePhase> = new Set([
  'provision',
  'schema',
  'codegen',
  'seed',
  'verify',
]);

/** A stage, with what it carries; `BuildProgress.enter` takes one. */
export type StageEntry =
  | { stage: 'approval'; existingDatabase?: true }
  | { stage: 'building'; startedAt?: number }
  | { stage: 'invalid'; errors: string[] }
  | { stage: 'unavailable'; errors?: string[] }
  | { stage: 'refreshed'; outside?: OutsideChange[]; adopted?: true }
  | { stage: 'declined' }
  | { stage: 'done'; timings?: AppBuildDetails['timings']; warnings?: string[] }
  | { stage: 'stopped' }
  | {
      stage: 'failed';
      failure: AppBuildFailure;
      checks?: AppBuildDetails['checks'];
      timings?: AppBuildDetails['timings'];
    };

// Where each stage may go; a stage with nowhere to go ends the call. Approval
// and building may be entered again, to add what they carry.
const NEXT: Record<AppBuildStage, readonly AppBuildStage[]> = {
  approval: [
    'approval',
    'building',
    'invalid',
    'unavailable',
    'refreshed',
    'declined',
    'failed',
    'stopped',
  ],
  building: ['building', 'unavailable', 'done', 'stopped', 'failed'],
  invalid: [],
  unavailable: [],
  refreshed: [],
  declined: [],
  done: [],
  stopped: [],
  failed: [],
};

// What a stage carries, which a move to another stage drops.
const STAGE_FIELDS = [
  'errors',
  'warnings',
  'outside',
  'adopted',
  'failure',
  'checks',
  'timings',
] as const satisfies ReadonlyArray<keyof AppBuildDetails>;

type StageField = (typeof STAGE_FIELDS)[number];

export type PhaseOptions = {
  /** What to do when the phase fails with an error that isn't a PhaseError already. */
  fix: string;
};

export class BuildProgress {
  readonly details: AppBuildDetails;
  /** The project folder: each step's log shows a command's working dir relative to it. */
  root: string | undefined;
  private reporter: PhaseReporter;
  private starts = new Map<string, number>();
  private render: RenderCheckSummary | undefined;
  private secrets: string[] = [];

  constructor(
    reporter: PhaseReporter,
    init: Pick<AppBuildDetails, 'kind' | 'name' | 'stage'> & { phases: readonly PipelinePhase[] },
  ) {
    this.reporter = reporter;
    this.details = {
      kind: init.kind,
      name: init.name,
      stage: init.stage,
      phases: init.phases.map((phase): AppBuildPhase => ({ phase, status: 'pending' })),
    };
  }

  /** Fields that don't belong to a stage: the name, the database, the Preview, the plan. */
  set(patch: Partial<Omit<AppBuildDetails, 'stage' | StageField>>): void {
    Object.assign(this.details, patch);
    this.emit();
  }

  /** Moves the card to a stage, the only way it moves; leaving a stage drops what it carried. */
  enter(entry: StageEntry): void {
    const from = this.details.stage;
    if (!NEXT[from].includes(entry.stage)) {
      throw new Error(`A ${this.details.kind} card can't go from ${from} to ${entry.stage}.`);
    }
    if (from !== entry.stage) for (const field of STAGE_FIELDS) delete this.details[field];
    Object.assign(this.details, entry);
    this.emit();
  }

  emit(): void {
    this.reporter.update(structuredClone(this.details));
  }

  /** Values the step logs take out wherever they appear: the owner's password, the .env's secrets. */
  addSecrets(values: readonly string[]): void {
    for (const value of values)
      if (value && !this.secrets.includes(value)) this.secrets.push(value);
  }

  /** Ends the call before any phase ran: the card says failed, never built or verified. */
  fail(phase: PhaseName, cause: string, fix: string): void {
    this.enter({ stage: 'failed', failure: new PhaseError(phase, cause, fix).toFailure() });
  }

  /**
   * Ends the call on an error one of its phases threw: stopped when the user
   * stopped it, else failed, with the error's checks. Returns the error when
   * the call failed and null when it stopped. Every step runs in a phase,
   * which turns its errors into PhaseErrors, so any other error is a bug and
   * is thrown again.
   */
  endOnError(
    err: unknown,
    stopped: boolean,
    timings?: AppBuildDetails['timings'],
  ): PhaseError | null {
    if (!(err instanceof PhaseError)) throw err;
    if (stopped) {
      this.enter({ stage: 'stopped' });
      return null;
    }
    this.enter({
      stage: 'failed',
      failure: err.toFailure(),
      ...(err.checks ? { checks: err.checks } : {}),
      ...(timings ? { timings } : {}),
    });
    return err;
  }

  /** Marks the card's wait for the timing report; the window closes also when the ask fails. */
  async waitForApproval<T>(ask: () => Promise<T>): Promise<T> {
    this.reporter.mark({ phase: 'approval', status: 'start', t: Date.now() });
    try {
      return await ask();
    } finally {
      this.reporter.mark({ phase: 'approval', status: 'end', t: Date.now() });
    }
  }

  /** The render check's outcome, on the card and the verify end mark, and what verify left unchecked. */
  renderCheck(summary: RenderCheckSummary, gaps?: VerifyGaps): void {
    this.render = summary;
    // Pages opened on test rows aren't a gap, but the card's details count them.
    const onTestRows = gaps?.detailPages?.onTestRows ?? 0;
    const keep = onTestRows > 0 || hasGaps(gaps);
    // A second run (the backend recheck) replaces the first one's gaps.
    if (keep) this.details.gaps = gaps;
    else delete this.details.gaps;
    this.set({ renderCheck: summary });
  }

  /**
   * Runs one phase. Any error that isn't a PhaseError becomes one of this
   * phase, with `fix`, or, when the backend still isn't ready, with the wait
   * and the call to make again.
   */
  async run<T>(
    phase: PipelinePhase,
    work: (note: (text: string) => void) => Promise<T>,
    { fix }: PhaseOptions,
  ): Promise<T> {
    const started = Date.now();
    this.starts.set(phase, started);
    this.reporter.mark({ phase, status: 'start', t: started });
    this.patchPhase(phase, { status: 'running', note: undefined, activity: [] });
    const note = (text: string) => this.patchPhase(phase, { note: text });
    try {
      const result = await withStepLog(this.stepLog(phase), () => work(note));
      this.finish(phase, 'done');
      return result;
    } catch (err) {
      // A step beside one that failed stops with that one's error (run-together.ts).
      const cancelled = err instanceof PhaseError && err.phase !== phase && this.failed(err.phase);
      this.finish(phase, cancelled ? 'cancelled' : 'failed');
      if (err instanceof PhaseError) throw err;
      const cause = errorMessage(err);
      const waits = ASKS_BACKEND.has(phase) && isNotReady(cause);
      throw new PhaseError(phase, cause, waits ? this.notReadyFix() : fix);
    }
  }

  // Where the phase's calls and commands go: its entry's list on the card.
  private stepLog(phase: PipelinePhase): StepLog {
    const entry = this.details.phases.find((p) => p.phase === phase);
    return {
      root: this.root,
      secrets: () => this.secrets,
      push: (activity) => {
        entry?.activity?.push(activity);
        return activity;
      },
      changed: () => this.emit(),
    };
  }

  private notReadyFix(): string {
    const tool = this.details.kind === 'app-verify' ? 'verify_app' : 'plan_app';
    return `${STILL_STARTING} Wait a minute, then call ${tool} again.`;
  }

  private failed(phase: PhaseName): boolean {
    return this.details.phases.some((p) => p.phase === phase && p.status === 'failed');
  }

  private finish(phase: PipelinePhase, status: 'done' | 'failed' | 'cancelled'): void {
    const t = Date.now();
    const ok = status === 'done';
    const render = phase === 'verify' ? this.render : undefined;
    if (phase === 'verify') this.render = undefined;
    this.reporter.mark({ phase, status: 'end', t, ok, ...(render ? { render } : {}) });
    const started = this.starts.get(phase) ?? t;
    this.patchPhase(phase, { status, ms: t - started });
  }

  private patchPhase(phase: PipelinePhase, patch: Partial<AppBuildPhase>): void {
    const entry = this.details.phases.find((p) => p.phase === phase);
    if (entry) Object.assign(entry, patch);
    this.emit();
  }
}
