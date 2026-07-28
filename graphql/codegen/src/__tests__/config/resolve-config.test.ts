import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { loadAndResolveConfig } from '../../core/config';
import type { GraphQLSDKConfigTarget } from '../../types/config';
import {
  DEFAULT_CONFIG,
  getConfigOptions,
  mergeConfig,
} from '../../types/config';

describe('config resolution', () => {
  it('resolves config with defaults', () => {
    const config: GraphQLSDKConfigTarget = {
      endpoint: 'https://api.example.com/graphql',
    };

    const resolved = getConfigOptions(config);

    expect(resolved.endpoint).toBe('https://api.example.com/graphql');
    expect(resolved.schemaFile).toBeUndefined();
    expect(resolved.output).toBe(DEFAULT_CONFIG.output);
    expect(resolved.tables.include).toEqual(DEFAULT_CONFIG.tables.include);
    expect(resolved.queries.exclude).toEqual(DEFAULT_CONFIG.queries.exclude);
    expect(resolved.queries.systemExclude).toEqual(
      DEFAULT_CONFIG.queries.systemExclude
    );
  });

  it('merges nested config values with overrides', () => {
    const base: GraphQLSDKConfigTarget = {
      headers: { Authorization: 'Bearer base' },
      tables: { include: ['User'] },
      queryKeys: {
        relationships: {
          database: { parent: 'organization', foreignKey: 'organizationId' },
        },
      },
    };

    const overrides: GraphQLSDKConfigTarget = {
      output: './generated/custom',
      headers: { 'X-Custom': '1' },
      tables: { exclude: ['_internal'] },
      queryKeys: {
        relationships: {
          table: { parent: 'database', foreignKey: 'databaseId' },
        },
      },
    };

    const merged = mergeConfig(base, overrides);

    expect(merged.output).toBe('./generated/custom');
    expect(merged.headers).toEqual({
      Authorization: 'Bearer base',
      'X-Custom': '1',
    });
    expect(merged.tables).toEqual({
      include: ['User'],
      exclude: ['_internal'],
    });
    expect(merged.queryKeys?.relationships).toEqual({
      database: { parent: 'organization', foreignKey: 'organizationId' },
      table: { parent: 'database', foreignKey: 'databaseId' },
    });
  });

  it('discovers a config relative to an explicit cwd', async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'codegen-config-cwd-')
    );
    try {
      fs.writeFileSync(
        path.join(tempDir, 'graphql-codegen.config.ts'),
        "export default { schemaFile: './schema.graphql', output: './generated', orm: true };\n"
      );

      const result = await loadAndResolveConfig({ cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.config?.schemaFile).toBe('./schema.graphql');
      expect(result.config?.output).toBe('./generated');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
