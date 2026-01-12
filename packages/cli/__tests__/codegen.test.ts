import type { ParsedArgs } from 'minimist'
import codegenCommand from '../src/commands/codegen'

const generateMock = jest.fn(async (_opts?: any) => ({ success: true, message: 'ok' }))
jest.mock('@constructive-io/graphql-codegen/cli/commands/generate', () => ({
  generateCommand: (opts: any) => generateMock(opts)
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

  it('passes endpoint, out, auth, and flags to generateCommand', async () => {
    const argv: Partial<ParsedArgs> = {
      endpoint: 'http://localhost:3000/graphql',
      auth: 'Bearer testtoken',
      out: 'graphql/codegen/dist',
      v: true,
      'dry-run': true
    }

    await codegenCommand(argv, {} as any, {} as any)

    expect(generateMock).toHaveBeenCalled()
    const opts = (generateMock as jest.Mock).mock.calls[0][0]
    expect(opts.endpoint).toBe('http://localhost:3000/graphql')
    expect(opts.output).toBe('graphql/codegen/dist')
    expect(opts.authorization).toBe('Bearer testtoken')
    expect(opts.verbose).toBe(true)
    expect(opts.dryRun).toBe(true)
  })

  it('passes config path and out directory to generateCommand', async () => {
    const argv: Partial<ParsedArgs> = {
      config: '/tmp/codegen.json',
      out: 'graphql/codegen/dist'
    }

    await codegenCommand(argv, {} as any, {} as any)

    const opts = (generateMock as jest.Mock).mock.calls[0][0]
    expect(opts.config).toBe('/tmp/codegen.json')
    expect(opts.output).toBe('graphql/codegen/dist')
  })

  it('does not depend on process.env.CONSTRUCTIVE_CODEGEN_BIN', async () => {
    delete process.env.CONSTRUCTIVE_CODEGEN_BIN
    const argv: Partial<ParsedArgs> = { out: 'graphql/codegen/dist' }
    await codegenCommand(argv, {} as any, {} as any)
    expect(generateMock).toHaveBeenCalled()
  })

  it('exits with non-zero when generateCommand fails', async () => {
    generateMock.mockResolvedValueOnce({ success: false, message: 'fail', errors: ['e1'] } as any)
    const spyExit = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error('exit:' + code) }) as any)

    const argv: Partial<ParsedArgs> = {
      endpoint: 'http://localhost:3000/graphql',
      out: 'graphql/codegen/dist'
    }

    await expect(codegenCommand(argv, {} as any, {} as any)).rejects.toThrow('exit:1')
    spyExit.mockRestore()
  })
})
