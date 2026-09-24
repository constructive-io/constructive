import fs from 'fs';
import os from 'os';
import path from 'path';

import { CliIo, resolveEnrollmentToken, runRunnerCli, TOKEN_ENV } from '../src/cli';
import { loadRunnerConfig } from '../src/config';

const TOKEN = 'enroll-1111111111111111111111111111111f';

function tmpConfig(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'machine-runner-cli-'));
  return path.join(dir, 'config.json');
}

function io(overrides: Partial<CliIo> = {}): CliIo & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    out: line => lines.push(line),
    readStdin: async () => '',
    env: {},
    ...overrides
  };
}

describe('machine-runner enroll', () => {
  it('reads the token from stdin and writes a 0600 config without echoing it', async () => {
    const configPath = tmpConfig();
    const cli = io({ readStdin: async () => `${TOKEN}\n` });
    await runRunnerCli(
      ['enroll', '--relay', 'wss://relay.example.com', '--machine', 'm-1', '--database', 'db-1', '--config', configPath],
      cli
    );

    const config = loadRunnerConfig(configPath);
    expect(config.enrollments).toEqual([
      {
        machineId: 'm-1',
        relayUrl: 'wss://relay.example.com',
        token: TOKEN,
        database: 'db-1'
      }
    ]);
    expect(fs.statSync(configPath).mode & 0o777).toBe(0o600);
    expect(cli.lines.join('\n')).not.toContain(TOKEN);
  });

  it('reads the token from the environment', async () => {
    const configPath = tmpConfig();
    const cli = io({ env: { [TOKEN_ENV]: TOKEN } });
    await runRunnerCli(
      ['enroll', '--relay', 'wss://r', '--machine', 'm-2', '--database', 'db-1', '--config', configPath],
      cli
    );
    expect(loadRunnerConfig(configPath).enrollments[0].token).toBe(TOKEN);
  });

  it('refuses a token passed in argv, because shell history is a log', async () => {
    await expect(
      resolveEnrollmentToken({ token: TOKEN }, io({ env: { [TOKEN_ENV]: TOKEN } }))
    ).rejects.toThrow(/refusing a token on the command line/);
  });

  it('refuses to enroll with no token anywhere', async () => {
    const configPath = tmpConfig();
    await expect(
      runRunnerCli(
        ['enroll', '--relay', 'wss://r', '--machine', 'm-3', '--database', 'db-1', '--config', configPath],
        io()
      )
    ).rejects.toThrow(/no enrollment token/);
    expect(fs.existsSync(configPath)).toBe(false);
  });

  it('keeps other enrollments and replaces the matching one', async () => {
    const configPath = tmpConfig();
    const cli = io({ env: { [TOKEN_ENV]: TOKEN } });
    await runRunnerCli(
      ['enroll', '--relay', 'wss://a', '--machine', 'm-1', '--database', 'db-1', '--config', configPath],
      cli
    );
    await runRunnerCli(
      ['enroll', '--relay', 'wss://b', '--machine', 'm-2', '--database', 'db-2', '--config', configPath],
      { ...cli, env: { [TOKEN_ENV]: 'enroll-2222222222222222222222222222222f' } }
    );
    await runRunnerCli(
      ['enroll', '--relay', 'wss://a', '--machine', 'm-1', '--database', 'db-3', '--config', configPath],
      { ...cli, env: { [TOKEN_ENV]: 'enroll-3333333333333333333333333333333f' } }
    );

    const config = loadRunnerConfig(configPath);
    expect(config.enrollments.map(e => [e.machineId, e.database])).toEqual([
      ['m-2', 'db-2'],
      ['m-1', 'db-3']
    ]);
  });
});

describe('machine-runner status', () => {
  it('reports enrollment facts and never the secret', async () => {
    const configPath = tmpConfig();
    const cli = io({ env: { [TOKEN_ENV]: TOKEN } });
    await runRunnerCli(
      ['enroll', '--relay', 'wss://r', '--machine', 'm-9', '--database', 'db-9', '--config', configPath],
      cli
    );
    cli.lines.length = 0;
    await runRunnerCli(['status', '--config', configPath], cli);

    const output = cli.lines.join('\n');
    expect(output).toContain('m-9');
    expect(output).toContain('db-9');
    expect(output).toContain('secret stored');
    expect(output).not.toContain(TOKEN);
  });

  it('says what to do when nothing is enrolled', async () => {
    const cli = io();
    await runRunnerCli(['status', '--config', path.join(os.tmpdir(), 'absent-machine-runner.json')], cli);
    expect(cli.lines.join('\n')).toContain('machine-runner enroll');
  });
});
