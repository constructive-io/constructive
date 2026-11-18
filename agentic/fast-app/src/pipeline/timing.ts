// Reads one pi session (its JSONL entries) and reports where the time went in
// a fast-app build: the backend phases, the app phases, human waits, and model
// time. Pure, so the benchmark CLI and the tests share it.

import type { RenderCheckSummary } from './app-plan';
import { isBackendPhase, isPhaseMark, PHASE_ENTRY_TYPE, type PhaseMark } from './phases';

const APPROVAL_REQUEST = 'constructive.approval.request';
const APPROVAL_RESOLUTION = 'constructive.approval.resolution';

export type PhaseSpan = {
  phase: string;
  start: number;
  end?: number;
  ms?: number;
  ok?: boolean;
  /** On a verify: whether its pages were opened in a browser (absent before marks carried it). */
  render?: RenderCheckSummary;
};

export type TimingReport = {
  phases: PhaseSpan[];
  /** First backend phase start → last backend phase end. */
  backendMs: number | null;
  /** Last backend phase end → end of the first passing verify: the generated app. */
  appToFirstVerifyMs: number | null;
  /** Last backend phase end → end of the last passing verify: the full prompt, custom code included. */
  appToLastVerifyMs: number | null;
  /** No backend phase in the session: a code-only turn, timed from its first prompt. */
  codeOnly: boolean;
  /** First passing verify → last passing verify: the custom code turn. */
  customTurnMs: number;
  /** Approval card waits, from the approval rows and the `approval` phase marks. */
  humanWaitMs: number;
  humanWaitInAppMs: number;
  /** Time the assistant messages took to generate. */
  modelMs: number;
  modelInAppMs: number;
  modelInCustomTurnMs: number;
  /** Verify runs after the backend (the pipeline's and every verify_app). */
  verifyRuns: number;
  verifyFailures: number;
  /** Verify runs that came after a failed one: each is a repair attempt. */
  repairs: number;
  verifyPassed: boolean;
  /** Verify runs whose render check opened the pages, skipped, or left no record. */
  renderChecks: { ran: number; skipped: number; unknown: number };
  /** The last verify of the session passed, so nothing after it is unverified. */
  lastVerifyPassed: boolean;
  /** First entry → last entry of the session. */
  wallMs: number | null;
};

type Entry = {
  type?: string;
  timestamp?: string;
  customType?: string;
  data?: unknown;
  message?: {
    role?: string;
    customType?: string;
    timestamp?: number;
    durationMs?: number;
    details?: { toolCallId?: string };
  };
};

export function parseSessionJsonl(text: string): unknown[] {
  const entries: unknown[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch {
      // A torn last line (a session still being written) is not an entry.
    }
  }
  return entries;
}

function entryTime(entry: Entry): number | null {
  const parsed = entry.timestamp ? Date.parse(entry.timestamp) : NaN;
  return Number.isNaN(parsed) ? null : parsed;
}

function phaseMarks(entries: Entry[]): PhaseMark[] {
  return entries
    .filter((e) => e.type === 'custom' && e.customType === PHASE_ENTRY_TYPE && isPhaseMark(e.data))
    .map((e) => e.data as PhaseMark);
}

// Pairs each start with the next end of the same phase. A start with no end
// (a run stopped mid-phase) stays open.
function spans(marks: PhaseMark[]): PhaseSpan[] {
  const open = new Map<string, PhaseSpan>();
  const result: PhaseSpan[] = [];
  for (const mark of [...marks].sort((a, b) => a.t - b.t)) {
    if (mark.status === 'start') {
      const span: PhaseSpan = { phase: mark.phase, start: mark.t };
      open.set(mark.phase, span);
      result.push(span);
      continue;
    }
    const span = open.get(mark.phase);
    if (!span) continue;
    open.delete(mark.phase);
    span.end = mark.t;
    span.ms = mark.t - span.start;
    if (mark.ok !== undefined) span.ok = mark.ok;
    if (mark.render) span.render = mark.render;
  }
  return result;
}

