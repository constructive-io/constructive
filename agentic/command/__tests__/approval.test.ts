import { type Approval, decideApproval } from '../src';

type Row = [dryRun: boolean, yes: boolean, interactive: boolean, expected: Approval];

// Every combination of the flags and the terminal of a run, for a change the layer has a plan of.
const rows: Row[] = [
  [true, true, true, 'show-plan'],
  [true, true, false, 'show-plan'],
  [true, false, true, 'show-plan'],
  [true, false, false, 'show-plan'],
  [false, true, true, 'apply'],
  [false, true, false, 'apply'],
  [false, false, true, 'ask'],
  [false, false, false, 'approval-required']
];

describe('decideApproval', () => {
  it.each(rows)('dry-run %s, yes %s, interactive %s: %s', (dryRun, yes, interactive, expected) => {
    expect(decideApproval({ dryRun, yes, interactive })).toBe(expected);
  });
});

describe('decideApproval with --approve', () => {
  it.each([true, false])('applies only the plan with that id, without a prompt (interactive %s)', (interactive) => {
    expect(decideApproval({ dryRun: false, yes: false, interactive, approve: 'abcdef123456' })).toBe('apply-if-same');
  });
});
