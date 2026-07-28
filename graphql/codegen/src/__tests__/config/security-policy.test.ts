import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { findConfigFile, loadConfigFile } from '../../core/config';
import {
  databaseForDisplay,
  endpointForDisplay,
  reportConfigSensitiveValues,
} from '../../core/sensitive-values';

describe('codegen configuration security policy', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'codegen-config-policy-'));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it('loads declarative JSON without permitting executable configuration', async () => {
    const configPath = path.join(cwd, 'graphql-codegen.config.JSON');
    fs.writeFileSync(
      configPath,
      JSON.stringify({ schemaFile: './schema.graphql', orm: true })
    );

    await expect(
      loadConfigFile(configPath, cwd, {}, { allowExecutableConfig: false })
    ).resolves.toMatchObject({
      success: true,
      config: { schemaFile: './schema.graphql', orm: true },
    });
  });

  it('discovers declarative JSON before a colocated executable config', () => {
    const jsonPath = path.join(cwd, 'graphql-codegen.config.json');
    fs.writeFileSync(jsonPath, '{}\n');
    fs.writeFileSync(
      path.join(cwd, 'graphql-codegen.config.ts'),
      'export default {};\n'
    );

    expect(findConfigFile(cwd)).toBe(jsonPath);
  });

  it('rejects executable configuration before evaluating it', async () => {
    const marker = path.join(cwd, 'executed');
    const configPath = path.join(cwd, 'graphql-codegen.config.ts');
    fs.writeFileSync(
      configPath,
      `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed');\nexport default {};\n`
    );

    await expect(
      loadConfigFile(configPath, cwd, {}, { allowExecutableConfig: false })
    ).resolves.toMatchObject({
      success: false,
      code: 'CODEGEN_CONFIG_EXECUTABLE_UNSUPPORTED',
    });
    expect(fs.existsSync(marker)).toBe(false);
  });

  it('rejects arrays as declarative config roots', async () => {
    const configPath = path.join(cwd, 'graphql-codegen.config.json');
    fs.writeFileSync(configPath, '[]\n');

    await expect(
      loadConfigFile(configPath, cwd, {}, { allowExecutableConfig: false })
    ).resolves.toMatchObject({
      success: false,
      code: 'CODEGEN_CONFIG_INVALID',
    });
  });

  it('retains explicit executable-config compatibility for the legacy adapter', async () => {
    const configPath = path.join(cwd, 'graphql-codegen.config.ts');
    fs.writeFileSync(
      configPath,
      "export default { schemaFile: './schema.graphql', orm: true };\n"
    );

    await expect(
      loadConfigFile(configPath, cwd, {}, { allowExecutableConfig: true })
    ).resolves.toMatchObject({
      success: true,
      config: { schemaFile: './schema.graphql', orm: true },
    });
  });

  it('recursively reports transport and database secrets', () => {
    const endpointPassword = 'endpoint-password';
    const querySecret = 'endpoint-query-secret';
    const fragmentSecret = 'endpoint-fragment-secret';
    const authorizationSecret = 'authorization-secret';
    const customHeaderSecret = 'custom-header-secret';
    const cookieSecret = 'cookie-secret';
    const databasePassword = 'database-password';
    const connectionString =
      'postgresql://db-user:connection-password@db.example.com/app?sslkey=private-key';
    const reported: string[] = [];

    reportConfigSensitiveValues(
      {
        endpoint: `https://user:${endpointPassword}@api.example.com/graphql?api_key=${querySecret}#${fragmentSecret}`,
        authorization: `Bearer ${authorizationSecret}`,
        headers: {
          'X-Custom': `  ${customHeaderSecret}  `,
          Cookie: `session=${cookieSecret}; theme=dark`,
        },
        db: {
          config: {
            password: databasePassword,
            database: connectionString,
          },
        },
      },
      (value) => reported.push(value)
    );

    expect(reported).toEqual(
      expect.arrayContaining([
        endpointPassword,
        querySecret,
        fragmentSecret,
        `Bearer ${authorizationSecret}`,
        authorizationSecret,
        customHeaderSecret,
        cookieSecret,
        databasePassword,
        connectionString,
        'connection-password',
        'private-key',
      ])
    );
  });

  it('reports encoded URL values and the Basic authorization sent by Node', () => {
    const reported: string[] = [];

    reportConfigSensitiveValues(
      {
        endpoint:
          'http://us%65r:p%40ss@api.example.com/graphql?tenant=s3cr%65t',
      },
      (value) => reported.push(value)
    );

    expect(reported).toEqual(
      expect.arrayContaining([
        'us%65r',
        'p%40ss',
        'user',
        'p@ss',
        'user:p@ss',
        'Basic dXNlcjpwQHNz',
        's3cr%65t',
        's3cret',
      ])
    );
  });

  it('projects endpoint and database URLs without private components', () => {
    expect(
      endpointForDisplay(
        'https://user:password@api.example.com/graphql?token=secret#private'
      )
    ).toBe('https://api.example.com/graphql');
    expect(
      databaseForDisplay(
        'postgresql://user:password@db.example.com:5432/app?sslkey=secret#private'
      )
    ).toBe('postgresql://db.example.com:5432/app');
  });
});