type Window = { from: number; to: number };

const inWindow = (t: number, w: Window | null) => w !== null && t >= w.from && t <= w.to;

function approvalWaits(entries: Entry[], phaseSpans: PhaseSpan[]): Array<Window> {
  const requests = new Map<string, number>();
  const waits: Window[] = [];
  for (const entry of entries) {
    const message = entry.message;
    if (entry.type !== 'message' || message?.role !== 'custom') continue;
    const id = message.details?.toolCallId;
    const t = message.timestamp ?? entryTime(entry);
    if (!id || t == null) continue;
    if (message.customType === APPROVAL_REQUEST) requests.set(id, t);
    if (message.customType === APPROVAL_RESOLUTION) {
      const from = requests.get(id);
      if (from !== undefined) waits.push({ from, to: t });
      requests.delete(id);
    }
  }
  for (const span of phaseSpans) {
    if (span.phase === 'approval' && span.end !== undefined) {
      waits.push({ from: span.start, to: span.end });
    }
  }
  return merged(waits);
}

// plan_app's card is both an approval row pair and an approval phase, so the
// same wait comes in twice: overlapping windows count once.
function merged(windows: Window[]): Window[] {
  const result: Window[] = [];
  for (const w of [...windows].sort((a, b) => a.from - b.from)) {
    const last = result[result.length - 1];
    if (last && w.from <= last.to) last.to = Math.max(last.to, w.to);
    else result.push({ ...w });
  }
  return result;
}

export function computeTiming(rawEntries: readonly unknown[]): TimingReport {
  const entries = rawEntries.filter((e): e is Entry => Boolean(e) && typeof e === 'object');
  const phaseSpans = spans(phaseMarks(entries));
  const backend = phaseSpans.filter((s) => isBackendPhase(s.phase));
  // A backend step that failed didn't finish the backend; only its successes count.
  const backendEnds = backend
    .filter((s) => s.end !== undefined && s.ok !== false)
    .map((s) => s.end as number);
  const lastBackendEnd = backendEnds.length ? Math.max(...backendEnds) : null;

  // The run that finished the backend: its provision start is the latest one
  // before the backend finished (an earlier plan_app attempt doesn't count).
  let backendMs: number | null = null;
  if (lastBackendEnd !== null) {
    const starts = backend.filter((s) => s.start <= lastBackendEnd);
    const provisionStarts = starts.filter((s) => s.phase === 'provision').map((s) => s.start);
    const from = provisionStarts.length
      ? Math.max(...provisionStarts)
      : Math.min(...starts.map((s) => s.start));
    backendMs = lastBackendEnd - from;
  }

  // A follow-up that only changes code runs no backend: its app phase starts at the prompt.
  const firstPrompt = entries.find((e) => e.type === 'message' && e.message?.role === 'user');
  const appStart = lastBackendEnd ?? (firstPrompt ? entryTime(firstPrompt) : null);
  const verifies =
    appStart === null
      ? []
      : phaseSpans.filter(
        (s) => s.phase === 'verify' && s.end !== undefined && s.start >= appStart,
      );
  const passing = verifies.filter((s) => s.ok !== false);
  const firstPass = passing[0]?.end;
  const lastPass = passing[passing.length - 1]?.end;
  const appWindow: Window | null =
    appStart !== null && lastPass !== undefined ? { from: appStart, to: lastPass } : null;
  const customWindow: Window | null =
    firstPass !== undefined && lastPass !== undefined && lastPass > firstPass
      ? { from: firstPass, to: lastPass }
      : null;
  const verifyFailures = verifies.filter((s) => s.ok === false).length;
  const repairs = verifies.filter((_, i) => i > 0 && verifies[i - 1].ok === false).length;

  const waits = approvalWaits(entries, phaseSpans);
  const humanWaitMs = waits.reduce((sum, w) => sum + (w.to - w.from), 0);
  const humanWaitInAppMs = waits
    .filter((w) => inWindow(w.from, appWindow))
    .reduce((sum, w) => sum + (w.to - w.from), 0);

  let modelMs = 0;
  let modelInAppMs = 0;
  let modelInCustomTurnMs = 0;
  for (const entry of entries) {
    const message = entry.message;
    if (entry.type !== 'message' || message?.role !== 'assistant') continue;
    const t = entryTime(entry);
    // Older pi builds record the duration; newer ones only the start, so the
    // entry's own time (the message's end) gives it.
    const ms =
      typeof message.durationMs === 'number'
        ? message.durationMs
        : t !== null && typeof message.timestamp === 'number'
          ? Math.max(0, t - message.timestamp)
          : 0;
    modelMs += ms;
    if (t !== null && inWindow(t, appWindow)) modelInAppMs += ms;
    if (t !== null && inWindow(t, customWindow)) modelInCustomTurnMs += ms;
  }

  const times = entries.map(entryTime).filter((t): t is number => t !== null);
  return {
    phases: phaseSpans,
    backendMs,
    appToFirstVerifyMs:
      lastBackendEnd !== null && firstPass !== undefined ? firstPass - lastBackendEnd : null,
    appToLastVerifyMs: appWindow ? appWindow.to - appWindow.from : null,
    codeOnly: lastBackendEnd === null,
    customTurnMs: customWindow ? customWindow.to - customWindow.from : 0,
    humanWaitMs,
    humanWaitInAppMs,
    modelMs,
    modelInAppMs,
    modelInCustomTurnMs,
    verifyRuns: verifies.length,
    verifyFailures,
    repairs,
    verifyPassed: passing.length > 0,
    renderChecks: {
      ran: verifies.filter((s) => s.render && !s.render.skipped).length,
      skipped: verifies.filter((s) => s.render?.skipped).length,
      unknown: verifies.filter((s) => !s.render).length,
    },
    lastVerifyPassed: verifies.length > 0 && verifies[verifies.length - 1].ok !== false,
    wallMs: times.length ? Math.max(...times) - Math.min(...times) : null,
  };
}

