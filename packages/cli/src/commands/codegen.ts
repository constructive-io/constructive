import { CLIOptions, Inquirerer } from 'inquirerer'
import { ParsedArgs } from 'minimist'
import { generateCommand } from '@constructive-io/graphql-codegen/cli/commands/generate'

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

  const endpoint = (argv.endpoint as string) || ''
  const outDir = (argv.out as string) || 'codegen'
  const auth = (argv.auth as string) || ''
  const configPath = (argv.config as string) || ''
  const dryRun = !!(argv['dry-run'] || argv.dryRun)
  const verbose = !!(argv.verbose || argv.v)

  const result = await generateCommand({
    config: configPath,
    endpoint,
    output: outDir,
    authorization: auth,
    verbose,
    dryRun,
  })
  if (!result.success) {
    console.error('x', result.message)
    process.exit(1)
  }
  console.log('[ok]', result.message)
}
