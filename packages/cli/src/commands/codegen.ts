import { CLIOptions, Inquirerer } from 'inquirerer'
import { ParsedArgs } from 'minimist'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { buildSchemaSDL } from '@constructive-io/graphql-server'
import { generateCommand } from '@constructive-io/graphql-codegen/cli/commands/generate'
import { ConstructiveOptions, getEnvOptions } from '@constructive-io/graphql-env'

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

  --database <name>          Database override for DB mode (defaults to PGDATABASE)
  --schemas <list>           Comma-separated schemas (defaults to API_META_SCHEMAS)
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

  const endpointArg = (argv.endpoint as string) || ''
  const outDir = (argv.out as string) || 'graphql/codegen/dist'
  const auth = (argv.auth as string) || ''
  const configPath = (argv.config as string) || ''
  const dryRun = !!(argv['dry-run'] || argv.dryRun)
  const verbose = !!(argv.verbose || argv.v)

  const selectedDb = (argv.database as string) || undefined
  const options: ConstructiveOptions = selectedDb ? getEnvOptions({ pg: { database: selectedDb } }) : getEnvOptions()
  const schemasArg = (argv.schemas as string) || options.api.metaSchemas.join(',')

  const runGenerate = async ({ endpoint, schema }: { endpoint?: string; schema?: string }) => {
    const result = await generateCommand({
      config: configPath || undefined,
      endpoint,
      schema,
      output: outDir,
      authorization: auth || undefined,
      verbose,
      dryRun,
    })

    if (!result.success) {
      console.error(result.message)
      if (result.errors?.length) result.errors.forEach(e => console.error('  -', e))
      process.exit(1)
    }
    console.log(result.message)
    if (result.filesWritten?.length) {
      result.filesWritten.forEach(f => console.log(f))
    }
  }

  if (endpointArg) {
    await runGenerate({ endpoint: endpointArg })
    return
  }

  const schemas = schemasArg.split(',').map((s: string) => s.trim()).filter(Boolean)
  await fs.promises.mkdir(outDir, { recursive: true })
  const sdl = await buildSchemaSDL({
    database: options.pg.database,
    schemas,
    graphile: {
      pgSettings: async () => ({ role: 'administrator' }),
    },
  })

  const schemaPath = path.join(outDir, 'schema.graphql')
  await fs.promises.writeFile(schemaPath, sdl, 'utf-8')

  await runGenerate({ schema: schemaPath })
}
