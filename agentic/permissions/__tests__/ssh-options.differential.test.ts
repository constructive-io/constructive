import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { makeSandbox, type Sandbox } from './sandbox';

// `ssh -G` prints the config ssh would use and exits: it opens no connection and runs no command,
// so it shows how OpenSSH itself reads each argument order and -o spelling.
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ssh-g-'));
const runSshG = (args: string[]) =>
  spawnSync('ssh', ['-G', '-F', '/dev/null', ...args], { encoding: 'utf8', timeout: 5000, env: { PATH: '/usr/bin:/bin', HOME: home } });
/** The config `ssh -G` prints. A run that fails is an error, not an empty config, so a case ssh rejects cannot pass as one that runs nothing. */
const sshG = (args: string[]) => {
  const r = runSshG(args);
  if (r.error || r.status !== 0) {
    const why = r.error?.message ?? (r.signal ? `it was killed by ${r.signal}` : `it exited ${r.status}`);
    throw new Error(`ssh -G did not read ${JSON.stringify(args)}: ${why}. Check that the case is one OpenSSH accepts.\nstderr: ${r.stderr}`);
  }
  return r;
};
const available = (() => {
  const r = runSshG(['h']);
  return r.status === 0 && /^hostname h$/m.test(r.stdout);
})();

let sb: Sandbox;
beforeAll(async () => {
  sb = await makeSandbox();
});
afterAll(async () => {
  await sb.cleanup();
  fs.rmSync(home, { recursive: true, force: true });
});

const quote = (word: string) => `'${word.split("'").join("'\\''")}'`;

// Each case: ssh's arguments, with MARK standing for a file the ProxyCommand would create.
const cases: string[][] = [
  ['-o', 'ProxyCommand=touch MARK', 'h'],
  ['-o', 'ProxyCommand touch MARK', 'h'],
  ['-o', 'ProxyCommand\ttouch MARK', 'h'],
  ['-o', 'ProxyCommand = touch MARK', 'h'],
  ['-o', 'proxycommand=touch MARK', 'h'],
  ['-oProxyCommand=touch MARK', 'h'],
  ['h', '-o', 'ProxyCommand=touch MARK'],
  ['h', '-o', 'ProxyCommand=touch MARK', 'true'],
  ['-p', '22', 'h', '-l', 'u', '-o', 'ProxyCommand=touch MARK'],
  ['h', 'true', '-o', 'ProxyCommand=touch MARK'],
  ['--', 'h', '-o', 'ProxyCommand=touch MARK'],
  ['-o', 'LocalCommand=touch MARK', '-o', 'PermitLocalCommand=yes', 'h'],
  ['h', '-o', 'KnownHostsCommand=touch MARK']
];

(available ? describe : describe.skip)('ssh options, against ssh -G', () => {
  it.each(cases.map((c) => [JSON.stringify(c), c] as const))('%s', async (_, args) => {
    const mark = path.join(sb.ws, 'MARK');
    const words = args.map((a) => a.split('MARK').join(mark));
    const config = sshG(words).stdout;
    const runs = /^(proxycommand|localcommand|knownhostscommand) /m.test(config);
    const d = await sb.bash(`ssh ${words.map(quote).join(' ')}`, 'workspace');
    const seesCommand = d.request.targets.some((t) => t.path === mark && t.access === 'write');
    expect({ runs, seesCommand }).toEqual({ runs, seesCommand: runs });
  });

  it('reads -R after the destination as ssh does', async () => {
    expect(sshG(['h', '-R', '8080:localhost:80']).stdout).toMatch(/^remoteforward 8080 /m);
    const d = await sb.bash('ssh h -R 8080:localhost:80', 'workspace');
    expect(d.request.signals).toContain('network-exposure');
  });
});
