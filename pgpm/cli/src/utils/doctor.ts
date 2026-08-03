import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { getPgClientCommand } from 'pg-env';

export type Platform = 'macos' | 'linux' | 'wsl' | 'windows' | 'unknown';

export interface PlatformInfo {
  platform: Platform;
  distro?: string;
}

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type CommandRunner = (command: string, args: string[]) => Promise<ExecResult>;

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  remediation?: string;
}

export const runCommand: CommandRunner = (command, args) => {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'pipe' });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', () => {
      resolve({ code: 127, stdout: '', stderr: `${command}: command not found` });
    });

    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
};

export function detectPlatform(
  platform: NodeJS.Platform = process.platform,
  readFile: (path: string) => string = (p) => readFileSync(p, 'utf-8')
): PlatformInfo {
  if (platform === 'darwin') {
    return { platform: 'macos' };
  }
  if (platform === 'win32') {
    return { platform: 'windows' };
  }
  if (platform === 'linux') {
    let distro: string | undefined;
    try {
      const release = readFile('/etc/os-release');
      const match = release.match(/^ID=("?)([^"\n]*)\1$/m);
      if (match) {
        distro = match[2];
      }
    } catch {
      // ignore
    }
    try {
      const version = readFile('/proc/version');
      if (/microsoft/i.test(version)) {
        return { platform: 'wsl', distro };
      }
    } catch {
      // ignore
    }
    return { platform: 'linux', distro };
  }
  return { platform: 'unknown' };
}

const DEBIAN_LIKE = ['ubuntu', 'debian', 'pop', 'linuxmint', 'elementary'];
const RHEL_LIKE = ['fedora', 'rhel', 'centos', 'rocky', 'almalinux', 'amzn'];

function isDebianLike(distro?: string): boolean {
  return !!distro && DEBIAN_LIKE.includes(distro);
}

function isRhelLike(distro?: string): boolean {
  return !!distro && RHEL_LIKE.includes(distro);
}

export function dockerInstallGuidance(info: PlatformInfo): string {
  switch (info.platform) {
  case 'macos':
    return 'Install Docker Desktop for Mac: https://www.docker.com/products/docker-desktop/ (or `brew install --cask docker`)';
  case 'windows':
    return 'Install Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/';
  case 'wsl':
    return 'Install Docker Desktop for Windows with the WSL 2 backend enabled: https://docs.docker.com/desktop/wsl/';
  case 'linux':
    if (isDebianLike(info.distro)) {
      return 'Install Docker Engine: https://docs.docker.com/engine/install/ubuntu/ (e.g. `sudo apt-get install docker.io` or the official docker-ce packages)';
    }
    if (isRhelLike(info.distro)) {
      return 'Install Docker Engine: https://docs.docker.com/engine/install/fedora/ (e.g. `sudo dnf install docker-ce`)';
    }
    return 'Install Docker Engine for your distribution: https://docs.docker.com/engine/install/';
  default:
    return 'Install Docker: https://docs.docker.com/get-docker/';
  }
}

export function dockerDaemonGuidance(info: PlatformInfo): string {
  switch (info.platform) {
  case 'macos':
  case 'windows':
    return 'Docker is installed but the daemon is not running. Open the Docker Desktop application and wait for it to finish starting.';
  case 'wsl':
    return 'Docker is installed but the daemon is not reachable. Start Docker Desktop on Windows and make sure WSL integration is enabled for this distro.';
  case 'linux':
    return 'Docker is installed but the daemon is not running. Start it with `sudo systemctl start docker` (and `sudo systemctl enable docker` to start on boot). If you get a permission error, add your user to the docker group: `sudo usermod -aG docker $USER` and re-login.';
  default:
    return 'Docker is installed but the daemon is not reachable. Start the Docker daemon and try again.';
  }
}

export function psqlInstallGuidance(info: PlatformInfo): string {
  switch (info.platform) {
  case 'macos':
    return 'Install the PostgreSQL client via Homebrew: `brew install libpq && brew link --force libpq`';
  case 'windows':
    return 'Install the PostgreSQL client tools: `winget install PostgreSQL.PostgreSQL` or download from https://www.postgresql.org/download/windows/';
  case 'wsl':
  case 'linux':
    if (isRhelLike(info.distro)) {
      return 'Install the PostgreSQL client: `sudo dnf install postgresql`';
    }
    return 'Install the PostgreSQL client: `sudo apt-get install postgresql-client`';
  default:
    return 'Install the PostgreSQL client tools (psql): https://www.postgresql.org/download/';
  }
}

export async function checkDockerBinary(exec: CommandRunner = runCommand): Promise<boolean> {
  const result = await exec('docker', ['--version']);
  return result.code === 0;
}

export async function checkDockerDaemon(exec: CommandRunner = runCommand): Promise<boolean> {
  const result = await exec('docker', ['info']);
  return result.code === 0;
}

export interface DockerStatus {
  binary: boolean;
  daemon: boolean;
}

