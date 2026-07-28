import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const packageRoot = resolve(__dirname, '..');
const registryPath = resolve(packageRoot, 'dist/runtime/registry.js');
const serviceCommandsPath = resolve(
  packageRoot,
  'dist/runtime/service-commands.js'
);
const codegenCommandPath = resolve(
  packageRoot,
  'dist/runtime/codegen-command.js'
);

describe('CNC registry module purity', () => {
  it('imports and constructs the registry without terminal output', () => {
    expect(existsSync(registryPath)).toBe(true);
    const {
      GRAPHILE_ENV: _graphileEnv,
      NODE_ENV: _nodeEnv,
      ...environment
    } = process.env;
    const child = spawnSync(
      process.execPath,
      [
        '-e',
        `const { createCncRegistry } = require(${JSON.stringify(
          registryPath
        )}); createCncRegistry({ version: 'test', store: {} });`,
      ],
      {
        cwd: packageRoot,
        env: environment,
        encoding: 'utf8',
      }
    );

    expect(child.status).toBe(0);
    expect(child.stdout).toBe('');
    expect(child.stderr).toBe('');
  });

  it('keeps direct service operation imports silent', () => {
    expect(existsSync(serviceCommandsPath)).toBe(true);
    const {
      GRAPHILE_ENV: _graphileEnv,
      NODE_ENV: _nodeEnv,
      ...environment
    } = process.env;
    const child = spawnSync(
      process.execPath,
      [
        '-e',
        `
          const {
            createCommandRegistry,
            executeCommand,
          } = require('@constructive-io/cli-runtime');
          const { serverCommand } = require(${JSON.stringify(serviceCommandsPath)});
          const registry = createCommandRegistry([serverCommand]);
          executeCommand(
            registry,
            serverCommand,
            { database: 'app', servicesApi: false, schemas: '' },
            { cwd: ${JSON.stringify(packageRoot)}, mode: 'agent', env: {} },
          ).then((outcome) => {
            process.stdout.write(JSON.stringify({
              status: outcome.status,
              code: outcome.error?.code,
            }));
          });
        `,
      ],
      {
        cwd: packageRoot,
        env: environment,
        encoding: 'utf8',
      }
    );

    expect(child.status).toBe(0);
    expect(child.stderr).toBe('');
    expect(JSON.parse(child.stdout)).toEqual({
      status: 'failed',
      code: 'SERVER_SCHEMAS_REQUIRED',
    });
  });

  it('keeps direct codegen operation execution silent', () => {
    expect(existsSync(codegenCommandPath)).toBe(true);
    const {
      GRAPHILE_ENV: _graphileEnv,
      NODE_ENV: _nodeEnv,
      ...environment
    } = process.env;
    const child = spawnSync(
      process.execPath,
      [
        '-e',
        `
          const {
            createCommandRegistry,
            executeCommand,
          } = require('@constructive-io/cli-runtime');
          const { codegenCommand } = require(${JSON.stringify(codegenCommandPath)});
          const registry = createCommandRegistry([codegenCommand]);
          executeCommand(
            registry,
            codegenCommand,
            { schemaFile: 'missing-schema.graphql', orm: true },
            { cwd: ${JSON.stringify(packageRoot)}, mode: 'agent', env: {} },
          ).then((outcome) => {
            process.stdout.write(JSON.stringify({
              status: outcome.status,
              code: outcome.error?.code,
            }));
          });
        `,
      ],
      {
        cwd: packageRoot,
        env: environment,
        encoding: 'utf8',
      }
    );

    expect(child.status).toBe(0);
    expect(child.stderr).toBe('');
    expect(JSON.parse(child.stdout)).toEqual({
      status: 'failed',
      code: 'CODEGEN_FAILED',
    });
  });

  it('rejects executable codegen config before process side effects', () => {
    expect(existsSync(codegenCommandPath)).toBe(true);
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'cnc-codegen-policy-child-')
    );
    const changedCwd = join(fixtureRoot, 'changed-cwd');
    const marker = join(fixtureRoot, 'config-executed');
    const configPath = join(fixtureRoot, 'malicious.cjs');
    mkdirSync(changedCwd);
    writeFileSync(
      configPath,
      `
        const fs = require('node:fs');
        process.stdout.write('executable-config-stdout');
        process.stderr.write('executable-config-stderr');
        fs.writeFileSync(${JSON.stringify(marker)}, 'executed');
        process.chdir(${JSON.stringify(changedCwd)});
        process.exit(91);
        module.exports = { schemaFile: './missing.graphql', orm: true };
      `
    );
    const {
      GRAPHILE_ENV: _graphileEnv,
      NODE_ENV: _nodeEnv,
      ...environment
    } = process.env;

    try {
      const child = spawnSync(
        process.execPath,
        [
          '-e',
          `
            const {
              createCommandRegistry,
              executeCommand,
            } = require('@constructive-io/cli-runtime');
            const { codegenCommand } = require(${JSON.stringify(codegenCommandPath)});
            const registry = createCommandRegistry([codegenCommand]);
            executeCommand(
              registry,
              codegenCommand,
              { config: ${JSON.stringify(configPath)}, dryRun: true },
              { cwd: ${JSON.stringify(fixtureRoot)}, mode: 'human', env: {} },
            ).then((outcome) => {
              process.stdout.write(JSON.stringify({
                status: outcome.status,
                code: outcome.error?.code,
                cwd: process.cwd(),
              }));
            });
          `,
        ],
        {
          cwd: packageRoot,
          env: environment,
          encoding: 'utf8',
        }
      );

      expect(child.status).toBe(0);
      expect(child.stderr).toBe('');
      expect(JSON.parse(child.stdout)).toEqual({
        status: 'failed',
        code: 'CODEGEN_CONFIG_EXECUTABLE_UNSUPPORTED',
        cwd: packageRoot,
      });
      expect(existsSync(marker)).toBe(false);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
