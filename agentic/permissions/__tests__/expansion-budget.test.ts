import { makeSandbox, type Sandbox } from './sandbox';

let sb: Sandbox;

beforeAll(async () => {
  sb = await makeSandbox();
});
afterAll(() => sb.cleanup());

/** The engine runs on the host's main process, so a command must not make it build gigabytes of text. */
async function bounded(command: string) {
  const heap = process.memoryUsage().heapUsed;
  const started = Date.now();
  const d = await sb.bash(command, 'workspace');
  return { d, ms: Date.now() - started, heapMb: (process.memoryUsage().heapUsed - heap) / 1e6 };
}

describe('expansions stay within one budget per command', () => {
  it('stops a brace expansion of a long word before it builds the results', async () => {
    const { d, ms, heapMb } = await bounded(`echo ${'a'.repeat(60_000)}{1..4096}`);
    expect([d.decision, d.request.signals]).toEqual(['ask', ['unresolvable-path']]);
    expect(ms).toBeLessThan(1000);
    expect(heapMb).toBeLessThan(256);
  });

  it('stops a variable that doubles itself before it builds the value', async () => {
    let command = 'v0=x';
    for (let k = 1; k <= 24; k++) command += `; v${k}=$v${k - 1}$v${k - 1}`;
    const { d, ms } = await bounded(`${command}; echo $v24`);
    expect([d.decision, d.request.signals]).toEqual(['ask', ['unresolvable-path']]);
    expect(ms).toBeLessThan(1000);
  });
});
