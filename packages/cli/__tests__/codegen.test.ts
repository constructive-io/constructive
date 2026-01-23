import type { ParsedArgs } from 'inquirerer'
import codegenCommand from '../src/commands/codegen'
import { generateReactQuery } from '@constructive-io/graphql-codegen/cli/commands/generate'

jest.mock('@constructive-io/graphql-codegen/cli/commands/generate', () => ({
  generateReactQuery: jest.fn(async () => ({ success: true, message: 'Generated SDK', filesWritten: [] as string[] }))
}))

jest.mock('@constructive-io/graphql-codegen', () => ({
  generateReactQuery: jest.fn(async () => ({ success: true, message: 'Generated SDK', filesWritten: [] as string[] })),
  generateOrm: jest.fn(async () => ({ success: true, message: 'Generated ORM', filesWritten: [] as string[] })),
  findConfigFile: jest.fn((): string | undefined => undefined),
  buildSchemaFromDatabase: jest.fn(async ({ outDir }: { outDir: string }) => ({
    schemaPath: `${outDir}/schema.graphql`,
    sdl: 'type Query { hello: String }\nschema { query: Query }'
  }))
}))

// Create a mock prompter that returns the argv values directly
const createMockPrompter = () => ({
  prompt: jest.fn(async (argv: any, _questions: any) => argv)
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

  it('calls generateReactQuery with endpoint flow options', async () => {
    const { generateReactQuery: mockGenerateReactQuery } = require('@constructive-io/graphql-codegen')

    const argv: Partial<ParsedArgs> = {
      endpoint: 'http://localhost:3000/graphql',
      auth: 'Bearer testtoken',
      out: 'graphql/codegen/dist',
      verbose: true,
      'dry-run': true
    }
    const mockPrompter = createMockPrompter()

    await codegenCommand(argv, mockPrompter as any, {} as any)

    expect(mockGenerateReactQuery).toHaveBeenCalled()
    const call = mockGenerateReactQuery.mock.calls[0][0]
    expect(call).toMatchObject({
      endpoint: 'http://localhost:3000/graphql',
      output: 'graphql/codegen/dist',
      authorization: 'Bearer testtoken',
      verbose: true,
      dryRun: true
    })
  })

  it('builds schema file and calls generateReactQuery with schema when DB options provided', async () => {
    const { generateReactQuery: mockGenerateReactQuery, buildSchemaFromDatabase } = require('@constructive-io/graphql-codegen')

    const argv: Partial<ParsedArgs> = {
      database: 'constructive_db',
      schemas: 'public',
      out: 'graphql/codegen/dist'
    }
    const mockPrompter = createMockPrompter()

    await codegenCommand(argv, mockPrompter as any, {} as any)

    expect(buildSchemaFromDatabase).toHaveBeenCalled()
    expect(mockGenerateReactQuery).toHaveBeenCalled()
    const call = mockGenerateReactQuery.mock.calls[0][0]
    expect(call.schema).toBe('graphql/codegen/dist/schema.graphql')
    expect(call.output).toBe('graphql/codegen/dist')
    expect(call.endpoint).toBeUndefined()
  })
})