export async function getDockerStatus(exec: CommandRunner = runCommand): Promise<DockerStatus> {
  const binary = await checkDockerBinary(exec);
  if (!binary) {
    return { binary: false, daemon: false };
  }
  const daemon = await checkDockerDaemon(exec);
  return { binary, daemon };
}

export async function checkDocker(
  info: PlatformInfo,
  exec: CommandRunner = runCommand
): Promise<CheckResult> {
  const status = await getDockerStatus(exec);
  if (!status.binary) {
    return {
      name: 'docker',
      status: 'fail',
      message: 'docker is not installed or not on PATH',
      remediation: dockerInstallGuidance(info)
    };
  }
  if (!status.daemon) {
    return {
      name: 'docker',
      status: 'fail',
      message: 'docker is installed but the daemon is not reachable',
      remediation: dockerDaemonGuidance(info)
    };
  }
  return {
    name: 'docker',
    status: 'pass',
    message: 'docker is installed and the daemon is running'
  };
}

export async function checkDockerCompose(
  info: PlatformInfo,
  exec: CommandRunner = runCommand
): Promise<CheckResult> {
  const plugin = await exec('docker', ['compose', 'version']);
  if (plugin.code === 0) {
    return {
      name: 'docker-compose',
      status: 'pass',
      message: 'docker compose plugin is available'
    };
  }
  const standalone = await exec('docker-compose', ['--version']);
  if (standalone.code === 0) {
    return {
      name: 'docker-compose',
      status: 'pass',
      message: 'docker-compose (standalone) is available'
    };
  }
  return {
    name: 'docker-compose',
    status: 'warn',
    message: 'docker compose is not available (only needed for docker-compose based workflows)',
    remediation: info.platform === 'linux' || info.platform === 'wsl'
      ? 'Install the compose plugin: https://docs.docker.com/compose/install/linux/'
      : 'Docker Desktop ships with compose; install or update Docker Desktop: https://www.docker.com/products/docker-desktop/'
  };
}

export const MIN_PSQL_MAJOR = 17;

export function parsePsqlMajor(versionOutput: string): number | null {
  const match = versionOutput.match(/\(PostgreSQL\)\s+(\d+)/) || versionOutput.match(/psql[^\d]*(\d+)/);
  if (!match) return null;
  const major = parseInt(match[1], 10);
  return Number.isNaN(major) ? null : major;
}

export async function checkPsql(
  info: PlatformInfo,
  exec: CommandRunner = runCommand
): Promise<CheckResult> {
  const [cmd, ...prefixArgs] = getPgClientCommand('psql');
  const result = await exec(cmd, [...prefixArgs, '--version']);
  if (result.code !== 0) {
    return {
      name: 'psql',
      status: 'fail',
      message: 'psql (PostgreSQL client) is not installed or not on PATH',
      remediation: psqlInstallGuidance(info)
    };
  }
  const major = parsePsqlMajor(result.stdout);
  if (major === null) {
    return {
      name: 'psql',
      status: 'warn',
      message: `could not determine psql version from: ${result.stdout}`
    };
  }
  if (major < MIN_PSQL_MAJOR) {
    return {
      name: 'psql',
      status: 'warn',
      message: `psql ${major} found; PostgreSQL ${MIN_PSQL_MAJOR}+ client is recommended`,
      remediation: psqlInstallGuidance(info)
    };
  }
  return {
    name: 'psql',
    status: 'pass',
    message: `psql ${major} is installed`
  };
}

export const MIN_NODE_MAJOR = 18;
export const RECOMMENDED_NODE_MAJOR = 20;

export function checkNode(version: string = process.version): CheckResult {
  const major = parseInt(version.replace(/^v/, '').split('.')[0], 10);
  if (Number.isNaN(major)) {
    return { name: 'node', status: 'warn', message: `could not parse Node.js version: ${version}` };
  }
  if (major < MIN_NODE_MAJOR) {
    return {
      name: 'node',
      status: 'fail',
      message: `Node.js ${version} is not supported; Node.js ${MIN_NODE_MAJOR}+ is required`,
      remediation: 'Upgrade Node.js (e.g. via nvm: `nvm install --lts`): https://nodejs.org/'
    };
  }
  if (major < RECOMMENDED_NODE_MAJOR) {
    return {
      name: 'node',
      status: 'warn',
      message: `Node.js ${version} works but ${RECOMMENDED_NODE_MAJOR}+ is recommended`,
      remediation: 'Upgrade Node.js (e.g. via nvm: `nvm install --lts`): https://nodejs.org/'
    };
  }
  return { name: 'node', status: 'pass', message: `Node.js ${version} is installed` };
}

export function summarizeChecks(results: CheckResult[]): { failed: number; warned: number; passed: number } {
  return {
    failed: results.filter((r) => r.status === 'fail').length,
    warned: results.filter((r) => r.status === 'warn').length,
    passed: results.filter((r) => r.status === 'pass').length
  };
}
