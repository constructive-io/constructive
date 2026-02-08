import { parseCodegenCliArgs } from '../../cli/shared';

describe('parseCodegenCliArgs', () => {
  it('parses short aliases when allowShortAliases is enabled', () => {
    const parsed = parseCodegenCliArgs(
      {
        e: 'https://api.example.com/graphql',
        o: './generated',
        a: 'Bearer token',
        v: true,
        'dry-run': true,
        'react-query': true,
        orm: true
      },
      { allowShortAliases: true }
    );

    expect(parsed.cliOverrides).toMatchObject({
      endpoint: 'https://api.example.com/graphql',
      output: './generated',
      authorization: 'Bearer token',
      verbose: true,
      dryRun: true,
      reactQuery: true,
      orm: true
    });
    expect(parsed.hasNonInteractiveArgs).toBe(true);
  });

  it('ignores short aliases when allowShortAliases is disabled', () => {
    const parsed = parseCodegenCliArgs(
      {
        e: 'https://api.example.com/graphql',
        o: './generated',
        v: true
      },
      { allowShortAliases: false }
    );

    expect(parsed.endpoint).toBeUndefined();
    expect(parsed.output).toBeUndefined();
    expect(parsed.verbose).toBeUndefined();
    expect(parsed.hasNonInteractiveArgs).toBe(false);
  });

  it('applies source precedence as db > schemaFile > endpoint', () => {
    const parsed = parseCodegenCliArgs({
      endpoint: 'https://api.example.com/graphql',
      'schema-file': './schema.graphql',
      schemas: 'public, app_public'
    });

    expect(parsed.cliOverrides.db).toEqual({
      schemas: ['public', 'app_public'],
      apiNames: undefined
    });
    expect(parsed.cliOverrides.endpoint).toBeUndefined();
    expect(parsed.cliOverrides.schemaFile).toBeUndefined();
  });

  it('resolves config path only when no source flags are provided', () => {
    const resolveConfigFile = jest.fn(() => './graphql-codegen.config.ts');

    const withoutSource = parseCodegenCliArgs(
      { reactQuery: true },
      { resolveConfigFile }
    );
    expect(withoutSource.configPath).toBe('./graphql-codegen.config.ts');

    resolveConfigFile.mockClear();
    const withSource = parseCodegenCliArgs(
      { endpoint: 'https://api.example.com/graphql' },
      { resolveConfigFile }
    );
    expect(withSource.configPath).toBeUndefined();
    expect(resolveConfigFile).not.toHaveBeenCalled();
  });

  it('normalizes list args from prompt-style arrays and comma strings', () => {
    const parsed = parseCodegenCliArgs({
      schemas: ['public', ' app_public ', ''],
      'api-names': 'api_one, api_two',
      reactQuery: false,
      verbose: false
    });

    expect(parsed.schemas).toEqual(['public', 'app_public']);
    expect(parsed.apiNames).toEqual(['api_one', 'api_two']);
    expect(parsed.cliOverrides.reactQuery).toBeUndefined();
    expect(parsed.cliOverrides.verbose).toBeUndefined();
  });
});
