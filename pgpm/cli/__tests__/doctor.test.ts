import {
  checkDocker,
  checkDockerCompose,
  checkNode,
  checkPsql,
  CommandRunner,
  detectPlatform,
  dockerDaemonGuidance,
  dockerInstallGuidance,
  ExecResult,
  getDockerStatus,
  parsePsqlMajor,
  psqlInstallGuidance,
  summarizeChecks
} from '../src/utils/doctor';

const ok = (stdout = ''): ExecResult => ({ code: 0, stdout, stderr: '' });
const notFound = (): ExecResult => ({ code: 127, stdout: '', stderr: 'command not found' });
const fail = (stderr = ''): ExecResult => ({ code: 1, stdout: '', stderr });

const makeRunner = (responses: Record<string, ExecResult>): CommandRunner => {
  return async (command, args) => {
    const key = `${command} ${args.join(' ')}`;
    if (key in responses) {
      return responses[key];
    }
    return notFound();
  };
};

describe('detectPlatform', () => {
  it('detects macos', () => {
    expect(detectPlatform('darwin')).toEqual({ platform: 'macos' });
  });

  it('detects windows', () => {
    expect(detectPlatform('win32')).toEqual({ platform: 'windows' });
  });

  it('detects linux distro from os-release', () => {
    const readFile = (path: string): string => {
      if (path === '/etc/os-release') return 'NAME="Ubuntu"\nID=ubuntu\n';
      if (path === '/proc/version') return 'Linux version 6.5.0-generic';
      throw new Error('not found');
    };
    expect(detectPlatform('linux', readFile)).toEqual({ platform: 'linux', distro: 'ubuntu' });
  });

  it('detects wsl via /proc/version', () => {
    const readFile = (path: string): string => {
      if (path === '/etc/os-release') return 'ID=ubuntu\n';
      if (path === '/proc/version') return 'Linux version 5.15.90.1-microsoft-standard-WSL2';
      throw new Error('not found');
    };
    expect(detectPlatform('linux', readFile)).toEqual({ platform: 'wsl', distro: 'ubuntu' });
  });

  it('handles unreadable files', () => {
    const readFile = (): string => {
      throw new Error('not found');
    };
    expect(detectPlatform('linux', readFile)).toEqual({ platform: 'linux', distro: undefined });
  });
});

describe('getDockerStatus', () => {
  it('reports missing binary', async () => {
    const status = await getDockerStatus(makeRunner({}));
    expect(status).toEqual({ binary: false, daemon: false });
  });

  it('reports binary present but daemon down', async () => {
    const status = await getDockerStatus(makeRunner({
      'docker --version': ok('Docker version 27.0.0'),
      'docker info': fail('Cannot connect to the Docker daemon')
    }));
    expect(status).toEqual({ binary: true, daemon: false });
  });

  it('reports binary and daemon available', async () => {
    const status = await getDockerStatus(makeRunner({
      'docker --version': ok('Docker version 27.0.0'),
      'docker info': ok('Server: ...')
    }));
    expect(status).toEqual({ binary: true, daemon: true });
  });
});

describe('checkDocker', () => {
  it('fails with install guidance when binary is missing', async () => {
    const result = await checkDocker({ platform: 'macos' }, makeRunner({}));
    expect(result.status).toBe('fail');
    expect(result.remediation).toBe(dockerInstallGuidance({ platform: 'macos' }));
  });

  it('fails with daemon guidance when daemon is down', async () => {
    const result = await checkDocker({ platform: 'linux', distro: 'ubuntu' }, makeRunner({
      'docker --version': ok('Docker version 27.0.0'),
      'docker info': fail('Cannot connect to the Docker daemon')
    }));
    expect(result.status).toBe('fail');
    expect(result.remediation).toBe(dockerDaemonGuidance({ platform: 'linux', distro: 'ubuntu' }));
    expect(result.remediation).toContain('systemctl start docker');
  });

  it('passes when docker is fully available', async () => {
    const result = await checkDocker({ platform: 'linux' }, makeRunner({
      'docker --version': ok('Docker version 27.0.0'),
      'docker info': ok('Server: ...')
    }));
    expect(result.status).toBe('pass');
  });
});