const seconds = (ms: number | null | undefined) =>
  ms == null ? 'n/a' : `${(ms / 1000).toFixed(1)} s`;

export function formatTiming(report: TimingReport): string {
  const unverified = !report.verifyPassed
    ? ' (verify never passed)'
    : report.lastVerifyPassed
      ? ''
      : ' (the last verify failed)';
  const lines = [
    `Backend phase:              ${seconds(report.backendMs)}`,
    `App phase, generated app:   ${seconds(report.appToFirstVerifyMs)}`,
    report.codeOnly
      ? `Code-only turn, prompt to last passing verify: ${seconds(report.appToLastVerifyMs)}${unverified}`
      : `App phase, full prompt:     ${seconds(report.appToLastVerifyMs)}${unverified}`,
    `Custom code turn:           ${seconds(report.customTurnMs)} (model: ${seconds(report.modelInCustomTurnMs)})`,
    `Verify runs:                ${report.verifyRuns} (${report.verifyFailures} failed, ${report.repairs} repairs)`,
    `Render check:               ran in ${report.renderChecks.ran}, skipped in ${report.renderChecks.skipped}, no record in ${report.renderChecks.unknown}`,
    `Human waits:                ${seconds(report.humanWaitMs)} (in app phase: ${seconds(report.humanWaitInAppMs)})`,
    `Model time:                 ${seconds(report.modelMs)} (in app phase: ${seconds(report.modelInAppMs)})`,
    `Session wall:               ${seconds(report.wallMs)}`,
    '',
    'Phases:',
  ];
  for (const span of report.phases) {
    const status = span.end === undefined ? 'open' : span.ok === false ? 'failed' : 'ok';
    const render = !span.render
      ? ''
      : span.render.skipped
        ? `  render check skipped: ${span.render.skipped}`
        : `  render check: ${span.render.pages} pages`;
    lines.push(`  ${span.phase.padEnd(10)} ${seconds(span.ms).padStart(9)}  ${status}${render}`);
  }
  return lines.join('\n');
}
