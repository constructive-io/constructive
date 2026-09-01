import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The action is a wrapper around flags that live somewhere else, which is
 * exactly the thing that rots silently: a renamed flag keeps the YAML valid
 * and breaks every consumer of the action at runtime. These tests pin the two
 * couplings — flags to the CLI, outputs to the report shape — and one bash
 * hazard that a composite step makes easy to reintroduce.
 */
const action = readFileSync(join(__dirname, '..', 'action.yml'), 'utf8');
// The action drives two commands — `baseline` picks the comparison, `audit`
// runs it — so a flag it emits must exist in one of them.
const cli = ['audit', 'baseline']
  .map((cmd) => readFileSync(join(__dirname, '..', 'src', 'cli', `${cmd}.ts`), 'utf8'))
  .join('\n');

describe('action.yml', () => {
  it('passes only flags the CLI accepts', () => {
    const flags = new Set(action.match(/--[a-z][a-z-]+/g) ?? []);
    // The action's own YAML keys (`--report-only` is a flag; `upload-sarif` is
    // an input) are not flags, so compare against what the run block emits.
    const emitted = [...flags].filter((f) => action.includes(`args+=(${f}`) || action.includes(`add ${f} `));
    expect(emitted.length).toBeGreaterThan(5);
    for (const flag of emitted) {
      expect(cli).toContain(flag);
    }
  });

  it('reads the report fields the report actually has', () => {
    // `score.value`/`score.grade`/`perf.score.value` — asserted here so a
    // rename of the Report shape fails a test rather than an Actions run.
    expect(action).toContain('score?.value');
    expect(action).toContain('score?.grade');
    expect(action).toContain('perf?.score?.value');
  });

  it('runs the CLI the install step resolved, not a bare global binary', () => {
    // `version: local` exists because a pgpm-workspace audit deploys through
    // pgsql-test, an optional peer that only the workspace has; a step that
    // calls plain `safegres` would work everywhere except there.
    const invocations = action.match(/^ *\S.*"\$\{args\[@\]\}"/gm) ?? [];
    expect(invocations).toHaveLength(2);
    for (const line of invocations) expect(line).toContain('steps.install.outputs.bin');
    expect(action).toContain('bin=npx --no-install safegres');
  });

  it('finds the reports through the resolved directory, not the `out` input', () => {
    // The documented shape puts the directory in the config (`outputs.dir`) and
    // passes no `out`, so anything reading a written file off `inputs.out`
    // silently points at the working directory for exactly those callers.
    expect(action).toContain('print-config');
    expect(action).toContain('outputs?.dir');
    expect(action).toContain('sarif_file: ${{ inputs.working-directory }}/${{ steps.audit.outputs.out-dir }}');
    expect(action).not.toMatch(/inputs\.out \}\}\/safegres\./);
  });

  it('never appends an argument with a bare test, which `set -e` would abort on', () => {
    expect(action).not.toMatch(/^\s*\[[^\]]*\]\s*&&\s*args\+=/m);
  });
});
