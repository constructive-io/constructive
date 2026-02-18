import type { ParsedArgs, Question } from 'inquirerer'
import codegenCommand from '../src/commands/codegen'

const splitCommas = (input: string | undefined): string[] | undefined => {
  if (!input) return undefined;
  return input.split(',').map((s) => s.trim()).filter(Boolean);
};

jest.mock('@constructive-io/graphql-codegen', () => {
  const splitCommasMock = (input: string | undefined): string[] | undefined => {
    if (!input) return undefined;
    return input.split(',').map((s: string) => s.trim()).filter(Boolean);
  };

  return {
    generate: jest.fn(async () => ({ success: true, message: 'Generated SDK', filesWritten: [] as string[] })),
    generateMulti: jest.fn(async (): Promise<{ results: { name: string; result: { success: boolean } }[]; hasError: boolean }> => ({ results: [], hasError: false })),
    expandApiNamesToMultiTarget: jest.fn((): null => null),
    findConfigFile: jest.fn((): string | undefined => undefined),
    loadConfigFile: jest.fn(async () => ({ success: false, error: 'not found' })),
    splitCommas: splitCommasMock,
    codegenQuestions: [
      { name: 'endpoint', message: 'GraphQL endpoint URL', type: 'text', required: false },
      { name: 'schema-file', message: 'Path to GraphQL schema file', type: 'text', required: false },
      { name: 'output', message: 'Output directory', type: 'text', required: false, default: 'codegen', useDefault: true },
      { name: 'schemas', message: 'PostgreSQL schemas', type: 'text', required: false, sanitize: splitCommasMock },
      { name: 'api-names', message: 'API names', type: 'text', required: false, sanitize: splitCommasMock },
      { name: 'react-query', message: 'Generate React Query hooks?', type: 'confirm', required: false, default: false, useDefault: true },
      { name: 'orm', message: 'Generate ORM client?', type: 'confirm', required: false, default: false, useDefault: true },
      { name: 'authorization', message: 'Authorization header value', type: 'text', required: false },
      { name: 'dry-run', message: 'Preview without writing files?', type: 'confirm', required: false, default: false, useDefault: true },
      { name: 'verbose', message: 'Verbose output?', type: 'confirm', required: false, default: false, useDefault: true },
    ],
    printResult: jest.fn((result: any) => {
      if (result.success) {
        console.log('[ok]', result.message);
      } else {
        console.error('x', result.message);
        process.exit(1);
      }
    }),
    camelizeArgv: jest.fn((argv: Record<string, any>) => argv),
    seedArgvFromConfig: jest.fn((argv: Record<string, unknown>, _fileConfig: any) => argv),
    hasResolvedCodegenSource: jest.fn((argv: Record<string, unknown>) => {
      const db = argv.db as Record<string, unknown> | undefined;
      return Boolean(
        argv.endpoint ||
          argv['schema-file'] ||
          argv.schemas ||
          argv['api-names'] ||
          db?.schemas ||
          db?.apiNames
      );
    }),
    buildGenerateOptions: jest.fn((answers: Record<string, unknown>, _fileConfig: any) => {
      const { schemas, apiNames, ...rest } = answers;
      const normalizedSchemas = Array.isArray(schemas)
        ? schemas
        : splitCommasMock(schemas as string | undefined);
      const normalizedApiNames = Array.isArray(apiNames)
        ? apiNames
        : splitCommasMock(apiNames as string | undefined);
      if (schemas || apiNames) {
        return { ...rest, db: { schemas: normalizedSchemas, apiNames: normalizedApiNames } };
      }
      return rest;
    }),
  };
})

// Create a mock prompter that returns argv values and applies sanitize functions from questions
const createMockPrompter = () => ({
  prompt: jest.fn(async (argv: any, questions: Question[]) => {
    const result = { ...argv };
    // Apply sanitize functions from questions to simulate real prompter behavior
    if (questions) {
      for (const q of questions) {
        if (q.sanitize && result[q.name] !== undefined) {
          result[q.name] = q.sanitize(result[q.name], result);
        }
      }
    }
    return result;
  })
})

describe('codegen command', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('prints usage and exits with code 0 when --help is set', async () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {})
    const spyExit = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error('exit:' + code) }) as any)

    const argv: Partial<ParsedArgs> = { help: true }
    const mockPrompter = createMockPrompter()

    await expect(codegenCommand(argv, mockPrompter as any, {} as any)).rejects.toThrow('exit:0')
    expect(spyLog).toHaveBeenCalled()
    const first = (spyLog.mock.calls[0]?.[0] as string) || ''
    expect(first).toContain('Constructive GraphQL Codegen')

    spyLog.mockRestore()
    spyExit.mockRestore()
  })

  it('calls generate with endpoint flow options', async () => {
    const { generate: mockGenerate } = require('@constructive-io/graphql-codegen')

    const argv: Partial<ParsedArgs> = {
      endpoint: 'http://localhost:3000/graphql',
      authorization: 'Bearer testtoken',
      output: 'graphql/codegen/dist',
      verbose: true,
      dryRun: true,
      reactQuery: true,
    }
    const mockPrompter = createMockPrompter()

    await codegenCommand(argv, mockPrompter as any, {} as any)

    expect(mockPrompter.prompt).not.toHaveBeenCalled()
    expect(mockGenerate).toHaveBeenCalled()
    const call = mockGenerate.mock.calls[0][0]
    expect(call).toMatchObject({
      endpoint: 'http://localhost:3000/graphql',
      output: 'graphql/codegen/dist',
      authorization: 'Bearer testtoken',
      verbose: true,
      dryRun: true,
      reactQuery: true
    })
  })

  it('calls generate with db options when schemas provided', async () => {
    const { generate: mockGenerate } = require('@constructive-io/graphql-codegen')

    const argv: Partial<ParsedArgs> = {
      schemas: 'public,app',
      output: 'graphql/codegen/dist',
      reactQuery: true,
    }
    const mockPrompter = createMockPrompter()

    await codegenCommand(argv, mockPrompter as any, {} as any)

    expect(mockPrompter.prompt).not.toHaveBeenCalled()
    expect(mockGenerate).toHaveBeenCalled()
    const call = mockGenerate.mock.calls[0][0]
    expect(call.db).toEqual({ schemas: ['public', 'app'], apiNames: undefined })
    expect(call.output).toBe('graphql/codegen/dist')
    expect(call.reactQuery).toBe(true)
  })
})
