import { CLIOptions, Inquirerer } from 'inquirerer'
import { ParsedArgs } from 'minimist'
import { spawnSync } from 'child_process'
import { join, dirname } from 'path'

const usage = `
Constructive GraphQL Codegen:

  cnc codegen [OPTIONS]

Options:
  --help, -h                 Show this help message
  --config <path>            Path to graphql-codegen config file
  --endpoint <url>           GraphQL endpoint URL
  --auth <token>             Authorization header value (e.g., "Bearer 123")
  --out <dir>                Output directory (default: graphql/codegen/dist)
  --dry-run                  Preview without writing files
  -v, --verbose              Verbose output
`

export default async (
  argv: Partial<ParsedArgs>,
  _prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(usage)
    process.exit(0)
  }

  const cwd = (argv.cwd as string) || process.cwd()
  const endpoint = (argv.endpoint as string) || ''
  const outDir = (argv.out as string) || 'graphql/codegen/dist'
  const auth = (argv.auth as string) || ''
  const configPath = (argv.config as string) || ''
  const dryRun = !!(argv['dry-run'] || argv.dryRun)
  const verbose = !!(argv.verbose || argv.v)

  const envBin = process.env.CONSTRUCTIVE_CODEGEN_BIN
  let bin = envBin || ''
  if (!bin) {
    try {
      const pkgPath = require.resolve('@constructive-io/graphql-codegen/package.json')
      const pkg = require(pkgPath)
      const binField = pkg.bin
      let rel: string | undefined
      if (typeof binField === 'string') {
        rel = binField
      } else if (binField && typeof binField === 'object') {
        rel = binField['graphql-codegen'] || Object.values(binField)[0]
      }
      if (rel) bin = join(dirname(pkgPath), rel)
    } catch {}
  }
  if (!bin) {
    try {
      bin = require.resolve('@constructive-io/graphql-codegen/dist/cli/index.js')
    } catch {}
  }
  const args: string[] = ['generate']
  if (configPath) args.push('-c', configPath)
  if (endpoint) args.push('-e', endpoint)
  if (outDir) args.push('-o', outDir)
  if (auth) args.push('-a', auth)
  if (dryRun) args.push('--dry-run')
  if (verbose) args.push('-v')

  const res = spawnSync(process.execPath, [bin, ...args], { cwd, stdio: 'inherit' })
  if ((res.status ?? 0) !== 0) process.exit(res.status ?? 1)
}
