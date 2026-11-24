import assert from 'node:assert/strict';

import { PHASE_ENTRY_TYPE } from '../../src/pipeline/phases';
import { computeTiming, formatTiming, parseSessionJsonl } from '../../src/pipeline/timing';

const T0 = Date.parse('2026-10-19T10:00:00.000Z');
const at = (s: number) => T0 + s * 1000;
const iso = (s: number) => new Date(at(s)).toISOString();

const mark = (phase: string, status: 'start' | 'end', s: number, ok?: boolean) => ({
  type: 'custom',
  customType: PHASE_ENTRY_TYPE,
  timestamp: iso(s),
  data: { phase, status, t: at(s), ...(ok === undefined ? {} : { ok }) },
});

const assistant = (s: number, durationMs: number) => ({
  type: 'message',
  timestamp: iso(s),
  message: { role: 'assistant', timestamp: at(s) - durationMs, durationMs },
});

const approvalRow = (kind: 'request' | 'resolution', s: number, toolCallId: string) => ({
  type: 'message',
  timestamp: iso(s),
  message: {
    role: 'custom',
    customType: `constructive.approval.${kind}`,
    timestamp: at(s),
    details: { toolCallId },
  },
});

test('splits backend and app time at the end of the last backend phase', () => {
  const report = computeTiming([
    assistant(5, 4000),
    mark('approval', 'start', 6),
    mark('approval', 'end', 26),
    mark('provision', 'start', 26),
    mark('provision', 'end', 40),
    mark('schema', 'start', 40),
    mark('schema', 'end', 55),
    // codegen and seed run in parallel; codegen finishes last.
    mark('codegen', 'start', 55),
    mark('seed', 'start', 55),
    mark('seed', 'end', 58),
    mark('codegen', 'end', 70),
    mark('gen', 'start', 70),
    mark('gen', 'end', 75),
    mark('dev', 'start', 75),
    mark('dev', 'end', 85),
    mark('verify', 'start', 85),
    mark('verify', 'end', 130, true),
    mark('commit', 'start', 130),
    mark('commit', 'end', 131),
    assistant(150, 9000),
    // A message without durationMs is timed from its start to its entry.
    {
      type: 'message',
      timestamp: iso(170),
      message: { role: 'assistant', timestamp: at(167) },
    },
  ]);

  assert.equal(report.backendMs, 44_000);
  assert.equal(report.appToFirstVerifyMs, 60_000);
  assert.equal(report.appToLastVerifyMs, 60_000);
  assert.equal(report.customTurnMs, 0);
  assert.equal(report.humanWaitMs, 20_000);
  assert.equal(report.humanWaitInAppMs, 0);
  assert.equal(report.modelMs, 16_000);
  assert.equal(report.modelInAppMs, 0);
  assert.equal(report.verifyPassed, true);
});

test('the clock runs to the last passing verify after the custom code turn', () => {
  const report = computeTiming([
    mark('provision', 'start', 0),
    mark('seed', 'start', 10),
    mark('seed', 'end', 20),
    // The pipeline's verify passes: the generated app is done.
    mark('verify', 'start', 30),
    mark('verify', 'end', 40, true),
    // The custom turn: code, a failing verify, a repair, a passing verify.
    assistant(90, 25_000),
    mark('verify', 'start', 95),
    mark('verify', 'end', 100, false),
    approvalRow('request', 101, 'call-1'),
    approvalRow('resolution', 106, 'call-1'),
    assistant(120, 10_000),
    mark('verify', 'start', 125),
    mark('verify', 'end', 140, true),
  ]);

  assert.equal(report.appToFirstVerifyMs, 20_000);
  assert.equal(report.appToLastVerifyMs, 120_000);
  assert.equal(report.customTurnMs, 100_000);
  assert.equal(report.modelInCustomTurnMs, 35_000);
  assert.equal(report.humanWaitInAppMs, 5_000);
  assert.deepEqual(
    [report.verifyRuns, report.verifyFailures, report.repairs, report.lastVerifyPassed],
    [3, 1, 1, true],
  );
});

