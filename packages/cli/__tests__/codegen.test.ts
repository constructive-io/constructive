import type { ParsedArgs } from 'minimist'
import codegenCommand from '../src/commands/codegen'

jest.mock('child_process', () => ({
  spawnSync: jest.fn(() => ({ status: 0 }))
}))

describe('codegen command', () => {
  beforeEach(() => {
    process.env.CONSTRUCTIVE_CODEGEN_BIN = '/fake/bin/graphql-codegen.js'
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

  it('invokes graphql-codegen CLI with endpoint, out, auth, and flags', async () => {
    const child = require('child_process')

    const argv: Partial<ParsedArgs> = {
      endpoint: 'http://localhost:3000/graphql',
      auth: 'Bearer testtoken',
      out: 'graphql/codegen/dist',
      v: true,
      'dry-run': true
    }

    await codegenCommand(argv, {} as any, {} as any)

    expect(child.spawnSync).toHaveBeenCalled()
    const args = (child.spawnSync as jest.Mock).mock.calls[0][1] as string[]
    expect(args).toEqual(expect.arrayContaining(['generate']))
    expect(args).toEqual(expect.arrayContaining(['-e', 'http://localhost:3000/graphql']))
    expect(args).toEqual(expect.arrayContaining(['-o', 'graphql/codegen/dist']))
    expect(args).toEqual(expect.arrayContaining(['-a', 'Bearer testtoken']))
    expect(args).toEqual(expect.arrayContaining(['--dry-run']))
    expect(args).toEqual(expect.arrayContaining(['-v']))
  })

  it('passes config path and out directory through to CLI', async () => {
    const child = require('child_process')

    const argv: Partial<ParsedArgs> = {
      config: '/tmp/codegen.json',
      out: 'graphql/codegen/dist'
    }

    await codegenCommand(argv, {} as any, {} as any)

    const args = (child.spawnSync as jest.Mock).mock.calls[0][1] as string[]
    expect(args).toEqual(expect.arrayContaining(['-c', '/tmp/codegen.json']))
    expect(args).toEqual(expect.arrayContaining(['-o', 'graphql/codegen/dist']))
  })

  it('resolves graphql-codegen CLI from package bin by default', async () => {
    const child = require('child_process')
    delete process.env.CONSTRUCTIVE_CODEGEN_BIN

    const argv: Partial<ParsedArgs> = {
      out: 'graphql/codegen/dist'
    }

    await codegenCommand(argv, {} as any, {} as any)

    const pkgPath = require.resolve('@constructive-io/graphql-codegen/package.json')
    const pkg = require(pkgPath)
    const binField = pkg.bin
    const rel = typeof binField === 'string' ? binField : (binField['graphql-codegen'] || Object.values(binField)[0])
    const expected = require('path').join(require('path').dirname(pkgPath), rel)

    const args = (child.spawnSync as jest.Mock).mock.calls[0][1] as string[]
    expect(args[0]).toEqual(expected)
  })

  it('exits with non-zero when underlying CLI fails', async () => {
    const child = require('child_process');
    (child.spawnSync as jest.Mock).mockReturnValueOnce({ status: 1 })
    const spyExit = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error('exit:' + code) }) as any)

    const argv: Partial<ParsedArgs> = {
      endpoint: 'http://localhost:3000/graphql',
      out: 'graphql/codegen/dist'
    }

    await expect(codegenCommand(argv, {} as any, {} as any)).rejects.toThrow('exit:1')
    spyExit.mockRestore()
  })
})
