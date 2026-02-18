import type { ParsedArgs } from 'inquirerer'
import codegenCommand from '../src/commands/codegen'

const mockRunCodegenHandler = jest.fn(async () => {});

jest.mock('@constructive-io/graphql-codegen', () => ({
  runCodegenHandler: (...args: any[]) => mockRunCodegenHandler(...args),
}));

const createMockPrompter = () => ({
  prompt: jest.fn(async (argv: any) => argv),
});

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
    expect(mockRunCodegenHandler).not.toHaveBeenCalled()

    spyLog.mockRestore()
    spyExit.mockRestore()
  })

  it('delegates to runCodegenHandler for endpoint flow', async () => {
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

    expect(mockRunCodegenHandler).toHaveBeenCalledWith(argv, mockPrompter)
  })

  it('delegates to runCodegenHandler for db options', async () => {
    const argv: Partial<ParsedArgs> = {
      schemas: 'public,app',
      output: 'graphql/codegen/dist',
      reactQuery: true,
    }
    const mockPrompter = createMockPrompter()

    await codegenCommand(argv, mockPrompter as any, {} as any)

    expect(mockRunCodegenHandler).toHaveBeenCalledWith(argv, mockPrompter)
  })
})
