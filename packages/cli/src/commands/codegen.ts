import { CLIOptions, Inquirerer } from 'inquirerer'
import { ParsedArgs } from 'minimist'
import express from 'express'
import { postgraphile } from 'postgraphile'
import { getGraphileSettings } from 'graphile-settings'
import { getPgPool } from 'pg-cache'
import { generateCommand } from '@constructive-io/graphql-codegen'
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

  const runGenerate = async (endpoint: string) => {
    const result = await generateCommand({
      config: configPath || undefined,
      endpoint,
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
    await runGenerate(endpointArg)
    return
  }

  const schemas = schemasArg.split(',').map((s: string) => s.trim()).filter(Boolean)
  const startTempServer = async () => {
    const settings = getGraphileSettings({ graphile: { schema: schemas } })
    settings.graphiql = false
    settings.graphqlRoute = '/graphql'
    settings.graphiqlRoute = '/graphiql'
    settings.pgSettings = async () => ({ role: 'administrator' })

    const pool = getPgPool(options.pg)

    const handler = postgraphile(pool, schemas, settings)
    const app = express()
    app.use(handler)

    const server = await new Promise<any>((resolve, reject) => {
      const srv = app.listen(0, '127.0.0.1', () => resolve(srv))
      srv.on('error', reject)
    })

    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    const url = `http://127.0.0.1:${port}/graphql`
    return { server, pool, url }
  }

  const { server, pool, url } = await startTempServer()
  try {
    await runGenerate(url)
  } finally {
    await new Promise(r => server.close(r))
    await pool.end()
  }
}
