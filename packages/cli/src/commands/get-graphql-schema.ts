import { CLIOptions, Inquirerer, Question } from 'inquirerer';
import { promises as fs } from 'fs';
import { buildSchemaSDL, fetchEndpointSchemaSDL } from '@constructive-io/graphql-server';

const usage = `
Constructive Get GraphQL Schema:

  cnc get-graphql-schema [OPTIONS]

Source Options (choose one):
  --endpoint <url>        GraphQL endpoint to fetch schema via introspection
  --database <name>       Database name (default: constructive)

Options:
  --schemas <list>        Comma-separated schemas to include
  --headerHost <host>     Host header to send with endpoint requests
  --auth <token>          Authorization header value
  --out <path>            Output file path (default: print to stdout)

  --help, -h              Show this help message
`;

const questions: Question[] = [
  {
    name: 'endpoint',
    message: 'GraphQL endpoint URL',
    type: 'text',
    required: false,
  },
  {
    name: 'database',
    message: 'Database name',
    type: 'text',
    required: false,
  },
  {
    name: 'schemas',
    message: 'Comma-separated schemas',
    type: 'text',
    required: false,
  },
  {
    name: 'out',
    message: 'Output file path',
    type: 'text',
    required: false,
  },
];

export default async (
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(usage);
    process.exit(0);
  }

  const {
    endpoint,
    database,
    schemas: schemasArg,
    out,
  } = await prompter.prompt(argv, questions);

  const schemas = String(schemasArg).split(',').map((s) => s.trim()).filter(Boolean);

  // Parse repeated --header values into headers object
  const headerArg = argv.header as string | string[] | undefined;
  const headerList = Array.isArray(headerArg) ? headerArg : headerArg ? [headerArg] : [];
  const headers: Record<string, string> = {};
  for (const h of headerList) {
    const idx = typeof h === 'string' ? h.indexOf(':') : -1;
    if (idx <= 0) continue;
    const name = h.slice(0, idx).trim();
    const value = h.slice(idx + 1).trim();
    if (!name) continue;
    headers[name] = value;
  }

  let sdl: string;
  if (endpoint) {
    const opts: Record<string, unknown> = {};
    if (argv.headerHost) opts.headerHost = argv.headerHost;
    if (argv.auth) opts.auth = argv.auth;
    if (Object.keys(headers).length) opts.headers = headers;
    sdl = await (fetchEndpointSchemaSDL as (url: string, opts?: Record<string, unknown>) => Promise<string>)(
      endpoint as string,
      opts
    );
  } else {
    sdl = await buildSchemaSDL({ database: database as string, schemas });
  }

  if (out) {
    await fs.writeFile(out as string, sdl, 'utf8');
    console.log(`Wrote schema SDL to ${out}`);
  } else {
    process.stdout.write(sdl + '\n');
  }
};