test('a custom turn that ends on a failing verify is reported as unverified', () => {
  const report = computeTiming([
    mark('provision', 'start', 0),
    mark('seed', 'start', 10),
    mark('seed', 'end', 20),
    mark('verify', 'start', 30),
    mark('verify', 'end', 40, true),
    mark('verify', 'start', 60),
    mark('verify', 'end', 70, false),
  ]);
  assert.equal(report.appToLastVerifyMs, 20_000);
  assert.equal(report.lastVerifyPassed, false);
});

test('counts the verifies whose render check ran, skipped, or left no record', () => {
  const verifyEnd = (s: number, render?: { pages: number; skipped?: string }) => {
    const entry = mark('verify', 'end', s, true);
    return render ? { ...entry, data: { ...entry.data, render } } : entry;
  };
  const report = computeTiming([
    mark('seed', 'start', 0),
    mark('seed', 'end', 10),
    mark('verify', 'start', 10),
    verifyEnd(20, { pages: 6 }),
    mark('verify', 'start', 30),
    verifyEnd(40, { pages: 0, skipped: 'sign-in took over 20 s' }),
    mark('verify', 'start', 50),
    verifyEnd(60),
  ]);

  assert.deepEqual(report.renderChecks, { ran: 1, skipped: 1, unknown: 1 });
  assert.match(formatTiming(report), /render check skipped: sign-in took over 20 s/);
});

test('a backend step that failed does not move the start of the app clock', () => {
  const report = computeTiming([
    mark('provision', 'start', 0),
    mark('provision', 'end', 10, true),
    mark('seed', 'start', 10),
    mark('seed', 'end', 20, true),
    mark('codegen', 'start', 10),
    mark('codegen', 'end', 25, false),
    mark('verify', 'start', 30),
    mark('verify', 'end', 40, true),
  ]);
  assert.equal(report.backendMs, 20_000);
  assert.equal(report.appToFirstVerifyMs, 20_000);
});

test('a second plan_app run is timed from its own provision start', () => {
  const report = computeTiming([
    mark('provision', 'start', 0),
    mark('provision', 'end', 10, false),
    mark('provision', 'start', 100),
    mark('provision', 'end', 110),
    mark('seed', 'start', 110),
    mark('seed', 'end', 120),
  ]);

  assert.equal(report.backendMs, 20_000);
  assert.equal(report.appToLastVerifyMs, null);
  assert.equal(report.verifyPassed, false);
});

test('parses JSONL and skips a torn trailing line', () => {
  const text = [
    JSON.stringify(mark('gen', 'start', 0)),
    JSON.stringify(mark('gen', 'end', 2)),
    '{"type":"cus',
  ].join('\n');
  const report = computeTiming(parseSessionJsonl(text));
  assert.deepEqual(
    report.phases.map((s) => [s.phase, s.ms]),
    [['gen', 2000]],
  );
});

test('times a code-only follow-up from its prompt to its last passing verify', () => {
  const report = computeTiming([
    { type: 'message', timestamp: iso(0), message: { role: 'user' } },
    assistant(30, 25000),
    mark('dev', 'start', 40),
    mark('dev', 'end', 40),
    mark('verify', 'start', 40),
    mark('verify', 'end', 62, true),
    mark('commit', 'start', 62),
    mark('commit', 'end', 63),
  ]);
  assert.equal(report.codeOnly, true);
  assert.equal(report.backendMs, null);
  assert.equal(report.appToLastVerifyMs, 62_000);
  assert.equal(report.verifyRuns, 1);
  assert.equal(report.verifyPassed, true);
  assert.match(formatTiming(report), /Code-only turn, prompt to last passing verify: 62\.0 s\n/);
});

test("plan_app's card wait counts once, though it is both an approval phase and an approval row pair", () => {
  const report = computeTiming([
    mark('approval', 'start', 10),
    approvalRow('request', 10, 'call-1'),
    approvalRow('resolution', 40, 'call-1'),
    mark('approval', 'end', 40),
  ]);
  assert.equal(report.humanWaitMs, 30_000);
});
