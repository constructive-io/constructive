/**
 * Tests for non-TTY environment detection in pgpm CLI.
 * 
 * The CLI should automatically detect non-interactive environments and skip prompts:
 * 1. --no-tty flag explicitly passed
 * 2. CI=true environment variable
 * 3. stdin is not a TTY (running from script, pipe, etc.)
 * 
 * Related fix: fix/non-tty-environment-detection
 */

import { spawn, SpawnOptions } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Path to the built CLI
const CLI_PATH = path.join(__dirname, '../dist/index.js');

// Helper to run CLI and capture output
function runCli(
  args: string[],
  options: { env?: Record<string, string>; stdin?: 'pipe' | 'inherit' } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const spawnOptions: SpawnOptions = {
      env: { ...process.env, ...options.env },
      stdio: [options.stdin || 'pipe', 'pipe', 'pipe'],
    };

    const child = spawn('node', [CLI_PATH, ...args], spawnOptions);

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Close stdin immediately to simulate non-interactive
    if (options.stdin !== 'inherit') {
      child.stdin?.end();
    }

    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

// Create a temporary directory for tests
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm-test-'));
}

// Clean up temporary directory
function cleanupTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('non-TTY environment detection', () => {
  let tempDir: string;

  beforeAll(() => {
    // Ensure CLI is built
    if (!fs.existsSync(CLI_PATH)) {
      throw new Error(`CLI not built. Run 'pnpm build' in pgpm/cli first. Expected: ${CLI_PATH}`);
    }
  });

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('--no-tty flag', () => {
    it('should not prompt when --no-tty is passed', async () => {
      const result = await runCli([
        'init',
        '-t', 'pnpm/workspace',
        '--no-tty',
        '--name', 'test-workspace',
        '--fullName', 'Test User',
        '--email', 'test@test.com',
        '--username', 'testuser',
        '--license', 'MIT',
        '--cwd', tempDir,
      ]);

      // Should not hang waiting for input
      expect(result.exitCode).toBe(0);
      // Should create workspace
      expect(fs.existsSync(path.join(tempDir, 'test-workspace'))).toBe(true);
    }, 30000);

    it('should fail gracefully when required args missing with --no-tty', async () => {
      const result = await runCli([
        'init',
        '-t', 'pnpm/workspace',
        '--no-tty',
        // Missing --name
        '--cwd', tempDir,
      ]);

      // Should exit with error, not hang
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('required');
    }, 10000);
  });

  describe('CI environment variable', () => {
    it('should not prompt when CI=true', async () => {
      const result = await runCli(
        [
          'init',
          '-t', 'pnpm/workspace',
          '--name', 'ci-workspace',
          '--fullName', 'CI User',
          '--email', 'ci@test.com',
          '--username', 'ciuser',
          '--license', 'MIT',
          '--cwd', tempDir,
        ],
        { env: { CI: 'true' } }
      );

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, 'ci-workspace'))).toBe(true);
    }, 30000);
  });

  describe('piped stdin (non-TTY)', () => {
    it('should detect non-TTY stdin and not prompt', async () => {
      // When stdin is piped (not a TTY), CLI should detect this
      const result = await runCli(
        [
          'init',
          '-t', 'pnpm/workspace',
          '--name', 'pipe-workspace',
          '--fullName', 'Pipe User',
          '--email', 'pipe@test.com',
          '--username', 'pipeuser',
          '--license', 'MIT',
          '--cwd', tempDir,
        ],
        { stdin: 'pipe' }
      );

      // Process should complete (not hang waiting for TTY input)
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, 'pipe-workspace'))).toBe(true);
    }, 30000);
  });

  describe('module init in workspace', () => {
    it('should work with --no-tty for module creation', async () => {
      // First create workspace
      await runCli([
        'init',
        '-t', 'pnpm/workspace',
        '--no-tty',
        '--name', 'ws-for-module',
        '--fullName', 'Test User',
        '--email', 'test@test.com',
        '--username', 'testuser',
        '--license', 'MIT',
        '--cwd', tempDir,
      ]);

      const wsDir = path.join(tempDir, 'ws-for-module');

      // Then create module
      const result = await runCli([
        'init',
        '-t', 'pnpm/module',
        '--no-tty',
        '--moduleName', 'my-module',
        '--moduleDesc', 'Test module',
        '--cwd', wsDir,
      ]);

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(wsDir, 'packages', 'my-module'))).toBe(true);
    }, 60000);
  });

  describe('error handling without TTY', () => {
    it('should not cause ERR_USE_AFTER_CLOSE in non-TTY environment', async () => {
      // This was the original bug - stdin being used after close
      const result = await runCli(
        [
          'init',
          '-t', 'pnpm/workspace',
          '--name', 'no-error-workspace',
          '--fullName', 'Test User',
          '--email', 'test@test.com',
          '--username', 'testuser',
          '--license', 'MIT',
          '--cwd', tempDir,
        ],
        { env: { CI: 'true' } }
      );

      // Should not contain the error
      expect(result.stderr).not.toContain('ERR_USE_AFTER_CLOSE');
      expect(result.exitCode).toBe(0);
    }, 30000);
  });
});

describe('noTty detection logic (unit)', () => {
  // Test the detection logic in isolation
  const detectNoTty = (argv: string[], env: Record<string, string | undefined>, isTTY: boolean): boolean => {
    return argv.includes('--no-tty') || 
           env.CI === 'true' || 
           !isTTY;
  };

  it('should return true for --no-tty flag', () => {
    expect(detectNoTty(['node', 'cli', '--no-tty'], {}, true)).toBe(true);
  });

  it('should return true for CI=true', () => {
    expect(detectNoTty(['node', 'cli'], { CI: 'true' }, true)).toBe(true);
  });

  it('should return true when stdin is not TTY', () => {
    expect(detectNoTty(['node', 'cli'], {}, false)).toBe(true);
  });

  it('should return false only when interactive', () => {
    expect(detectNoTty(['node', 'cli'], {}, true)).toBe(false);
    expect(detectNoTty(['node', 'cli'], { CI: undefined }, true)).toBe(false);
  });

  it('should handle multiple conditions', () => {
    // All conditions true
    expect(detectNoTty(['node', 'cli', '--no-tty'], { CI: 'true' }, false)).toBe(true);
    // Just flag
    expect(detectNoTty(['node', 'cli', '--no-tty'], { CI: 'false' }, true)).toBe(true);
  });
});
