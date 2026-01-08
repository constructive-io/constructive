import { CLIOptions, Inquirerer } from 'inquirerer'
import { ParsedArgs } from 'minimist'
import express from 'express'
import { postgraphile } from 'postgraphile'
import { getGraphileSettings } from 'graphile-settings'
import { getPgPool } from 'pg-cache'
import { generateCommand } from '@constructive-io/graphql-codegen/cli/commands/generate'
import { getEnvOptions } from '@constructive-io/graphql-env'

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

  --database <name>          Database name for DB mode (default: constructive_db)
  --schemas <list>           Comma-separated schema list for DB mode (default: public)
  --pgHost <host>            PGHOST override for DB mode
  --pgPort <port>            PGPORT override for DB mode
  --pgUser <user>            PGUSER override for DB mode
  --pgPassword <password>    PGPASSWORD override for DB mode
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

  const database = (argv.database as string) || 'constructive_db'
  const schemasArg = (argv.schemas as string) || getEnvOptions().api.metaSchemas.join(',')
  const pgHost = (argv.pgHost as string) || process.env.PGHOST || ''
  const pgPort = argv.pgPort ? String(argv.pgPort) : (process.env.PGPORT || '')
  const pgUser = (argv.pgUser as string) || process.env.PGUSER || ''
  const pgPassword = (argv.pgPassword as string) || process.env.PGPASSWORD || ''

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

    const pool = getPgPool({
      host: pgHost || undefined,
      port: pgPort ? Number(pgPort) : undefined,
      user: pgUser || undefined,
      password: pgPassword || undefined,
      database,
    })

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
