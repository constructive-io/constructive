import type { ParsedArgs } from 'inquirerer'
import codegenCommand from '../src/commands/codegen'
import { generateCommand } from '@constructive-io/graphql-codegen/cli/commands/generate'

jest.mock('@constructive-io/graphql-codegen/cli/commands/generate', () => ({
  generateCommand: jest.fn(async () => ({ success: true, message: 'Generated SDK', filesWritten: [] as string[] }))
}))

jest.mock('@constructive-io/graphql-server', () => ({
  buildSchemaSDL: jest.fn(async () => 'type Query { hello: String }\nschema { query: Query }')
}))

describe('codegen command', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('prints usage and exits with code 0 when --help is set', async () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {})
    const spyExit = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error('exit:' + code) }) as any)

    const argv: Partial<ParsedArgs> = { help: true }

    await expect(codegenCommand(argv, {} as any, {} as any)).rejects.toThrow('exit:0')
    expect(spyLog).toHaveBeenCalled()
    const first = (spyLog.mock.calls[0]?.[0] as string) || ''
    expect(first).toContain('Constructive GraphQL Codegen')

    spyLog.mockRestore()
    spyExit.mockRestore()
  })

  it('calls generateCommand with endpoint flow options', async () => {

    const argv: Partial<ParsedArgs> = {
      endpoint: 'http://localhost:3000/graphql',
      auth: 'Bearer testtoken',
      out: 'graphql/codegen/dist',
      verbose: true,
      'dry-run': true
    }

    await codegenCommand(argv, {} as any, {} as any)

    expect(generateCommand).toHaveBeenCalled()
    const call = (generateCommand as jest.Mock).mock.calls[0][0]
    expect(call).toMatchObject({
      endpoint: 'http://localhost:3000/graphql',
      output: 'graphql/codegen/dist',
      authorization: 'Bearer testtoken',
      verbose: true,
      dryRun: true
    })
  })

  it('builds schema file and calls generateCommand with schema when DB options provided', async () => {

    const argv: Partial<ParsedArgs> = {
      database: 'constructive_db',
      schemas: 'public',
      out: 'graphql/codegen/dist'
    }

    await codegenCommand(argv, {} as any, {} as any)

    expect(generateCommand).toHaveBeenCalled()
    const call = (generateCommand as jest.Mock).mock.calls[0][0]
    expect(call.schema).toBe('graphql/codegen/dist/schema.graphql')
    expect(call.output).toBe('graphql/codegen/dist')
    expect(call.endpoint).toBeUndefined()
  })
})
