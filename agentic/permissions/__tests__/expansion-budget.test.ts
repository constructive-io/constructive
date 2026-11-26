import { analyzeBash } from '../src/bash/analyze';
import { Findings } from '../src/findings';
import { makeSandbox, type Sandbox } from './sandbox';

let sb: Sandbox;

beforeAll(async () => {
  sb = await makeSandbox();
});
afterAll(() => sb?.cleanup());

/** The engine runs on the host's main process, so a command must not make it build gigabytes of text. */
async function bounded(command: string) {
  const heap = process.memoryUsage().heapUsed;
  const started = Date.now();
  const d = await sb.bash(command, 'workspace');
  return { d, ms: Date.now() - started, heapMb: (process.memoryUsage().heapUsed - heap) / 1e6 };
}

describe('expansions stay within one budget per command', () => {
  it('charges the text printf prints to a program that reads it, before it builds the text', async () => {
    const { d, ms, heapMb } = await bounded('printf %500000000s x | psql');
    expect(d.decision).toBe('ask');
    expect(d.request.signals).toContain('unresolvable-path');
    expect(ms).toBeLessThan(1000);
    expect(heapMb).toBeLessThan(64);
  });

  it('builds no printed text that nothing reads', async () => {
    const { d, heapMb } = await bounded('printf %999999999s x | cat');
    expect(d.decision).toBe('allow');
    expect(heapMb).toBeLessThan(64);
  });

  it('stops a brace expansion of a long word before it builds the results', async () => {
    const { d, ms, heapMb } = await bounded(`echo ${'a'.repeat(60_000)}{1..4096}`);
    expect([d.decision, d.request.signals]).toEqual(['ask', ['unresolvable-path']]);
    expect(ms).toBeLessThan(1000);
    expect(heapMb).toBeLessThan(256);
  });

  it('finds the brace groups of a word in one pass, so tens of thousands of braces that make no group take no quadratic search', async () => {
    for (const word of ['{}'.repeat(30_000), '{a}'.repeat(20_000), `{${'{a}'.repeat(19_000)}`, '{'.repeat(60_000)]) {
      const { ms } = await bounded(`xargs -I{} echo ${word}`);
      expect([word.slice(0, 6), ms < 1000]).toEqual([word.slice(0, 6), true]);
    }
  });

  it('places the members of a tar command with thousands of -C dirs in one pass', () => {
    const started = Date.now();
    analyzeBash(`tar -cf x.tar${' -C . m'.repeat(3000)}`, { cwd: sb.ws, homeDir: sb.home }, new Findings());
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('expands a word of thousands of brace groups, one after another, without a deep recursion', async () => {
    const { d, ms } = await bounded(`echo ${'{a,b}'.repeat(2000)}`);
    expect([d.decision, d.request.signals]).toEqual(['ask', ['unresolvable-path']]);
    expect(ms).toBeLessThan(1000);
  });

  it('expands braces nested thousands deep without a deep recursion', async () => {
    const { d, ms } = await bounded(`echo ${'{a,'.repeat(4000)}b${'}'.repeat(4000)}`);
    expect([d.decision, d.request.signals]).toEqual(['ask', ['unresolvable-path']]);
    expect(ms).toBeLessThan(1000);
  });

  it('charges the text that xargs -I builds when it puts each line in place of its string', async () => {
    const { d, ms, heapMb } = await bounded(`printf '%s\\n' ${'a'.repeat(30_000)} | xargs -I@ echo ${'@'.repeat(15_000)}`);
    expect([d.decision, d.request.signals]).toEqual(['ask', ['unresolvable-path']]);
    expect(ms).toBeLessThan(1000);
    expect(heapMb).toBeLessThan(256);
  });

  it('charges the words each env -S pass reads again, so a chain of -S stops at the budget', async () => {
    const { d, ms } = await bounded(`env ${'-S '.repeat(8000)}true`);
    expect([d.decision, d.request.signals]).toEqual(['ask', ['unresolvable-path']]);
    expect(ms).toBeLessThan(1000);
  });

  it('charges a trap action each time a subshell that keeps it reads it again', async () => {
    const { d, ms } = await bounded(`trap '${'true;'.repeat(4000)}' DEBUG; ${'(:);'.repeat(4000)}`);
    expect(d.decision).toBe('ask');
    expect(d.request.signals).toContain('unresolvable-path');
    expect(ms).toBeLessThan(1000);
  });

  it('stops a variable that doubles itself before it builds the value', async () => {
    let command = 'v0=x';
    for (let k = 1; k <= 24; k++) command += `; v${k}=$v${k - 1}$v${k - 1}`;
    const { d, ms } = await bounded(`${command}; echo $v24`);
    expect([d.decision, d.request.signals]).toEqual(['ask', ['unresolvable-path']]);
    expect(ms).toBeLessThan(1000);
  });
});