describe('checkDockerCompose', () => {
  it('passes with the compose plugin', async () => {
    const result = await checkDockerCompose({ platform: 'linux' }, makeRunner({
      'docker compose version': ok('Docker Compose version v2.27.0')
    }));
    expect(result.status).toBe('pass');
  });

  it('passes with standalone docker-compose', async () => {
    const result = await checkDockerCompose({ platform: 'linux' }, makeRunner({
      'docker-compose --version': ok('docker-compose version 1.29.2')
    }));
    expect(result.status).toBe('pass');
  });

  it('warns when compose is missing', async () => {
    const result = await checkDockerCompose({ platform: 'macos' }, makeRunner({}));
    expect(result.status).toBe('warn');
    expect(result.remediation).toContain('Docker Desktop');
  });
});

describe('parsePsqlMajor', () => {
  it('parses standard version output', () => {
    expect(parsePsqlMajor('psql (PostgreSQL) 18.1')).toBe(18);
    expect(parsePsqlMajor('psql (PostgreSQL) 15.4 (Ubuntu 15.4-1)')).toBe(15);
  });

  it('returns null for unparseable output', () => {
    expect(parsePsqlMajor('something unexpected')).toBeNull();
  });
});

describe('checkPsql', () => {
  it('fails with OS guidance when psql is missing', async () => {
    const result = await checkPsql({ platform: 'macos' }, makeRunner({}));
    expect(result.status).toBe('fail');
    expect(result.remediation).toBe(psqlInstallGuidance({ platform: 'macos' }));
    expect(result.remediation).toContain('brew install libpq');
  });

  it('warns for old psql versions', async () => {
    const result = await checkPsql({ platform: 'linux', distro: 'ubuntu' }, makeRunner({
      'psql --version': ok('psql (PostgreSQL) 14.9')
    }));
    expect(result.status).toBe('warn');
    expect(result.message).toContain('14');
  });

  it('passes for supported psql versions', async () => {
    const result = await checkPsql({ platform: 'linux' }, makeRunner({
      'psql --version': ok('psql (PostgreSQL) 18.1')
    }));
    expect(result.status).toBe('pass');
  });
});

describe('checkNode', () => {
  it('fails below the minimum version', () => {
    expect(checkNode('v16.20.0').status).toBe('fail');
  });

  it('warns below the recommended version', () => {
    expect(checkNode('v18.19.0').status).toBe('warn');
  });

  it('passes on recommended versions', () => {
    expect(checkNode('v22.14.0').status).toBe('pass');
  });
});

describe('guidance per platform', () => {
  it('docker install guidance differs by platform', () => {
    expect(dockerInstallGuidance({ platform: 'macos' })).toContain('Docker Desktop');
    expect(dockerInstallGuidance({ platform: 'linux', distro: 'ubuntu' })).toContain('apt-get');
    expect(dockerInstallGuidance({ platform: 'linux', distro: 'fedora' })).toContain('dnf');
    expect(dockerInstallGuidance({ platform: 'wsl' })).toContain('WSL');
  });

  it('psql install guidance differs by platform', () => {
    expect(psqlInstallGuidance({ platform: 'macos' })).toContain('brew');
    expect(psqlInstallGuidance({ platform: 'linux', distro: 'ubuntu' })).toContain('apt-get');
    expect(psqlInstallGuidance({ platform: 'linux', distro: 'fedora' })).toContain('dnf');
    expect(psqlInstallGuidance({ platform: 'windows' })).toContain('winget');
  });
});

describe('summarizeChecks', () => {
  it('counts statuses', () => {
    expect(summarizeChecks([
      { name: 'a', status: 'pass', message: '' },
      { name: 'b', status: 'warn', message: '' },
      { name: 'c', status: 'fail', message: '' },
      { name: 'd', status: 'pass', message: '' }
    ])).toEqual({ failed: 1, warned: 1, passed: 2 });
  });
});
