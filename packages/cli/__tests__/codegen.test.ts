import type { ParsedArgs } from 'inquirerer'
import codegenCommand from '../src/commands/codegen'

jest.mock('@constructive-io/graphql-codegen', () => ({
  generate: jest.fn(async () => ({ success: true, message: 'Generated SDK', filesWritten: [] as string[] })),
  findConfigFile: jest.fn((): string | undefined => undefined),
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

  it('calls generate with endpoint flow options', async () => {
    const { generate: mockGenerate } = require('@constructive-io/graphql-codegen')

    const argv: Partial<ParsedArgs> = {
      endpoint: 'http://localhost:3000/graphql',
      auth: 'Bearer testtoken',
      out: 'graphql/codegen/dist',
      verbose: true,
      dryRun: true,
      reactQuery: true,
    }
    const mockPrompter = createMockPrompter()

    await codegenCommand(argv, mockPrompter as any, {} as any)

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
      out: 'graphql/codegen/dist',
      reactQuery: true,
    }
    const mockPrompter = createMockPrompter()

    await codegenCommand(argv, mockPrompter as any, {} as any)

    expect(mockGenerate).toHaveBeenCalled()
    const call = mockGenerate.mock.calls[0][0]
    expect(call.db).toEqual({ schemas: ['public', 'app'], apiNames: undefined })
    expect(call.output).toBe('graphql/codegen/dist')
    expect(call.reactQuery).toBe(true)
  })
})
